package com.example.ragdemo.service;

import com.example.ragdemo.dto.AskResponse;
import com.example.ragdemo.dto.ContextSnippet;
import com.example.ragdemo.dto.HealthResponse;
import com.example.ragdemo.dto.SourceSummary;
import com.example.ragdemo.model.SourceChunk;
import jakarta.annotation.PostConstruct;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;
import java.util.stream.IntStream;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Service;

@Service
public class RagService {

  private static final Pattern WHITESPACE = Pattern.compile("\\s+");

  private final ResourcePatternResolver resourceResolver = new PathMatchingResourcePatternResolver();

  private List<SourceChunk> chunks = List.of();
  private List<String> vocabulary = List.of();
  private double[][] docVectors = new double[0][];
  private double[] idf = new double[0];
  private Set<String> stopWords = Set.of();

  @PostConstruct
  public void init() throws IOException {
    stopWords = loadStopWords();
    List<SourceChunk> loaded = new ArrayList<>();
    Resource[] markdownFiles = resourceResolver.getResources("classpath:data/*.md");
    for (Resource res : markdownFiles) {
      if (!res.isReadable()) {
        continue;
      }
      String filename = res.getFilename();
      if (filename == null) {
        continue;
      }
      String content = new String(res.getInputStream().readAllBytes(), StandardCharsets.UTF_8);
      for (String chunkText : splitIntoChunks(content, 450)) {
        loaded.add(new SourceChunk(filename, chunkText));
      }
    }
    if (loaded.isEmpty()) {
      throw new IllegalStateException("No markdown files found in classpath:data/");
    }
    chunks = List.copyOf(loaded);
    buildIndex();
  }

  public HealthResponse health() {
    return new HealthResponse("ok", chunks.size());
  }

  public List<SourceSummary> sources() {
    Map<String, Long> counts = new LinkedHashMap<>();
    for (SourceChunk chunk : chunks) {
      counts.merge(chunk.source(), 1L, Long::sum);
    }
    return counts.entrySet().stream()
        .map(e -> new SourceSummary(e.getKey(), e.getValue()))
        .toList();
  }

  public AskResponse ask(String question) {
    String q = question == null ? "" : question.strip();
    List<SourceChunk> retrieved = retrieve(q, 3);

    if (retrieved.isEmpty()) {
      return new AskResponse(
          "I could not find matching context. Try asking about the RAG stages, chunking, embeddings, or retrieval.",
          List.of(),
          List.of(
              "User question received",
              "Question embedded with TF-IDF",
              "No relevant chunks found"));
    }

    String combinedContext = String.join(" ", retrieved.stream().map(SourceChunk::text).toList());
    String detailPrefix = combinedContext.length() <= 340 ? combinedContext : combinedContext.substring(0, 340);
    String answer =
        "Think of RAG like a careful homework helper. First it breaks big notes into small cards, "
            + "then it finds the cards that best match your question, and only then it writes an answer "
            + "using those cards as proof. That keeps the answer grounded instead of guessing from memory. "
            + "One useful note it found says: "
            + detailPrefix
            + "...";

    List<ContextSnippet> context =
        retrieved.stream()
            .map(
                c -> {
                  String snip = c.text().length() <= 220 ? c.text() : c.text().substring(0, 220);
                  return new ContextSnippet(c.source(), snip);
                })
            .toList();

    return new AskResponse(
        answer,
        context,
        List.of(
            "User question received",
            "Question compared with document cards",
            "Best evidence cards retrieved",
            "Answer written from the evidence"));
  }

  private List<SourceChunk> retrieve(String query, int topK) {
    Map<String, Integer> queryCounts = termCounts(tokenize(query));
    if (queryCounts.isEmpty() || vocabulary.isEmpty()) {
      return List.of();
    }

    double[] qRaw = new double[vocabulary.size()];
    for (int j = 0; j < vocabulary.size(); j++) {
      String term = vocabulary.get(j);
      int tf = queryCounts.getOrDefault(term, 0);
      qRaw[j] = tf * idf[j];
    }
    double[] qVec = l2Normalize(qRaw);
    if (qVec == null) {
      return List.of();
    }

    record Scored(int index, double score) {}

    List<Scored> scored = new ArrayList<>();
    for (int i = 0; i < docVectors.length; i++) {
      double sim = dot(docVectors[i], qVec);
      if (sim > 0) {
        scored.add(new Scored(i, sim));
      }
    }
    scored.sort(Comparator.comparingDouble(Scored::score).reversed());
    List<SourceChunk> out = new ArrayList<>();
    for (int i = 0; i < Math.min(topK, scored.size()); i++) {
      out.add(chunks.get(scored.get(i).index()));
    }
    return out;
  }

  private void buildIndex() {
    List<Map<String, Integer>> docTermCounts = new ArrayList<>();
    for (SourceChunk chunk : chunks) {
      docTermCounts.add(termCounts(tokenize(chunk.text())));
    }

    Set<String> vocabSet = new HashSet<>();
    for (Map<String, Integer> m : docTermCounts) {
      vocabSet.addAll(m.keySet());
    }
    List<String> vocab = new ArrayList<>(vocabSet);
    Collections.sort(vocab);
    vocabulary = List.copyOf(vocab);
    if (vocabulary.isEmpty()) {
      docVectors = new double[0][0];
      idf = new double[0];
      return;
    }

    int nDocs = docTermCounts.size();
    int v = vocabulary.size();
    Map<String, Integer> termToCol = new HashMap<>();
    for (int j = 0; j < v; j++) {
      termToCol.put(vocabulary.get(j), j);
    }

    int[] df = new int[v];
    double[][] tfidf = new double[nDocs][v];
    for (int i = 0; i < nDocs; i++) {
      Map<String, Integer> counts = docTermCounts.get(i);
      for (Map.Entry<String, Integer> e : counts.entrySet()) {
        Integer col = termToCol.get(e.getKey());
        if (col == null) {
          continue;
        }
        tfidf[i][col] = e.getValue();
      }
      for (int j = 0; j < v; j++) {
        if (tfidf[i][j] > 0) {
          df[j]++;
        }
      }
    }

    idf = new double[v];
    for (int j = 0; j < v; j++) {
      idf[j] = Math.log((1.0 + nDocs) / (1.0 + df[j])) + 1.0;
      for (int i = 0; i < nDocs; i++) {
        tfidf[i][j] = tfidf[i][j] * idf[j];
      }
    }

    docVectors = new double[nDocs][v];
    for (int i = 0; i < nDocs; i++) {
      double[] normalized = l2Normalize(tfidf[i]);
      docVectors[i] = normalized != null ? normalized : new double[v];
    }
  }

  private static Map<String, Integer> termCounts(List<String> tokens) {
    Map<String, Integer> m = new LinkedHashMap<>();
    for (String t : tokens) {
      m.merge(t, 1, Integer::sum);
    }
    return m;
  }

  private List<String> tokenize(String text) {
    String normalized = WHITESPACE.matcher(text.toLowerCase(Locale.ROOT)).replaceAll(" ").strip();
    if (normalized.isEmpty()) {
      return List.of();
    }
    String lettersOnly = normalized.replaceAll("[^a-z]+", " ");
    List<String> tokens = new ArrayList<>();
    for (String raw : lettersOnly.split(" ")) {
      if (raw.isEmpty()) {
        continue;
      }
      if (stopWords.contains(raw)) {
        continue;
      }
      tokens.add(raw);
    }
    return tokens;
  }

  private static List<String> splitIntoChunks(String text, int chunkSize) {
    String normalized = WHITESPACE.matcher(text).replaceAll(" ").strip();
    if (normalized.isEmpty()) {
      return List.of();
    }
    int stride = (int) (chunkSize * 0.8);
    if (stride < 1) {
      stride = 1;
    }
    List<String> parts = new ArrayList<>();
    int start = 0;
    while (start < normalized.length()) {
      int end = Math.min(start + chunkSize, normalized.length());
      parts.add(normalized.substring(start, end));
      start += stride;
    }
    return parts;
  }

  private static double dot(double[] a, double[] b) {
    return IntStream.range(0, a.length).mapToDouble(i -> a[i] * b[i]).sum();
  }

  private static double[] l2Normalize(double[] vec) {
    double sumSq = 0;
    for (double v : vec) {
      sumSq += v * v;
    }
    if (sumSq == 0) {
      return null;
    }
    double inv = 1.0 / Math.sqrt(sumSq);
    double[] out = new double[vec.length];
    for (int i = 0; i < vec.length; i++) {
      out[i] = vec[i] * inv;
    }
    return out;
  }

  private Set<String> loadStopWords() throws IOException {
    Resource resource = resourceResolver.getResource("classpath:stopwords.txt");
    if (!resource.exists()) {
      return Set.of();
    }
    Set<String> words = new HashSet<>();
    try (BufferedReader reader =
        new BufferedReader(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
      String line;
      while ((line = reader.readLine()) != null) {
        String w = line.toLowerCase(Locale.ROOT).strip();
        if (!w.isEmpty() && !w.startsWith("#")) {
          words.add(w);
        }
      }
    }
    return words;
  }
}
