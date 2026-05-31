# Architecture Overview

This sample project demonstrates an end-to-end Retrieval-Augmented Generation
(RAG) flow with a lightweight local stack.

## Components

- **Backend (`Spring Boot`, `spring-backend`)**
  - Loads markdown from `classpath:data/*.md`
  - Same chunking and TF-IDF style retrieval as the Python demo (implemented in Java)
  - Exposes `GET /health` and `POST /ask` on port **8080** by default

- **Backend (`FastAPI`, `backend`) — optional**
  - Loads markdown files from `backend/data`
  - TF-IDF via scikit-learn; same JSON contract as Spring

- **Frontend (`Angular`)**
  - Accepts user question input
  - Animates each pipeline stage with Angular animations while query runs
  - Displays final answer and retrieved context snippets

## Request Lifecycle

1. User enters a question in the website.
2. Frontend starts animated stage progression.
3. Backend receives `/ask` request.
4. Query is vectorized and compared against indexed chunks.
5. Top chunks are combined to generate a grounded response.
6. Frontend renders answer and context cards.

## Why This Is Useful

- Easy to run locally and explain in interviews/demos.
- Clear separation of retrieval and generation responsibilities.
- Ready to swap TF-IDF for embedding models and LLM APIs later.
