from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import List
import re

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


DATA_DIR = Path(__file__).resolve().parent.parent / "data"


def split_into_chunks(text: str, chunk_size: int = 450) -> List[str]:
    normalized = re.sub(r"\s+", " ", text).strip()
    if not normalized:
        return []

    chunks: List[str] = []
    start = 0
    while start < len(normalized):
        end = min(start + chunk_size, len(normalized))
        chunks.append(normalized[start:end])
        start += int(chunk_size * 0.8)
    return chunks


@dataclass
class SourceChunk:
    source: str
    text: str


class RAGIndex:
    def __init__(self) -> None:
        self.chunks: List[SourceChunk] = []
        self.vectorizer = TfidfVectorizer(stop_words="english")
        self.matrix = None

    def build(self) -> None:
        all_chunks: List[SourceChunk] = []
        for file_path in DATA_DIR.glob("*.md"):
            content = file_path.read_text(encoding="utf-8")
            for chunk in split_into_chunks(content):
                all_chunks.append(SourceChunk(source=file_path.name, text=chunk))

        if not all_chunks:
            raise RuntimeError("No markdown files found in backend/data.")

        self.chunks = all_chunks
        self.matrix = self.vectorizer.fit_transform([c.text for c in self.chunks])

    def retrieve(self, query: str, top_k: int = 3) -> List[SourceChunk]:
        query_vector = self.vectorizer.transform([query])
        scores = cosine_similarity(query_vector, self.matrix)[0]
        top_indices = scores.argsort()[::-1][:top_k]
        return [self.chunks[i] for i in top_indices if scores[i] > 0]


class AskRequest(BaseModel):
    question: str


class AskResponse(BaseModel):
    answer: str
    context: List[dict]
    steps: List[str]


app = FastAPI(title="RAG Pipeline Demo")
index = RAGIndex()
index.build()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "chunks_indexed": len(index.chunks)}


@app.get("/sources")
def sources() -> List[dict]:
    counts: dict[str, int] = {}
    for chunk in index.chunks:
        counts[chunk.source] = counts.get(chunk.source, 0) + 1
    return [{"source": source, "chunk_count": count} for source, count in counts.items()]


@app.post("/ask", response_model=AskResponse)
def ask_question(payload: AskRequest) -> AskResponse:
    question = payload.question.strip()
    retrieved = index.retrieve(question, top_k=3)

    if not retrieved:
        return AskResponse(
            answer="I could not find matching context. Try asking about the RAG stages, chunking, embeddings, or retrieval.",
            context=[],
            steps=[
                "User question received",
                "Question embedded with TF-IDF",
                "No relevant chunks found",
            ],
        )

    combined_context = " ".join(c.text for c in retrieved)
    answer = (
        "Think of RAG like a careful homework helper. First it breaks big notes into small cards, "
        "then it finds the cards that best match your question, and only then it writes an answer "
        "using those cards as proof. That keeps the answer grounded instead of guessing from memory. "
        f"One useful note it found says: {combined_context[:340]}..."
    )

    return AskResponse(
        answer=answer,
        context=[{"source": c.source, "snippet": c.text[:220]} for c in retrieved],
        steps=[
            "User question received",
            "Question compared with document cards",
            "Best evidence cards retrieved",
            "Answer written from the evidence",
        ],
    )
