# ADR: Semantic search vector ANN phase 2 (deferred)

## Статус

Принято (2026-05). **Phase 2 ANN не внедряется** в Work Graph MVP; lexical + BM25 + TF-IDF cosine достаточны для headless MCP corpus.

## Контекст

- Phase 1 закрыт: `lexical-v1`, `hybrid-lexical-bm25-v1`, `hybrid-lexical-bm25-tfidf-v1` в MCP `semantic_search` и CLI `npm run semantic:search`.
- ioHasC browser path использует optional `hnswlib-wasm` + neural embeddings — другой runtime (Monaco worker, большой corpus).
- Work Graph rebuild — headless operator + MCP; corpus = WorkItems, `.bvc` excerpts, bounded file slices.

## Решение

### Сейчас (implemented)

- TF-IDF vector channel в `hybrid-lexical-bm25-tfidf-v1` — детерминированный «vector» без neural model.
- Feature flag / mode selection через MCP tool args и `semanticSearchWorkflow.mjs`.
- Eval rubric в `docs/plan-workgraph-llm-usefulness.md` — ANN помечен deferred.

### Phase 2 ANN (deferred triggers)

Reopen только когда **все** true:

1. Corpus > ~5k chunks **и** p95 latency hybrid search > 800 ms на типичном operator query.
2. Есть стабильный local embedding endpoint (Ollama / LM Studio) или pinned WASM model bundle.
3. Explicit WorkItem `semantic-search-ann-pilot` approved (не auto-promotion из code-gap).
4. Golden eval set: ≥10 query/relevant-chunk pairs с recall@5 baseline для TF-IDF.

### Не делаем без pilot

- Neural embeddings в mandatory CI.
- Browser worker / hnswlib port 1:1 из ioHasC IDE.
- Авто-замена TF-IDF channel без A/B rubric.

## Последствия

- `implement-semantic-search-vector-ann-phase2` закрыт как **design + TF-IDF prototype**, не full ANN.
- MCP README и `workgraph-intent-graph-mcp.md` остаются источником truth для modes.
- Следующий шаг при reopen: spike `semanticSearchAnnIndex.ts` port или sidecar ANN service ADR.

## Ссылки

- [plan-workgraph-llm-usefulness.md](plan-workgraph-llm-usefulness.md)
- [adr-workgraph-headless-intent-backend.md](adr-workgraph-headless-intent-backend.md)
- [workgraph-intent-graph-mcp.md](workgraph-intent-graph-mcp.md)
