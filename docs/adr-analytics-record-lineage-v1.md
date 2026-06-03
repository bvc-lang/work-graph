# ADR: Analytics record lineage v1

**Status:** accepted (AN-51)  
**Date:** 2026-06-02  
**Sources:** [AN-51](../work/analytics/analytics-record-lineage-flat-list-graph-storage.md), [AN-3](../work/analytics/intent-graph-storage-roadmap.md)

---

## Context

Analytics journal (~60 AN records) is sorted **recency-first**. Deepening analyses (AN-50 → AN-50.1) are linked only in markdown «Связи». AN-3 intent graph covers question→decision→work, not analysis→deeper analysis.

---

## Decision

1. **Storage:** optional `lineage` block on `analytics-record.v1` — graph edges, not a nested tree file.
2. **UI list:** remain **flat recency-first**; optional badge (`↳ AN-50`, «N продолжений»).
3. **UI drawer:** dedicated sections «Родительский разбор», «Продолжения», «Связанные» alongside existing intent graph.
4. **Projection:** `analytics-lineage.projection.v1` built at read time; `childKeys` derived from `parentKey` index.
5. **Intent graph (AN-3):** not replaced; bridge later if needed.

---

## Lineage block (optional)

```json
{
  "lineage": {
    "parentKey": "AN-50",
    "parentId": "analytics:verification-panel-tests-evidence-intent",
    "relation": "deepens",
    "relatedKeys": ["AN-45"]
  }
}
```

| Field | Required | Notes |
|-------|----------|-------|
| `parentKey` | no* | Parent AN key (e.g. `AN-50`) |
| `parentId` | no* | Stable record id; preferred when known |
| `relation` | no | Default `deepens` when parent set |
| `relatedKeys` | no | Peer links |

\*At least one of `parentKey` / `parentId` when expressing parent edge.

### Relations

| relation | Semantics |
|----------|-----------|
| `deepens` | Parent overview → deeper analysis |
| `related` | Peer cross-link |
| `supersedes` | Replaces older analysis |
| `closes` | Closing record → epic (also inferred from closing kind) |

---

## Rejected alternatives

- **Tree view in main list** — breaks recency feed, search, intake/closing tabs.
- **Markdown-only lineage** — unreliable for MCP and badges.
- **IntentNode-only (AN-3 C)** — heavy for simple deepenings without question/options.

---

## Consequences

- Journal backward compatible: records without `lineage` unchanged.
- `buildAnalyticsLineageProjection` is pure; no new persistence besides optional journal fields.
- MCP `get_analytics_lineage` reads projection; not a second graph store.

---

## Reference fixture

AN-50.1 (`analytics:work-graph-bvc-contract-verification`) → parent AN-50, relation `deepens`.
