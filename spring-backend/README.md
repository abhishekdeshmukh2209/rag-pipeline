# Spring Boot RAG API

Java Spring Boot service that mirrors the Python FastAPI demo: TF-IDF chunk
indexing over `classpath:data/*.md`, `GET /health`, and `POST /ask`.

Default port: **8080** (see `application.properties`).

## Run

Requirements: JDK 17+ and Maven 3.9+.

```bash
cd spring-backend
mvn spring-boot:run
```

Health check: `http://127.0.0.1:8080/health`

## API

- `POST /ask` with JSON body `{ "question": "..." }`
- Same response shape as the Python backend (`answer`, `context`, `steps`)

The Angular app uses `src/environments/environment.ts` → `apiUrl` pointing at
this server by default.
