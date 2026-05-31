# RAG Pipeline Basics

Retrieval-Augmented Generation (RAG) combines search with text generation.
Instead of asking an LLM to answer from memory, a RAG system first looks up
relevant context from a document store.

Typical RAG stages:

1. Ingestion: collect documents from PDFs, markdown, websites, or databases.
2. Chunking: split long documents into short windows of text.
3. Embedding: convert chunks into vectors.
4. Retrieval: compare question vectors with chunk vectors to find top matches.
5. Generation: prompt a model with the question and retrieved chunks.
6. Grounded output: answer with citations or snippets from source documents.

RAG improves factual accuracy and allows teams to update knowledge without
retraining the model.
