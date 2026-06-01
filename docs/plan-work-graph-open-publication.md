# Plan: публикация Work Graph — лицензии и open core (AN-42)

## Цель

Подготовить Work Graph к публичному релизу по модели **open core**: открытые форматы и reference implementations (BVC, IR, PVRG, core CLI/MCP/UI), юридическая и экосистемная защита через лицензии, trademark и conformance — без иллюзии «секретных алгоритмов».

## Источник

- [AN-42](../work/analytics/open-publication-technology-holdback-strategy.md)
- Эпик: `epic-work-graph-open-publication`

## Ключевое решение из разбора

| Слой | Роль | Лицензия (целевая) |
|------|------|-------------------|
| **BVC** | универсальный человекочитаемый формат | spec CC BY 4.0, code Apache-2.0 |
| **IR/RichIR** | машинный workflow/reasoning IR | spec CC BY 4.0, code Apache-2.0 |
| **PVRG** | машинный project graph | spec CC BY 4.0, code Apache-2.0 |
| **Work Graph core** | продукт open core | Apache-2.0 или MPL-2.0 |
| **Domain/enterprise packs** | коммерческая ценность | commercial / source-available |
| **Eval corpus** | качество и данные | proprietary |

## Треки

| # | work.id | Суть |
|---|---------|------|
| A | `decide-work-graph-open-publication-adr` | ADR: лицензии, open vs commercial, Apache vs MPL |
| B | `inventory-public-private-packages-an42` | инвентаризация public / private / experimental |
| C | `publish-bvc-open-standard-pack-an42` | BVC spec + `@bvc/*` + conformance |
| D | `publish-ir-richir-public-spec-an42` | IR/RichIR draft spec + лицензии пакетов |
| E | `publish-pvrg-public-spec-an42` | PVRG schema + lite scanner + лицензии |
| F | `split-work-graph-core-commercial-packs-an42` | граница core vs commercial packs |
| G | `trademark-conformance-policy-an42` | trademark, «BVC-compatible», PUBLIC_API |
| H | `legal-hygiene-public-release-an42` | LICENSE, SECURITY, PRIVACY по пакетам |
| I | `review-patent-defensive-publication-an42` | решение по patent / defensive publication |
| J | `ci-guard-private-paths-npm-pack-an42` | CI: private paths не попадают в npm pack |
| K | `write-an42-closing-work-graph-open-publication` | закрытие разбора AN-42 |

## Критерий завершения

- ADR принят; пакеты размечены public/private
- BVC, IR, PVRG имеют опубликованные draft specs и лицензии на code
- Work Graph core имеет явную лицензию; commercial packs вынесены или помечены
- Trademark/conformance policy и legal hygiene docs на месте
- CI guard для npm pack; разбор AN-42 закрыт итоговой записью
