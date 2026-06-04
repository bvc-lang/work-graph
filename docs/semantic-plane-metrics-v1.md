# Semantic plane metrics v1 (AN-68)

**Context:** [adr-intent-information-semantic-planes-v1.md](adr-intent-information-semantic-planes-v1.md)

## Definitions

| Metric | Range | Meaning |
|--------|-------|---------|
| `alignment_score` | 0..1 | Token overlap between BVC Goal/Vector and linked code/evidence |
| `drift_score` | 0..1 | `1 - alignment_score` (lexical v1) |
| `void` | boolean | Task has target_files but no trace/evidence linkage |
| `conflict` | boolean | Goal tokens contradict evidence summary (P2) |

## BVC fields embedded separately

- **Basis** — context / rationale (weight 1.0 in field ranking)
- **Vector** — approach (weight 1.2)
- **Goal** — acceptance intent (weight 1.5)

## drift_score v1 formula (lexical)

```
tokens_goal = tokenize(work.goal + work.vector)
tokens_code = tokenize(target_files basenames + trace.code_refs)
overlap = |tokens_goal ∩ tokens_code| / max(1, |tokens_goal|)
alignment_score = min(1, overlap + evidence_bonus)
drift_score = 1 - alignment_score
```

`evidence_bonus = 0.15` when `trace.status: verified` or non-empty Свидетельства.

## Thresholds (conceptual)

| drift_score | Signal |
|-------------|--------|
| < 0.35 | aligned |
| 0.35–0.65 | review |
| > 0.65 | likely drift |

Semantic metrics **do not replace** verify gates — they guide operator attention.

## Reasons list (detect_semantic_drift)

Each reason: `{ code, message, weight }` e.g. `missing_trace`, `low_goal_overlap`, `no_target_files`.
