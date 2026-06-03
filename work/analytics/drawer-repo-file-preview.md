# AN-59: Предпросмотр файлов репозитория в стеке drawer

**Запрос:** в drawer аналитики и задач есть списки путей (`Related files`, `work.target_files`, ссылки в markdown). Клик по пути (`rules/...bvc`, `protocols/...bvc`, `tests/...mjs`) должен открывать **следующий уровень** detail stack с read-only предпросмотром; для кода — подсветка синтаксиса.

**Статус:** принято, эпик в backlog  
**Эпик:** `epic-drawer-repo-file-preview-v1`  
**План:** [docs/plan-drawer-repo-file-preview-v1.md](../../docs/plan-drawer-repo-file-preview-v1.md)

**Связи:** [AN-54](detail-drawer-stack-modal-queue.md) (detail drawer stack), `epic-detail-drawer-stack-v1` (done), `codeSyntaxHighlight.mjs` (уже в browser bundle), `workGraphBoundedTargetFileRead.mjs` (bounded read для worker). Ключ журнала: **AN-59** (AN-57 занят разбором session warm-up).

---

## Кратко

| Вопрос | Ответ |
|--------|--------|
| Проблема | Пути в `Related files` / `target_files` — plain text `<li>`, не кликабельны; нет frame type для файла |
| Ожидание оператора | Разбор → related file → ещё файл → задача → … без замены уровня 2 (stack push) |
| Решение | Frame `repo-file` + `GET /api/repo-file/preview` + кликабельные ссылки + renderer с syntax highlight |
| Не в v1 | Monaco editor, diff, git blame, открытие в IDE |

---

## 1. Baseline (как сейчас)

### 1.1. Где встречаются пути

| Поверхность | Поле | Рендер сегодня |
|-------------|------|----------------|
| Analytics drawer | `record.relatedFiles` | `renderDetailList` → `<li>plain text</li>` |
| Analytics closing/intake | markdown body | `renderMarkdownDocument` — пути не интерактивны |
| Task drawer | `work.target_files` | accordion list, plain text |
| Task drawer | linkage / PVRG | `<code>path</code>`, без preview |
| Architecture L2 | node.path | text only |

Пример из UI (AN-50 closing): `tests/homeSnapshotProjection.test.mjs`, `e2e/home-mission-control-smoke.spec.js` — **не открываются**.

### 1.2. Detail stack (после fix 2026-06)

- Типы: `task`, `analytics`, `architecture-block`, `architecture-l2`
- Drill-down: `detailStack.push()` без pop (analytics → analytics → task → …)
- L1 = первый кадр; L2 sub-drawer = верхний кадр при `depth ≥ 2`
- Breadcrumb в sub-header для depth > 2

**Разрыв:** нет типа `repo-file`; клик по пути невозможен.

### 1.3. Что уже есть в коде

| Модуль | Роль |
|--------|------|
| `src/codeSyntaxHighlight.mjs` | JS/YAML/bash/plain highlight — уже inline в UI через `markdownDocumentRender` |
| `src/workGraphBoundedTargetFileRead.mjs` | Нормализация пути, allowlist по `targetFiles`, max bytes — **для worker** |
| `src/markdownDocumentRender.mjs` | Markdown + fenced code blocks с highlight |
| `renderDetailList` | Нужна замена на link rows с `data-repo-file-path` |

---

## 2. Целевая модель

### 2.1. Frame type `repo-file`

```json
{
  "schema": "detail-stack.frame.v1",
  "type": "repo-file",
  "key": "tests/homeSnapshotProjection.test.mjs",
  "title": "homeSnapshotProjection.test.mjs",
  "payload": { "repoPath": "tests/homeSnapshotProjection.test.mjs" }
}
```

**Push rules** (как AN-54):

- Клик по пути **внутри открытого drawer** (L1 `#detail-body` или L2 `#detail-sub-body`) → `push(repo-file)` + `renderTopDetailStackFrame()`
- Клик из списка (вне drawer) → опционально L1 preview или только in-drawer v1
- Back / Esc → `pop()` (уже в `popDetailStackNavigation`)

### 2.2. UI preview panel

```
┌─ sub-drawer header ─────────────────────────┐
│ homeSnapshotProjection.test.mjs              │
│ tests/homeSnapshotProjection.test.mjs        │
│ AN-50 › add-home-mission-control-tests › …   │  ← breadcrumb
├──────────────────────────────────────────────┤
│ ← Назад к разбору                            │
│ ┌─ file-meta ─────────────────────────────┐  │
│ │ tests/homeSnapshotProjection.test.mjs   │  │
│ │ 4.2 KB · javascript · read-only         │  │
│ └─────────────────────────────────────────┘  │
│ <pre class="repo-file-preview code-hl">…     │
└──────────────────────────────────────────────┘
```

- BVC/YAML/MD: markdown или code block по расширению
- `.mjs`/`.js`/`.ts`: `highlightCode(source, language)`
- Бинарные / слишком большие: сообщение + truncated hint
- Ошибка 404: «Файл не найден в workspace»

### 2.3. API

`GET /api/repo-file/preview?path=tests/foo.mjs`

| Check | Правило |
|-------|---------|
| Path | relative, no `..`, under active `cwd` / host repo root |
| Size | cap 128 KB (как bounded read) |
| Response | `{ schema, path, language, content, truncated, byteLength }` |
| Security | multiproject: path under **active** workspace root only |

Worker allowlist (`targetFiles`) **не** применять к operator UI preview — оператор читает свой repo; traversal guard достаточен.

### 2.4. Кликабельные ссылки

Единый класс / атрибут:

```html
<button type="button" class="repo-file-link" data-repo-file-path="protocols/decision-pipeline-canon-v1.bvc">…</button>
```

Источники v1:

1. `renderDetailList` / `renderRepoFileList` для `relatedFiles`, `target_files`
2. Delegated click в `handleBoardClick` → `openRepoFileStackPreview(path)`
3. P1: autolink path-like tokens в markdown body (`*.bvc`, `*.{mjs,js,ts,md,yaml}`)

---

## 3. Language detection

| Extension | Highlight |
|-----------|-----------|
| `.mjs`, `.js`, `.cjs` | javascript |
| `.ts`, `.tsx` | typescript (fallback javascript) |
| `.yaml`, `.yml` | yaml |
| `.bvc`, `.md`, `.step` | markdown prose или yaml-like |
| `.json` | javascript/json |
| other | plaintext |

Reuse `normalizeCodeLanguage` from `codeSyntaxHighlight.mjs`.

---

## 4. Риски

| Риск | М mitigation |
|------|----------------|
| Path traversal | `normalizeBoundedTargetPath` reuse |
| Huge files | truncate + banner |
| Multiproject wrong root | `cwd` from host state в API |
| Stack depth UX | breadcrumb уже есть; offset sub-drawer P2 |

---

## 5. Work breakdown

| P | work.id | Суть |
|---|---------|------|
| P0 | `decide-drawer-repo-file-frame-adr` | ADR: frame type + API + push rules |
| P0 | `implement-repo-file-preview-api` | GET preview endpoint + tests |
| P0 | `wire-clickable-repo-file-links-in-drawers` | relatedFiles, target_files → buttons |
| P0 | `implement-repo-file-stack-frame-renderer` | renderer + syntax highlight + stack push |
| P1 | `wire-markdown-inline-repo-file-clicks` | path tokens in analytics/task markdown |
| P1 | `write-closing-epic-drawer-repo-file-preview-v1` | closing doc |

**Seed:**

```bash
npm run seed:analytics-record -- --body work/analytics/drawer-repo-file-preview.md --key AN-59
npm run seed:epic-drawer-repo-file-preview-v1
```

---

## 6. Проверки (acceptance)

- Analytics drawer: клик `tests/homeSnapshotProjection.test.mjs` → L2 preview с highlight
- Из preview-кadra клик другого path → depth +1 (не replace L2)
- Back возвращает на предыдущий кадр stack
- API отклоняет `../etc/passwd`
- `npm run test:deterministic` green

---

## 7. Решение

**Вердикт:** полезно — закрывает разрыв между «ссылки на evidence» и operator drill-down; опирается на готовый stack + syntax highlight.

**Не делать:** полноценный file editor, cross-repo без workspace switch.
