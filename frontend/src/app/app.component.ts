import { CommonModule } from "@angular/common";
import { HttpClient } from "@angular/common/http";
import { Component, OnInit } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { trigger, transition, style, animate } from "@angular/animations";
import { firstValueFrom } from "rxjs";
import { environment } from "../environments/environment";

interface AskResponse {
  answer: string;
  context: Array<{ source: string; snippet: string }>;
  steps: string[];
}

interface HealthResponse {
  status: string;
  chunks_indexed: number;
}

interface SourceSummary {
  source: string;
  chunk_count: number;
}

interface PipelineStep {
  title: string;
  plainTitle: string;
  simple: string;
  detail: string;
  color: string;
  mini: string;
}

interface LessonCard {
  title: string;
  category: string;
  description: string;
  sample: string;
  stepIndex: number;
}

interface LessonStep {
  id: string;
  label: string;
  description: string;
  educationalText: string;
  exampleText: string;
  deepDiveText: string;
  color: string;
}

@Component({
  selector: "app-root",
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: "./app.component.html",
  styleUrl: "./app.component.css",
  animations: [
    trigger("stepPulse", [
      transition("* => active", [
        style({ transform: "translateY(0) scale(0.98)", opacity: 0.75 }),
        animate("260ms ease-out", style({ transform: "translateY(-4px) scale(1)", opacity: 1 }))
      ])
    ])
  ]
})
export class AppComponent implements OnInit {
  private readonly apiUrl = environment.apiUrl;
  private narrationRunId = 0;

  question = "How does a RAG pipeline reduce hallucinations?";
  loading = false;
  speaking = false;
  voiceEnabled = true;
  currentNarration = "Press Run Pipeline and I will walk you through every step.";
  result: AskResponse | null = null;
  activeStep = -1;
  activeLessonIndex = 0;
  health: HealthResponse | null = null;
  healthError = "";
  sources: SourceSummary[] = [];
  selectedCategory = "All";
  searchTerm = "";
  selectedLessonTitle = "RAG in one sentence";

  readonly pipelineSteps: PipelineStep[] = [
    {
      title: "Ask",
      plainTitle: "The question arrives",
      simple: "The app takes your question and gets ready to search.",
      detail: "Like handing a note to a very fast librarian.",
      color: "#38bdf8",
      mini: "Question"
    },
    {
      title: "Slice",
      plainTitle: "Big notes become small cards",
      simple: "Long documents are split into bite-size pieces.",
      detail: "Small cards are easier to compare than whole books.",
      color: "#f59e0b",
      mini: "Chunks"
    },
    {
      title: "Match",
      plainTitle: "Words become clues",
      simple: "The question and cards are turned into numbers so similar ideas can line up.",
      detail: "The computer is looking for meaning, not just exact words.",
      color: "#a78bfa",
      mini: "Signals"
    },
    {
      title: "Fetch",
      plainTitle: "Best evidence is pulled forward",
      simple: "The most useful cards come to the top.",
      detail: "Only the strongest matches get used for the answer.",
      color: "#34d399",
      mini: "Evidence"
    },
    {
      title: "Answer",
      plainTitle: "The reply uses proof",
      simple: "The final answer is written using the retrieved context.",
      detail: "That is why RAG answers can show where the idea came from.",
      color: "#fb7185",
      mini: "Reply"
    }
  ];

  readonly lessonCards: LessonCard[] = [
    {
      title: "RAG in one sentence",
      category: "Basics",
      description: "A model checks trusted notes before answering, so it guesses less.",
      sample: "Explain RAG like I am 10 years old.",
      stepIndex: 0
    },
    {
      title: "Why chunking matters",
      category: "Pipeline",
      description: "Big documents become small cards that are easier to search.",
      sample: "Why is chunk overlap important?",
      stepIndex: 1
    },
    {
      title: "How matching works",
      category: "Retrieval",
      description: "The question and notes become comparable signals.",
      sample: "How does a RAG pipeline find relevant context?",
      stepIndex: 2
    },
    {
      title: "Evidence beats memory",
      category: "Grounding",
      description: "The answer is built from the retrieved cards, not loose memory.",
      sample: "How does a RAG pipeline reduce hallucinations?",
      stepIndex: 4
    },
    {
      title: "Common failure modes",
      category: "Debugging",
      description: "Bad chunks or weak retrieval can send the answer down the wrong path.",
      sample: "What are common RAG failure modes?",
      stepIndex: 3
    }
  ];

  readonly lessonSteps: LessonStep[] = [
    {
      id: "chunking",
      label: "Chunking",
      description: "Break large documents into smaller searchable pieces.",
      educationalText:
        "Chunking breaks large documents into smaller pieces so retrieval can search them efficiently. Bad chunking can split meaning or hide useful context. Chunk size and overlap are critical parameters. Text starts as characters, becomes words, and is often counted as tokens because language models have token limits.",
      exampleText:
        "Example: this Java backend loads rag_basics.md and ops_notes.md, then splits them into small cards so a question can find only the relevant pieces.",
      deepDiveText:
        "A chunk is not just a random slice. Good chunking tries to preserve meaning. Overlap repeats a small part of the previous chunk so an important sentence is not lost at the boundary.",
      color: "#f59e0b"
    },
    {
      id: "embedding",
      label: "Embeddings",
      description: "Turn text chunks into dense semantic vectors.",
      educationalText:
        "Embedding models are trained with contrastive learning: similar texts are pulled together, and dissimilar texts are pushed apart. They produce dense vectors, often 384 to 3072 dimensions, trained on massive corpora to capture semantic relationships.",
      exampleText:
        "Example: OpenAI text-embedding-3-small or text-embedding-3-large, Cohere embed, and open-source BGE, E5, or GTE can embed text. This local demo uses TF-IDF to show the same idea without an API key.",
      deepDiveText:
        "Critical rule: the same model must embed both documents and queries. Mixing models creates incompatible vector spaces and can break retrieval entirely.",
      color: "#a78bfa"
    },
    {
      id: "vectordb",
      label: "Vector DB",
      description: "Store embeddings for fast nearest-neighbor search.",
      educationalText:
        "A vector database stores embeddings and enables fast similarity search at scale. Instead of comparing against every vector one by one, it uses indexing structures like HNSW or IVF to find nearest neighbors efficiently.",
      exampleText:
        "Example: with millions of chunks, a vector DB makes retrieval practical. In this local demo, Spring keeps the small TF-IDF index in memory.",
      deepDiveText:
        "Popular vector stores include pgvector, Pinecone, Weaviate, Milvus, Qdrant, OpenSearch, and Elasticsearch. Metadata such as source file and chunk id is stored with each vector.",
      color: "#22c55e"
    },
    {
      id: "query",
      label: "User Query",
      description: "Embed the user question with the same model.",
      educationalText:
        "Your question is also converted into an embedding using the same model. This allows the system to compare your question against all chunks by measuring vector similarity.",
      exampleText:
        "Example: if you ask how RAG reduces hallucinations, the query vector should land near chunks about grounding answers in retrieved context.",
      deepDiveText:
        "Some systems rewrite the query first, expand acronyms, or create multiple query variants. But the core rule stays the same: compare the query representation with the document representations.",
      color: "#f97316"
    },
    {
      id: "retrieval",
      label: "Retrieval",
      description: "Find semantically closest chunks with similarity search.",
      educationalText:
        "Retrieval compares vector similarity, often cosine similarity, to find chunks that are semantically closest to the question. The top-k parameter controls how many chunks are selected.",
      exampleText:
        "Example: top-k equals 3 means the system keeps the three best evidence chunks and sends only those forward.",
      deepDiveText:
        "Retrieval quality is often the heart of RAG. Bad retrieval means the answer generator never sees the right information. Re-ranking can improve precision after the first retrieval pass.",
      color: "#10b981"
    },
    {
      id: "prompt",
      label: "Prompt Construction",
      description: "Place retrieved chunks beside the user question.",
      educationalText:
        "The LLM answers from the prompt you build. Retrieved chunks are placed as context alongside your question. The model can only use the context it receives, so good retrieval directly impacts answer quality.",
      exampleText:
        "Example: the prompt says: here are the evidence chunks, here is the question, answer only from this context and do not guess.",
      deepDiveText:
        "Strong prompts include system instructions, source labels, context blocks, citation rules, and refusal instructions when context is missing.",
      color: "#06b6d4"
    },
    {
      id: "answer",
      label: "Generated Answer",
      description: "Return an answer with inspectable sources.",
      educationalText:
        "The final answer is generated from the prompt. A good RAG answer should be faithful to the retrieved chunks and should show the evidence that shaped it.",
      exampleText:
        "Example: this demo shows retrieved source snippets next to the answer, so a visitor can inspect why the answer was produced.",
      deepDiveText:
        "A production system can add groundedness checks, confidence thresholds, and refusal behavior when retrieval finds weak evidence.",
      color: "#fb7185"
    }
  ];

  readonly sampleQuestions = [
    "How does a RAG pipeline reduce hallucinations?",
    "Why is chunk overlap important?",
    "What are common RAG failure modes?"
  ];

  constructor(private readonly http: HttpClient) {}

  ngOnInit(): void {
    this.refreshHealth();
  }

  refreshHealth(): void {
    this.healthError = "";
    this.http.get<HealthResponse>(`${this.apiUrl}/health`).subscribe({
      next: (data) => {
        this.health = data;
        this.refreshSources();
      },
      error: () => {
        this.health = null;
        this.sources = [];
        this.healthError = "Backend offline";
      }
    });
  }

  refreshSources(): void {
    this.http.get<SourceSummary[]>(`${this.apiUrl}/sources`).subscribe({
      next: (data) => {
        this.sources = data;
      },
      error: () => {
        this.sources = [];
      }
    });
  }

  useSample(sample: string): void {
    this.question = sample;
  }

  selectLesson(lesson: LessonCard): void {
    this.selectedLessonTitle = lesson.title;
    this.question = lesson.sample;
    this.activeStep = lesson.stepIndex;
  }

  async runDemo(): Promise<void> {
    if (this.question.trim().length < 4 || this.loading) {
      return;
    }

    const runId = ++this.narrationRunId;
    this.loading = true;
    this.result = null;

    try {
      for (let i = 0; i < this.lessonSteps.length; i++) {
        if (runId !== this.narrationRunId) {
          return;
        }

        this.selectLessonStep(i);
        const step = this.lessonSteps[i];
        await this.narrateStep(step, i, runId);

        if (step.id === "retrieval" && runId === this.narrationRunId) {
          this.currentNarration =
            "Now I am asking the Java Spring backend to retrieve the best evidence cards for your question.";
          await this.speak(this.currentNarration, runId);
          await this.askBackend();
        }
      }

      if (runId === this.narrationRunId && !this.result) {
        await this.askBackend();
      }

      if (runId === this.narrationRunId) {
        this.currentNarration =
          "The pipeline is complete. The answer is grounded because it was written from the retrieved evidence cards.";
        await this.speak(this.currentNarration, runId);
      }
    } finally {
      if (runId === this.narrationRunId) {
        this.loading = false;
        this.speaking = false;
      }
    }
  }

  reset(): void {
    this.stopNarration();
    this.result = null;
    this.activeStep = -1;
    this.activeLessonIndex = 0;
    this.currentNarration = "Press Run Pipeline and I will walk you through every step.";
  }

  stopNarration(): void {
    this.narrationRunId++;
    this.loading = false;
    this.speaking = false;
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }

  private async askBackend(): Promise<void> {
    try {
      this.result = await firstValueFrom(
        this.http.post<AskResponse>(`${this.apiUrl}/ask`, { question: this.question })
      );
      this.refreshHealth();
    } catch {
      this.health = null;
      this.healthError = "Backend offline";
      this.result = {
        answer:
          "I could not reach the local API yet. Start Spring with scripts/start-spring.ps1, then run scripts/start-frontend.ps1 so the website can talk to the RAG backend.",
        context: [],
        steps: ["Request failed"]
      };
    }
  }

  private async narrateStep(step: LessonStep, index: number, runId: number): Promise<void> {
    const message = `Step ${index + 1}. ${step.label}. ${step.description} ${step.educationalText} ${this.exampleForStep(step)}`;
    const startedAt = Date.now();
    const minimumStepMs = Math.min(18000, Math.max(8000, message.length * 32));
    this.currentNarration = message;
    await this.speak(message, runId);
    await this.wait(Math.max(900, minimumStepMs - (Date.now() - startedAt)), runId);
  }

  exampleForStep(step: LessonStep): string {
    if (step.id === "input" && this.sources.length) {
      const sourceNames = this.sources.map((source) => source.source).join(" and ");
      return `Example: right now, the Java backend has loaded ${sourceNames}.`;
    }

    if (step.id === "chunking" && this.sourceChunkTotal) {
      return `Example: those files have been split into ${this.sourceChunkTotal} searchable chunks.`;
    }

    if (step.id === "query") {
      return `Example: your current question is, ${this.question}.`;
    }

    if (step.id === "retrieval" && this.result?.context?.length) {
      return `Example: one retrieved evidence card came from ${this.result.context[0].source}.`;
    }

    if (step.id === "answer" && this.result?.answer) {
      return `Example: the answer now uses the retrieved evidence instead of guessing from memory.`;
    }

    return step.exampleText;
  }

  private async speak(text: string, runId: number): Promise<void> {
    this.currentNarration = text;

    if (!this.voiceEnabled || !("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) {
      return this.wait(Math.min(5200, Math.max(2600, text.length * 32)), runId);
    }

    window.speechSynthesis.cancel();
    this.speaking = true;
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice =
      voices.find((voice) => voice.lang.startsWith("en") && /female|zira|jenny|aria|natural/i.test(voice.name)) ??
      voices.find((voice) => voice.lang.startsWith("en"));

    for (const segment of this.narrationSegments(text)) {
      if (runId !== this.narrationRunId) {
        break;
      }

      await new Promise<void>((resolve) => {
        const utterance = new SpeechSynthesisUtterance(segment);
        utterance.rate = 0.92;
        utterance.pitch = 1.08;
        utterance.volume = 1;
        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        let finished = false;
        const finish = () => {
          if (!finished) {
            finished = true;
            resolve();
          }
        };

        utterance.onend = finish;
        utterance.onerror = finish;
        window.speechSynthesis.speak(utterance);
        window.setTimeout(finish, Math.min(30000, Math.max(8000, segment.length * 130)));
      });
    }

    if (runId === this.narrationRunId) {
      this.speaking = false;
    }
  }

  private narrationSegments(text: string): string[] {
    const sentences = text.match(/[^.!?]+[.!?]+|[^.!?]+$/g) ?? [text];
    const segments: string[] = [];

    for (const sentence of sentences.map((part) => part.trim()).filter(Boolean)) {
      if (sentence.length <= 190) {
        segments.push(sentence);
        continue;
      }

      const phrases = sentence.match(/[^,;:]+[,;:]?|[^,;:]+$/g) ?? [sentence];
      let segment = "";
      for (const phrase of phrases.map((part) => part.trim()).filter(Boolean)) {
        if (segment && `${segment} ${phrase}`.length > 190) {
          segments.push(segment);
          segment = phrase;
        } else {
          segment = segment ? `${segment} ${phrase}` : phrase;
        }
      }
      if (segment) {
        segments.push(segment);
      }
    }

    return segments;
  }

  private wait(ms: number, runId: number): Promise<void> {
    return new Promise((resolve) => {
      window.setTimeout(() => {
        if (runId === this.narrationRunId) {
          resolve();
        } else {
          resolve();
        }
      }, ms);
    });
  }

  get currentStep(): PipelineStep {
    return this.pipelineSteps[Math.max(this.activeStep, 0)];
  }

  get categories(): string[] {
    return ["All", ...Array.from(new Set(this.lessonCards.map((lesson) => lesson.category)))];
  }

  get visibleLessons(): LessonCard[] {
    const term = this.searchTerm.trim().toLowerCase();
    return this.lessonCards.filter((lesson) => {
      const matchesCategory = this.selectedCategory === "All" || lesson.category === this.selectedCategory;
      const matchesTerm =
        !term ||
        lesson.title.toLowerCase().includes(term) ||
        lesson.description.toLowerCase().includes(term) ||
        lesson.category.toLowerCase().includes(term);
      return matchesCategory && matchesTerm;
    });
  }

  get progressPercent(): number {
    if (this.activeLessonIndex < 0) {
      return 0;
    }
    return (this.activeLessonIndex / (this.lessonSteps.length - 1)) * 100;
  }

  get currentLessonStep(): LessonStep {
    return this.lessonSteps[this.activeLessonIndex] ?? this.lessonSteps[0];
  }

  get guideAction(): string {
    if (!this.loading && !this.speaking) {
      return "ready";
    }

    const actions: Record<string, string> = {
      chunking: "point",
      embedding: "scan",
      vectordb: "present",
      query: "think",
      retrieval: "point",
      prompt: "build",
      answer: "celebrate"
    };

    return actions[this.currentLessonStep.id] ?? "ready";
  }

  selectLessonStep(index: number): void {
    this.activeLessonIndex = index;
    this.activeStep = Math.min(
      this.pipelineSteps.length - 1,
      Math.round((index / (this.lessonSteps.length - 1)) * (this.pipelineSteps.length - 1))
    );
  }

  get sourceChunkTotal(): number {
    return this.sources.reduce((sum, source) => sum + source.chunk_count, 0);
  }

  get statusLabel(): string {
    if (this.health) {
      return `${this.health.status.toUpperCase()} - ${this.health.chunks_indexed} chunks ready`;
    }
    return this.healthError || "Checking backend";
  }
}
