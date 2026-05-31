-- Optional schema: documents + text chunks for a RAG-style pipeline (PostgreSQL 14+).
-- Not used by the default Spring or FastAPI demos; use when you add persistence.

BEGIN;

CREATE TABLE IF NOT EXISTS documents (
    id              BIGSERIAL PRIMARY KEY,
    external_key    VARCHAR(255) UNIQUE,
    title           VARCHAR(512) NOT NULL,
    source_uri      VARCHAR(2048),
    mime_type       VARCHAR(128) DEFAULT 'text/markdown',
    body_text       TEXT NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chunks (
    id              BIGSERIAL PRIMARY KEY,
    document_id     BIGINT NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
    ordinal         INT NOT NULL,
    body            TEXT NOT NULL,
    char_start      INT,
    char_end        INT,
    token_count     INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (document_id, ordinal)
);

CREATE INDEX IF NOT EXISTS idx_chunks_document ON chunks (document_id);

-- Optional: store precomputed embedding metadata (vector column requires pgvector extension).
-- Uncomment after: CREATE EXTENSION IF NOT EXISTS vector;
-- ALTER TABLE chunks ADD COLUMN embedding vector(1536);

CREATE TABLE IF NOT EXISTS query_audit (
    id              BIGSERIAL PRIMARY KEY,
    question        TEXT NOT NULL,
    backend         VARCHAR(64),
    top_chunk_ids   BIGINT[],
    latency_ms      INT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION set_updated_at_documents()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_documents_updated_at ON documents;
CREATE TRIGGER trg_documents_updated_at
    BEFORE UPDATE ON documents
    FOR EACH ROW
    EXECUTE PROCEDURE set_updated_at_documents();

COMMIT;
