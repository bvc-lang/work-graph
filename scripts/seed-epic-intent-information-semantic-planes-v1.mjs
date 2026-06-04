#!/usr/bin/env node
/**
 * Seed: AN-65 + AN-68 — информационная и смысловая плоскости WG (навигация, MCP, UI).
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const PLAN = 'docs/plan-intent-information-semantic-planes-v1.md';
const AN65 = 'work/analytics/work-graph-intent-information-plane.md';
const AN68 = 'work/analytics/work-graph-semantic-plane.md';
const EPIC_ID = 'epic-intent-information-semantic-planes-v1';

const UPSTREAM = [
  'implement-mcp-get-unified-linkage',
  'implement-full-semantic-search-workflow',
];

function ruAnalysis(lines) {
  return lines.join('\n');
}

function ruDecision(lines) {
  return lines.join('\n');
}

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'Информационная и смысловая плоскости WG v1 (AN-65, AN-68)',
    department: 'product',
    ownerRole: 'system_architect',
    priority: 'high',
    risk: 'high',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: UPSTREAM,
    basis: [
      'Разборы AN-65 и AN-68: WG и BVC уже образуют информационную и смысловую плоскости, но навигация размазана по отдельным MCP-инструментам и вкладкам UI.',
      'Информационная плоскость отвечает на вопрос «как связаны задачи, код, доказательства и аналитика»; смысловая — «насколько реализация совпадает с намерением в Basis/Vector/Goal».',
      'Нет единого query_intent_plane для обхода графа по контрактам и нет semantic navigator (дрейф, вакуумы, контекстный срез для агента).',
    ],
    vector: [
      'P0: ADR границ двух плоскостей + plan; канон узлов/рёбер; MCP query_intent_plane и semantic P0 (field, drift, context slice).',
      'P1: UI — граф плоскости и heatmap дрейфа поверх тех же проекций.',
      'P2: temporal snapshots, find_semantic_voids, resolve_semantic_conflict — после стабилизации P0/P1.',
    ],
    goal: [
      'Оператор и агент перемещаются по проекту по контрактам BVC и связям, а не только по списку задач и полнотекстовому поиску.',
    ],
    checks: [
      'ADR и plan опубликованы',
      'query_intent_plane и semantic MCP P0 доступны в workgraph-mcp',
      'npm run test:deterministic green',
    ],
    analysis: ruAnalysis([
      'Зачем:',
      'Без явного слоя навигации оператор теряет целостную картину: linkage, RAG и semantic_search работают изолированно.',
      'Контекст: AN-65 задаёт топологию и evidence; AN-68 — alignment и эволюцию понимания поверх той же плоскости.',
      'Когда:',
      `После готовности upstream: ${UPSTREAM.join(', ')}.`,
      'Готово, когда:',
      'MCP и UI MVP позволяют пройти сценарии из разборов (архитектор, разработчик, агент в scope).',
    ]),
    decision: ruDecision([
      'Вердикт:',
      'полезно',
      'Один эпик с двумя фазами: сначала информационная плоскость (структура), затем смысловая (измерение смысла).',
      'Не смешивать с wiki/Notion и не давать агенту свободный обход вне scope задачи.',
    ]),
    targetFiles: [PLAN, AN65, AN68, 'docs/adr-intent-information-semantic-planes-v1.md'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: AN65,
    analyticsKey: 'AN-65',
  },
  {
    workId: 'decide-intent-information-semantic-planes-adr',
    title: 'ADR: границы информационной и смысловой плоскости WG',
    department: 'product',
    ownerRole: 'system_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      'AN-65 и AN-68 используют разную терминологию; без ADR команда смешает «граф связей» и «семантическое поле».',
      'Нужны anti-goals: не wiki, не cross-repo federation в v1, не свободный crawl агента.',
    ],
    vector: [
      'docs/adr-intent-information-semantic-planes-v1.md — определения, измерения (семантика, топология, состояние, evidence, время).',
      'Таблица: Information Plane vs Semantic Plane; какие MCP к какой плоскости относятся.',
      'Связь с get_unified_linkage, graph RAG, semantic_search (наследие, не дублирование).',
    ],
    goal: [
      'Любая последующая задача эпика ссылается на один ADR вместо пересказа разборов в каждой подзадаче.',
    ],
    checks: [
      'ADR принят в docs/',
      'В plan есть ссылка на ADR',
      'Anti-goals явно перечислены',
    ],
    analysis: ruAnalysis([
      'Зачем:',
      'Без зафиксированных границ легко построить «ещё один граф» вместо контрактной плоскости исполнения.',
      'Готово, когда:',
      'ADR читается человеком без знания AN-65/AN-68 и даёт однозначные ответы «что в v1, что отложено».',
    ]),
    decision: ruDecision([
      'Вердикт:',
      'полезно',
      'Принять ADR до спецификаций MCP — иначе query_intent_plane и semantic tools разъедутся.',
    ]),
    targetFiles: ['docs/adr-intent-information-semantic-planes-v1.md', AN65, AN68, PLAN],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: AN65,
    analyticsKey: 'AN-65',
  },
  {
    workId: 'author-plan-intent-information-semantic-planes-v1',
    title: 'Plan: дорожная карта плоскостей v1 (P0→P1→P2)',
    department: 'product',
    ownerRole: 'product_manager',
    priority: 'high',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['decide-intent-information-semantic-planes-adr'],
    basis: [
      'AN-65 § «Рекомендуемая структура» и AN-68 §7–8 требуют plan с фазами и зависимостями между MCP и UI.',
    ],
    vector: [
      'Расширить docs/plan-intent-information-semantic-planes-v1.md: владельцы, порядок подзадач, критерии приёмки P0.',
      'Явно указать зависимость semantic P0 от query_intent_plane / linkage index.',
    ],
    goal: [
      'Оператор видит один plan на весь эпик; подзадачи бэклога соответствуют фазам plan.',
    ],
    checks: ['Plan синхронизирован с подзадачами эпика', 'P0/P1/P2 разделены'],
    targetFiles: [PLAN, 'docs/adr-intent-information-semantic-planes-v1.md'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: AN65,
    analyticsKey: 'AN-65',
  },
  {
    workId: 'design-intent-plane-canonical-model-v1',
    title: 'Канон: узлы, рёбра и измерения информационной плоскости',
    department: 'system-runtime',
    ownerRole: 'system_architect',
    priority: 'high',
    risk: 'high',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['decide-intent-information-semantic-planes-adr'],
    basis: [
      'AN-65 описывает плоскость как многомерный граф (семантика, топология, состояние, доказательность, время), но нет protocols/* канона для query API.',
      'Сейчас связи живут в unified linkage и UI-проекциях без единого идентификатора «узла плоскости».',
    ],
    vector: [
      'protocols/intent-information-plane-v1.bvc или docs — node kinds: work, epic, analytics, evidence, file, intent_node.',
      'Edge kinds: depends_on, implements, verified_by, traces_to, feeds_epic, parent_of.',
      'Направления навигации: upstream, downstream, lateral, temporal (контракт, не реализация).',
    ],
    goal: [
      'query_intent_plane и UI-граф используют один словарь узлов и рёбер; нет ad hoc полей в каждом MCP.',
    ],
    checks: [
      'Документ/протокол описывает node и edge kinds',
      'Примеры JSON для startNode + direction + depth',
    ],
    targetFiles: [
      'protocols/intent-information-plane-v1.bvc',
      'docs/adr-intent-information-semantic-planes-v1.md',
      AN65,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: AN65,
    analyticsKey: 'AN-65',
  },
  {
    workId: 'specify-query-intent-plane-mcp-v1',
    title: 'Спецификация MCP: query_intent_plane',
    department: 'system-runtime',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['design-intent-plane-canonical-model-v1'],
    basis: [
      'AN-65 предлагает единый навигационный API: startNode, direction, filters (tier, status, domain), depth, returnFormat.',
      'Сейчас оператор собирает картину вручную из get_unified_linkage и нескольких вкладок UI.',
    ],
    vector: [
      'docs/spec-query-intent-plane-mcp-v1.md — JSON schema запроса/ответа, примеры upstream/downstream/lateral.',
      'Ограничения для агента: max depth, allowed node kinds, read-only.',
      'Матрица: какие фильтры мапятся на labels work_item и evidence.',
    ],
    goal: [
      'Разработчик MCP реализует query_intent_plane без повторного согласования формата с продуктом.',
    ],
    checks: [
      'Spec содержит ≥3 примера вызовов',
      'Описаны коды ошибок и пустой граф',
    ],
    targetFiles: ['docs/spec-query-intent-plane-mcp-v1.md', AN65, PLAN],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: AN65,
    analyticsKey: 'AN-65',
  },
  {
    workId: 'implement-intent-plane-linkage-index-v1',
    title: 'Runtime: материализованный индекс связей для плоскости',
    department: 'system-runtime',
    ownerRole: 'backend_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID, ...UPSTREAM],
    basis: [
      'AN-65 §2: при росте графа запросы «все соседи work X» не должны каждый раз полностью пересобирать linkage из атомов.',
      'unifiedLinkageProjection уже есть — нужен adjacency slice для навигации с depth и direction.',
    ],
    vector: [
      'src/intentPlaneLinkageIndex.mjs — build из unified linkage + work items + analytics refs.',
      'Кэш/снимок в derived projection; инвалидация при backlog revision.',
      'Unit-тесты: upstream от work к AN и evidence.',
    ],
    goal: [
      'query_intent_plane читает предвычисленный индекс за O(соседи), а не сканирует весь бэклог.',
    ],
    checks: [
      'tests/intentPlaneLinkageIndex.test.mjs green',
      'Индекс содержит parent_of и depends_on',
    ],
    targetFiles: [
      'src/intentPlaneLinkageIndex.mjs',
      'src/unifiedLinkageProjection.mjs',
      'tests/intentPlaneLinkageIndex.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: AN65,
    analyticsKey: 'AN-65',
  },
  {
    workId: 'implement-query-intent-plane-mcp-v1',
    title: 'MCP: query_intent_plane — навигация по структуре',
    department: 'system-runtime',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['specify-query-intent-plane-mcp-v1', 'implement-intent-plane-linkage-index-v1'],
    basis: [
      'После индекса и спецификации нужен рабочий MCP tool для агентов и eval-сценариев из AN-65.',
    ],
    vector: [
      'packages/workgraph-mcp — tool query_intent_plane + handler.',
      'Ответ: json и markdown; фильтры tier/status/domain.',
      'Документация в docs/public-site при необходимости.',
    ],
    goal: [
      'Вызов query_intent_plane из Cursor возвращает связанный подграф для текущей задачи или AN.',
    ],
    checks: [
      'tests/workgraph-mcp покрывают happy path',
      'Направления upstream/downstream возвращают разные множества узлов',
    ],
    targetFiles: [
      'packages/workgraph-mcp/src/handlers.mjs',
      'packages/workgraph-mcp/src/index.mjs',
      'src/intentPlaneLinkageIndex.mjs',
      'docs/spec-query-intent-plane-mcp-v1.md',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: AN65,
    analyticsKey: 'AN-65',
  },
  {
    workId: 'design-semantic-plane-metrics-v1',
    title: 'Канон: метрики смыслового выравнивания и дрейфа (AN-68)',
    department: 'product',
    ownerRole: 'system_architect',
    priority: 'high',
    risk: 'high',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['decide-intent-information-semantic-planes-adr'],
    basis: [
      'AN-68 вводит Alignment (Goal vs код/тесты) и drift_score 0..1; без канона MCP даст несопоставимые числа.',
      'Смысл не заменяет gates: низкий alignment — сигнал, истина остаётся в evidence и verify.',
    ],
    vector: [
      'docs/semantic-plane-metrics-v1.md — определения drift, void, conflict.',
      'Какие поля BVC эмбеддятся отдельно: Basis, Vector, Goal.',
      'Пороги для warning в verify / pre-commit (концепт, не обязательно v1 код).',
    ],
    goal: [
      'detect_semantic_drift возвращает интерпретируемый drift_score и список причин, а не «магическое» число.',
    ],
    checks: ['Документ с формулами и примерами', 'Связь с AN-68 §3–4'],
    targetFiles: ['docs/semantic-plane-metrics-v1.md', AN68, 'docs/adr-intent-information-semantic-planes-v1.md'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: AN68,
    analyticsKey: 'AN-68',
  },
  {
    workId: 'specify-semantic-plane-mcp-p0-v1',
    title: 'Спецификация MCP P0: semantic field, drift, context slice',
    department: 'system-runtime',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['design-semantic-plane-metrics-v1'],
    basis: [
      'AN-68 §8.1: пять режимов навигатора; в P0 берём field, drift, context slice (voids и temporal — P1/P2).',
    ],
    vector: [
      'docs/spec-semantic-plane-mcp-p0-v1.md — query_semantic_field, detect_semantic_drift, get_context_slice.',
      'Входы/выходы, лимиты токенов для context slice, связь с agent scope (AN-57).',
      'Опционально resource workgraph://semantic/{scope}.',
    ],
    goal: [
      'Три MCP-инструмента можно реализовать параллельно без споров о контракте.',
    ],
    checks: ['Spec описывает все три tool', 'Есть пример для агента «правлю валидатор»'],
    targetFiles: ['docs/spec-semantic-plane-mcp-p0-v1.md', AN68, 'docs/semantic-plane-metrics-v1.md'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: AN68,
    analyticsKey: 'AN-68',
  },
  {
    workId: 'implement-query-semantic-field-mcp-v1',
    title: 'MCP: query_semantic_field — смысловой поиск по плоскости',
    department: 'system-runtime',
    ownerRole: 'backend_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['specify-semantic-plane-mcp-p0-v1', 'implement-full-semantic-search-workflow'],
    basis: [
      'AN-68: «покажи всё про платежный шлюз» — задачи, код и AN с семантическим весом, не только keyword.',
      'semantic_search workflow уже есть — расширяем ранжирование на BVC-поля и типы узлов плоскости.',
    ],
    vector: [
      'Handler query_semantic_field: q, scope, depth → ranked nodes + edges.',
      'Переиспользовать semanticSearchWorkflow + intent plane node kinds.',
      'Тесты на фикстурном бэклоге.',
    ],
    goal: [
      'Агент получает смысловой срез по запросу без чтения всего репозитория.',
    ],
    checks: [
      'MCP tool зарегистрирован',
      'Ответ содержит work_id и analytics_key где релевантно',
    ],
    targetFiles: [
      'packages/workgraph-mcp/src/handlers.mjs',
      'packages/workgraph-mcp/src/index.mjs',
      'src/semanticSearchWorkflow.mjs',
      'docs/spec-semantic-plane-mcp-p0-v1.md',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: AN68,
    analyticsKey: 'AN-68',
  },
  {
    workId: 'implement-detect-semantic-drift-mcp-v1',
    title: 'MCP: detect_semantic_drift — расхождение намерения и кода',
    department: 'system-runtime',
    ownerRole: 'backend_engineer',
    priority: 'high',
    risk: 'high',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['specify-semantic-plane-mcp-p0-v1', 'implement-query-semantic-field-mcp-v1'],
    basis: [
      'AN-68: «где код ушёл от плана AN-40» — нужен drift_score и объяснение (Goal vs diff + тесты).',
      'Без drift агент может сдать синтаксически верный, но смыслово неверный код.',
    ],
    vector: [
      'implement-detect-semantic-drift: work_id | scope → drift_score, violations[], summary_ru.',
      'v1: эвристики BVC Goal + target_files + git diff scope (без тяжёлого LLM на каждый вызов).',
      'Связь с evidence types для failed checks.',
    ],
    goal: [
      'Техлид видит задачи с drift выше порога; агент может вызвать tool перед assert_ready.',
    ],
    checks: [
      'drift_score в диапазоне 0..1',
      'Тест на задаче с заведомо устаревшим Basis',
    ],
    targetFiles: [
      'src/semanticDrift.mjs',
      'packages/workgraph-mcp/src/handlers.mjs',
      'tests/semanticDrift.test.mjs',
      'docs/semantic-plane-metrics-v1.md',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: AN68,
    analyticsKey: 'AN-68',
  },
  {
    workId: 'implement-get-context-slice-mcp-v1',
    title: 'MCP: get_context_slice — контрактный пакет контекста для агента',
    department: 'system-runtime',
    ownerRole: 'integration_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-query-semantic-field-mcp-v1', 'implement-query-intent-plane-mcp-v1'],
    basis: [
      'AN-68 §8.3: агенту нужен ограниченный пакет BVC + прошлые ошибки + allowlist, а не весь репо.',
      'Связь с get_pvrg_task_scope и graph RAG — объединить в один slice по work_id.',
    ],
    vector: [
      'get_context_slice(work_id, agent_role) → { bvc_excerpt, linkage_subgraph, semantic_neighbors, deny_patterns }.',
      'Лимит размера ответа; приоритет tier A evidence.',
      'Документировать в spec и public-site mcp-tools.',
    ],
    goal: [
      'Промпт агента наполняется срезом плоскости вместо ручного набора MCP-вызовов.',
    ],
    checks: [
      'Slice не превышает заданный лимит байт',
      'В slice есть Basis/Vector/Goal текущей задачи',
    ],
    targetFiles: [
      'src/semanticContextSlice.mjs',
      'packages/workgraph-mcp/src/handlers.mjs',
      'src/pvrgTaskScope.mjs',
      'docs/spec-semantic-plane-mcp-p0-v1.md',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: AN68,
    analyticsKey: 'AN-68',
  },
  {
    workId: 'design-intent-plane-ui-graph-v1',
    title: 'ADR+макет: UI граф информационной плоскости',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['specify-query-intent-plane-mcp-v1'],
    basis: [
      'AN-65 §3: визуализация — узлы BVC, рёбра связей, цвет tier/status; клик открывает контракт и evidence.',
      'graph canvas (lit-flow) уже используется в architecture и intent roadmap.',
    ],
    vector: [
      'docs/adr-intent-plane-ui-graph-v1.md — вкладка или режим «Плоскость», источник данных query_intent_plane API.',
      'Контекстная панель: work contract, evidence list, переход в drawer.',
    ],
    goal: [
      'Оператор видит подграф плоскости без ручного сборки linkage в голове.',
    ],
    checks: ['ADR описывает UX-сценарий архитектора', 'Указан API backend для графа'],
    targetFiles: ['docs/adr-intent-plane-ui-graph-v1.md', AN65, 'src/graphCanvasLitFlow/'],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: AN65,
    analyticsKey: 'AN-65',
  },
  {
    workId: 'implement-intent-plane-graph-view-mvp',
    title: 'UI MVP: граф информационной плоскости в dashboard',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['design-intent-plane-ui-graph-v1', 'implement-query-intent-plane-mcp-v1'],
    basis: [
      'После MCP и ADR UI остаётся единственным местом, где плоскость не видна целостно.',
    ],
    vector: [
      'GET /api/intent-plane/graph?start=&direction=&depth=',
      'Вкладка или panel в workGraphBacklogUiServer; lit-flow projection.',
      'e2e smoke: открыть граф от выбранной задачи.',
    ],
    goal: [
      'Клик по узлу в графе открывает task/analytics drawer как в остальном UI.',
    ],
    checks: [
      'API возвращает nodes/edges',
      'UI рендерит ≥10 узлов без падения',
    ],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'src/intentPlaneLinkageIndex.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
      'docs/adr-intent-plane-ui-graph-v1.md',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: AN65,
    analyticsKey: 'AN-65',
  },
  {
    workId: 'implement-find-semantic-voids-mcp-v1',
    title: 'MCP: find_semantic_voids — смысловые дыры (P1)',
    department: 'system-runtime',
    ownerRole: 'backend_engineer',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-query-intent-plane-mcp-v1', 'implement-query-semantic-field-mcp-v1'],
    basis: [
      'AN-68: код без BVC-намерения и висящие AN без work — зоны техдолга смысла.',
    ],
    vector: [
      'find_semantic_voids(domain, tier) → files_without_work, work_without_evidence, orphan_analytics.',
      'Скан на основе linkage index + file index (PVRG).',
    ],
    goal: [
      'Техлид получает список voids для приоритизации intake в бэклог.',
    ],
    checks: ['Tool возвращает непустой список на тестовой фикстуре', 'Нет ложных void на тестовых файлах'],
    targetFiles: [
      'src/semanticVoids.mjs',
      'packages/workgraph-mcp/src/handlers.mjs',
      'tests/semanticVoids.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: AN68,
    analyticsKey: 'AN-68',
  },
  {
    workId: 'implement-semantic-drift-heatmap-ui-v1',
    title: 'UI: heatmap дрейфа смысла по scope (P1)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-detect-semantic-drift-mcp-v1', 'implement-intent-plane-graph-view-mvp'],
    basis: [
      'AN-68 §8.2: сценарий «где смысл-долг» — heatmap зон с высоким drift, не только список задач.',
    ],
    vector: [
      'Панель или overlay на графе: цвет узла = drift_score.',
      'Batch API или кэш drift по epic/domain.',
    ],
    goal: [
      'Архитектор видит «выгоревшие» зоны без вызова MCP вручную для каждой задачи.',
    ],
    checks: ['Heatmap легенда и пороги', 'Клик узла показывает drift summary'],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'src/semanticDrift.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: AN68,
    analyticsKey: 'AN-68',
  },
  {
    workId: 'write-closing-epic-intent-information-semantic-planes-v1',
    title: 'Closing: epic-intent-information-semantic-planes-v1',
    department: 'product',
    ownerRole: 'product_manager',
    priority: 'low',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      'implement-query-intent-plane-mcp-v1',
      'implement-get-context-slice-mcp-v1',
      'implement-intent-plane-graph-view-mvp',
    ],
    basis: [
      'После P0/P1 нужен closing по канону эпика с evidence и ссылками на AN-65/AN-68.',
    ],
    vector: [
      'work/analytics/closing-epic-intent-information-semantic-planes-v1.md',
      'Запись в analytics-records.jsonl при закрытии.',
    ],
    goal: [
      'Эпик можно закрыть с воспроизводимым итогом для оператора.',
    ],
    checks: [
      'Closing doc опубликован',
      'P0 MCP перечислены в итоге',
    ],
    targetFiles: [
      'work/analytics/closing-epic-intent-information-semantic-planes-v1.md',
      PLAN,
      AN65,
      AN68,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: AN65,
    analyticsKey: 'AN-65',
  },
];

async function main() {
  const existing = await readWorkItemsFromRepo({ root: process.cwd() });
  const existingIds = new Set(existing.map((item) => item.id));
  let created = 0;

  for (const task of TASKS) {
    if (existingIds.has(task.workId)) {
      console.log(`skip ${task.workId}`);
      continue;
    }

    await createWorkItem({
      workId: task.workId,
      title: task.title,
      department: task.department,
      ownerRole: task.ownerRole,
      priority: task.priority,
      risk: task.risk,
      status: task.status,
      itemKind: task.itemKind,
      parentId: task.parentId,
      dependsOn: task.dependsOn?.join(', '),
      basis: task.basis.join('\n'),
      vector: task.vector.join('\n'),
      goal: task.goal.join('\n'),
      checks: task.checks.join('\n'),
      analysis: typeof task.analysis === 'string' ? task.analysis : task.analysis?.join('\n'),
      decision: typeof task.decision === 'string' ? task.decision : task.decision?.join('\n'),
      targetFiles: task.targetFiles.join(', '),
      intakeSourceKind: task.intakeSourceKind,
      intakeSourceRef: task.intakeSourceRef,
      analyticsKey: task.analyticsKey,
    }, { root: process.cwd() });

    console.log(`created ${task.workId}`);
    created += 1;
  }

  console.log(JSON.stringify({
    schema: 'workgraph.seed-epic-intent-information-semantic-planes-v1.v1',
    epicId: EPIC_ID,
    analyticsKeys: ['AN-65', 'AN-68'],
    created,
    totalTasks: TASKS.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
