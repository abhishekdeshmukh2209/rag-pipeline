# Operational Notes For RAG

Good chunk size often depends on domain. A common baseline is 300 to 600
characters or around 100 to 250 tokens with some overlap.

Overlap matters because important facts may be split across boundaries.
With overlap, retrieval can still surface the full idea.

Useful production metrics:
- retrieval hit rate
- answer groundedness score
- latency per stage
- index freshness

Common failure modes:
- stale index not updated after docs changed
- chunks too large, so retrieval becomes noisy
- chunks too small, so context is incomplete
- missing metadata, so citation and filtering become difficult
