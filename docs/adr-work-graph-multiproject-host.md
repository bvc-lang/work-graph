# ADR: гибридная модель развёртывания Work Graph (вариант C)

**Статус:** принято  
**Дата:** 2026-06-01  
**Контекст:** [AN-40](../work/analytics/work-graph-project-deployment-model.md)  
**Эпик:** `epic-work-graph-multiproject-host`

## Решение

Принят **гибрид (вариант C)**:

1. **Канон проекта** (`intent/`, `charter/`, `architecture/main.bvc`, `.work-graph/config.json`) хранится **в git репозитория проекта**.
2. **Движок Work Graph** — один инстанс (CLI / npm-зависимость), не копируется в каждый репо.
3. **Консоль-хост** поднимает один backlog UI, монтирует N корней через реестр `~/.work-graph/workspaces.json` и переключает активный проект без перезапуска процесса.

## Отклонённые варианты

| Вариант | Почему нет |
|---------|------------|
| A — WG встроен в каждый репо | N копий движка, N апдейтов, расхождение версий |
| B — канон только у хоста | нарушает AN-8 («канон рядом с кодом»), ломает офлайн-работу агента в репо |

## Реестр проектов

Файл `~/.work-graph/workspaces.json`, схема `workspaces.v1`:

- `id` — стабильный идентификатор (slug от имени каталога)
- `root` — абсолютный путь
- `label` — имя в UI
- `lastOpenedAt` — для сортировки

Pilot: только локальные корни; git remote и multi-user — позже.

## Runtime

- Переменная `WG_PROJECT_ROOT` — стартовый корень при запуске UI
- `GET /api/workspaces`, `POST /api/workspace/switch`, `POST /api/workspace/register`
- Backlog UI читает `intent/**` из **активного** `repoRoot`
- `buildArchitectureSnapshot({ repoRoot })` — карта архитектуры следует активному проекту

## CLI

`packages/work-graph-cli`: `init`, `register`, `ui`.

## Анти-цели

- Не дублировать полный WG в каждый репозиторий
- Не держать N процессов на порту 4177
- Не прятать канон проекта от агента в sidecar-only режиме

## Последствия

- Оператор подключает второй репо через `work-graph register` и переключается в UI
- Тесты и runbook обязательны до закрытия AN-40
