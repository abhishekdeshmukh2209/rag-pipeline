# RAG Pipeline Demo Website

Interactive sample project showing how a Retrieval-Augmented Generation (RAG)
pipeline works using:

- **`spring-backend`**: Java **Spring Boot** API (TF-IDF indexing and retrieval) — default for the UI
- **`backend`**: Python **FastAPI** API with the same endpoints (optional alternative)
- **`frontend`**: **Angular** app with animated pipeline stages
- Grounded answer output with retrieved context snippets

This repository is designed as a portfolio-ready demo for GitHub.

For a full development write-up (frontend, both backends, API contract, optional database scripts, and troubleshooting), see **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)**.

For hosting the Angular frontend and Java backend safely before open-sourcing, see **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

### Two consoles (Spring + Angular)

From the repo root, use **two terminals**: start **Spring first**, then **Angular**. See **[scripts/README.md](scripts/README.md)** for `start-spring.ps1` / `start-frontend.ps1` (or `.cmd` variants) and copy-paste commands.

**Missing Java or Maven on Windows?** Run **`scripts/install-jdk-maven-user.ps1`** once (user-level install, no admin); details in `scripts/README.md`.

## What You Can Show In A Demo

- A live question-answer experience with visible pipeline animation
- Source-grounded responses instead of opaque model output
- Clear architecture and write-up of ingestion, retrieval, and generation

## Project Structure

```
spring-backend/         # Java Spring Boot RAG API (port 8080)
  src/main/java/...
  src/main/resources/data/*.md
backend/                # Python FastAPI RAG API (port 8000)
  app/main.py
  data/*.md
frontend/
  src/app/*             # Angular standalone component UI
  src/environments/environment.ts           # production apiUrl (direct to Spring)
  src/environments/environment.development.ts  # dev apiUrl /api → proxy → Spring
  proxy.conf.json       # ng serve: /api → http://127.0.0.1:8080
  angular.json
docs/
  architecture.md
```

## Run Locally

### 1) Start a backend (pick one)

**Spring Boot (default for Angular `apiUrl`):**

```bash
cd spring-backend
mvn spring-boot:run
```

**Python FastAPI (optional):** set `frontend/src/environments/environment.ts` → `apiUrl: "http://127.0.0.1:8000"`, then:

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2) Start frontend

With **Spring Boot** already running on port **8080**, start the Angular dev server (it proxies `/api/*` to `http://127.0.0.1:8080/*` — see `frontend/proxy.conf.json`):

```bash
cd frontend
npm install
npm start
```

**Connectivity:** `ng serve` uses `environment.development.ts` → `apiUrl: '/api'`, so the browser calls same-origin URLs like `/api/ask` and the dev server forwards them to Spring. No CORS configuration is required in the browser for that path.

Production builds use `environment.ts` and call `http://127.0.0.1:8080` by default (change for your host).

Open the URL shown in the terminal (Angular dev server, often `http://localhost:4200`) and try sample questions like:

- "How does a RAG pipeline reduce hallucinations?"
- "What are common RAG failure modes?"
- "Why is chunk overlap important?"

## How It Works

1. **Ingestion**: Markdown is loaded from `spring-backend/src/main/resources/data/` (Spring) or `backend/data/` (Python).
2. **Chunking**: Documents are split into overlapping text windows.
3. **Embedding/Indexing**: Chunks are vectorized with TF-IDF (Java implementation or scikit-learn).
4. **Retrieval**: Query vector is compared with chunk vectors using cosine similarity.
5. **Generation**: Response is composed using top retrieved chunks as grounding context.

## GitHub Repository Setup

After creating a new empty GitHub repo, run:

```bash
git init
git add .
git commit -m "Initial RAG demo website with animated pipeline"
git branch -M main
git remote add origin https://github.com/<your-username>/<repo-name>.git
git push -u origin main
```

If you use GitHub CLI:

```bash
gh repo create <repo-name> --public --source . --remote origin --push
```

## Upgrade Ideas

- Replace TF-IDF with embedding model APIs
- Add citation links to exact document offsets
- Add eval dashboard for retrieval quality and latency
