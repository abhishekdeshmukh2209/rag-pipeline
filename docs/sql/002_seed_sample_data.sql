-- Sample rows aligned with the demo knowledge themes (RAG basics, operations).
-- Run after 001_schema_documents_chunks.sql. Safe to re-run if you truncate first.

BEGIN;

INSERT INTO documents (external_key, title, source_uri, body_text)
VALUES (
    'seed:rag-basics',
    'RAG Pipeline Basics',
    'classpath:data/rag_basics.md',
    '# RAG Pipeline Basics

Retrieval-Augmented Generation (RAG) combines search with text generation.
Typical stages include ingestion, chunking, embedding, retrieval, and generation.'
)
ON CONFLICT (external_key) DO NOTHING;

INSERT INTO documents (external_key, title, source_uri, body_text)
VALUES (
    'seed:ops-notes',
    'Operational Notes For RAG',
    'classpath:data/ops_notes.md',
    '# Operational Notes

Overlap between chunks helps retrieval. Monitor latency, hit rate, and index freshness.'
)
ON CONFLICT (external_key) DO NOTHING;

-- Chunks for the first inserted document (ids may vary; use subselects).
INSERT INTO chunks (document_id, ordinal, body, char_start, char_end)
SELECT d.id, 0,
       'Retrieval-Augmented Generation (RAG) combines search with text generation.',
       0, 80
FROM documents d
WHERE d.external_key = 'seed:rag-basics'
ON CONFLICT (document_id, ordinal) DO NOTHING;

INSERT INTO chunks (document_id, ordinal, body, char_start, char_end)
SELECT d.id, 1,
       'Typical stages include ingestion, chunking, embedding, retrieval, and generation.',
       81, 200
FROM documents d
WHERE d.external_key = 'seed:rag-basics'
ON CONFLICT (document_id, ordinal) DO NOTHING;

INSERT INTO chunks (document_id, ordinal, body, char_start, char_end)
SELECT d.id, 0,
       'Overlap between chunks helps retrieval.',
       0, 40
FROM documents d
WHERE d.external_key = 'seed:ops-notes'
ON CONFLICT (document_id, ordinal) DO NOTHING;

COMMIT;
