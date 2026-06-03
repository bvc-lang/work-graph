# AN-48: Открытые UI-библиотеки для agent chat — что встроить в ioHasC / WG

**Запрос:** «Может есть готовые открытые аналоги, которые можно встроить?» — в контексте одного окна, чата с tool cards, дифов и облачного SDK (см. [AN-47](iohasc-agent-stack-port-eval.md), [AN-46](work-graph-agent-sdks-integration.md)).

**Связи:** [AN-47](iohasc-agent-stack-port-eval.md) (ioHasC stack, не переносить orchestrator), [AN-46](work-graph-agent-sdks-integration.md) (SDK), задачи `deprecate-nlux-agent-chat-ui`, `design-agent-chat-ui-library-adoption`, протокол `operator-agent-run-panel-v1.bvc`.

---

## Кратко

**Да, открытые аналоги есть**, но почти все — **React-остров или целое приложение**, а не «один script = Cursor». Generic-чат **NLUX в WG уже пробовали и сняли**: не тянет tool cards, diff workflow, approve.

| Слой | Лучший кандидат | Куда ставить |
|------|-----------------|--------------|
| Чат + tool UI + approve | **assistant-ui** (OSS) | React-island в **ioHasC** |
| Generative UI + MCP Apps | **CopilotKit** (OSS core) | ioHasC, если нужен richer UI |
| Inline diff Accept/Reject | **Monaco DiffEditor** | ioHasC (уже есть Monaco) |
| Оркестратор backend | **свой** `orchestrator.js` | не менять на LangGraph ради UI |
| Пульт задач | **WG embed** | split/iframe, не второй чат |

**WG не строит чат** — MCP + Agent Run panel (канон из ADR и charter).

---

## 1. Почему «готовый чат» — не равно Cursor

Cursor Composer = **чат + tool loop + inline diff + Memories + IDE**. Открытые библиотеки закрывают в основном **ленту сообщений и рендер tool calls**. Оркестратор, файловая система, LSP, PVRG — **остаются вашими**.

WG уже зафиксировал провал generic-UI:

| Факт | Источник |
|------|----------|
| NLUX не тянет tool cards / diff / approve | `deprecate-nlux-agent-chat-ui.work.bvc` |
| MCP-first вместо своего agent chat | `design-workgraph-mcp-client-strategy.work.bvc` |
| Agent Run panel ≠ свободный чат | `operator-agent-run-panel-v1.bvc` |
| Тест: нет NLUX в backlog UI | `workGraphBacklogUiServer.test.mjs` |

---

## 2. Чат + tool cards + human-in-the-loop

| Проект | Лицензия | Сильные стороны | Ограничения |
|--------|----------|-----------------|-------------|
| **[assistant-ui](https://www.assistant-ui.com/)** | OSS (MIT) | Composable primitives; **Tool UI** (`makeAssistantToolUI`); approve workflows; стрим, markdown; интеграции LangGraph / Vercel AI SDK | **React**; backend адаптер свой |
| **[CopilotKit](https://www.copilotkit.ai/)** | OSS core | Generative UI; AG-UI protocol; **MCP Apps** middleware; `useRenderTool` | React; тяжелее; свой runtime-слой |
| **[Chainlit](https://chainlit.io/)** | Apache-2.0 | Чат + tools «из коробки» для Python-агентов | Backend на Python; не vanilla WG dashboard |
| **NLUX** | OSS | Vanilla-friendly | **Отвергнут в WG** — см. §1 |

**Рекомендация:** для ioHasC — **assistant-ui** как frontend-island (прецедент: `AgentPanelToolbar.jsx` уже React). CopilotKit — если нужен MCP Apps / generative UI поверх того же orchestrator.

---

## 3. Дифы (отдельный слой)

| Проект | Назначение | Где |
|--------|------------|-----|
| **Monaco DiffEditor** | Inline сравнение двух версий файла | ioHasC — **доработать** `confirmAgentWrite` (сейчас always `true`) |
| **react-diff-view**, **diff2html** | Карточки +/- в чате | Замена/дополнение `lineDiff.js` |
| **difftastic** (CLI) | Красивый diff в логах/CI | sidecar, раздел «Проверки» WG |

**Готового пакета «Cursor diff one-click» нет** — типичная связка: Monaco diff + свой слой approve.

---

## 4. Целые приложения (iframe — не библиотека)

| Проект | Что это | Вердикт |
|--------|---------|---------|
| **[Open WebUI](https://github.com/open-webui/open-webui)** | Self-hosted ChatGPT | Замена продукта, не embed-слой |
| **[LibreChat](https://github.com/danny-avila/LibreChat)** | Multi-model chat hub | То же |
| **[OpenCode](https://opencode.ai/)** | Open agent + IDE/CLI | MCP-мост; не виджет чата |
| **Continue.dev** | Extension для VS Code/Cursor | Не embed в ioHasC |

Iframe целого приложения = **второй продукт в окне**, разрыв с WG-каноном и `.bvc`.

---

## 5. Backend-оркестраторы (UI отдельно)

| Проект | Роль |
|--------|------|
| **LangGraph** + assistant-ui | Граф состояний + UI |
| **Vercel AI SDK** | Transport + tools; UI свой |
| **Mastra** | Agent framework + UI hooks |

ioHasC уже имеет **orchestrator.js + ~91 tool** ([AN-47](iohasc-agent-stack-port-eval.md)). Замена backend на LangGraph = **переписывание**, не «встроить UI». Рационально: **адаптер** orchestrator → event stream для assistant-ui.

---

## 6. Рекомендуемая схема (одно окно)

```
ioHasC
├── assistant-ui island — лента чата + Tool UI (writeFile, WG, …)
├── Monaco DiffEditor — Accept/Reject перед записью
├── orchestrator.js — без замены
├── agentLlmGateway — + SDK transport (AN-46/47)
└── WG panel — split / iframe пульт

Work Graph
├── MCP @work-graph/mcp
├── Agent Run panel (задача → прогон)
└── без NLUX / без второго чата
```

---

## 7. Матрица: взять / отложить / не брать

| Компонент | Решение | Куда |
|-----------|---------|------|
| assistant-ui | **взять** (P1) | ioHasC React-island |
| CopilotKit | **отложить** (P2) | если нужен MCP Apps UI |
| NLUX | **не брать** | провал в WG |
| Open WebUI / LibreChat | **не брать** | iframe-замена продукта |
| LangGraph как orchestrator | **не брать** | свой orchestrator достаточен |
| Monaco diff + approve | **взять** (P1) | ioHasC |
| Chainlit | **не брать** | Python stack |
| WG embed | **взять** (P0) | одно окно без :4177 в браузере |

---

## 8. Рекомендации

| ID | Смысл |
|----|--------|
| **R1** | Не повторять NLUX в WG; чат-UI только в **ioHasC**. |
| **R2** | Пилот **assistant-ui**: один Tool UI для `writeFile` (diff + approve) + один для WG snapshot. |
| **R3** | Orchestrator оставить; написать **тонкий адаптер** событий orchestrator → assistant-ui runtime. |
| **R4** | WG — embed пульт + MCP; Cursor-пользователи — MCP без embed-чата. |
| **R5** | Эпик «одно окно»: P0 WG split в ioHasC; P1 assistant-ui island; P2 CopilotKit только по необходимости. |

---

## 9. Дорожная карта

| P | Задача | Оценка |
|---|--------|--------|
| **P0** | Fullscreen/split WG в ioHasC (`workGraphDashboardMount` → bundled UI) | 1–2 нед |
| **P1** | Spike: assistant-ui island + mock orchestrator events | 3–5 дней |
| **P1** | Monaco DiffEditor + `confirmAgentWrite` с реальным approve | 1 нед |
| **P1** | Адаптер orchestrator stream → assistant-ui | 2 нед |
| **P2** | CopilotKit / MCP Apps — только если assistant-ui не хватает | TBD |
| **—** | NLUX, Open WebUI iframe, LangGraph migration | **не делать** |

---

## 10. Риски

| Риск | Митигация |
|------|-----------|
| React-island vs vanilla ioHasC | Уже есть React в agent toolbar; изолировать bundle (Vite island) |
| Два источника правды чата | IndexedDB ioHasC + WG — только task-bound через MCP |
| «Снова Cursor-lite» | Scope: UI слой только; tools/orchestrator не переписывать |
| Лицензии CopilotKit cloud | OSS core локально; cloud optional |

---

**См. также:** [AN-47](iohasc-agent-stack-port-eval.md), [AN-46](work-graph-agent-sdks-integration.md), [docs/workgraph-mcp-client-strategy.md](../../docs/workgraph-mcp-client-strategy.md), [assistant-ui Tool UI docs](https://www.assistant-ui.com/docs/guides/tool-ui).
