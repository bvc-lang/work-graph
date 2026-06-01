#!/usr/bin/env node
/**
 * Seed WorkItems from analytics AN-4 (lit-flow graph canvas, n8n-class UX).
 * Idempotent: skips existing work.id.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS_REF = 'analytics:graph-visualization-engine';
const ANALYTICS_KEY = 'AN-4';
const ANALYTICS_BODY = 'work/analytics/graph-visualization-engine.md';
const EPIC_ID = 'implement-lit-flow-graph-canvas-v1';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'внедрить lit-flow graph canvas (UX как n8n)',
    department: 'frontend-ui',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'high',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: ['implement-graph-canvas-pipeline-full-view-modes'],
    basis: [
      `Источник: аналитика ${ANALYTICS_REF} (${ANALYTICS_KEY}).`,
      'Вердикт AN-4: без промежуточного custom SVG-scroll — сразу lit-flow (@xyflow/system + Lit Web Components), как n8n на Vue Flow.',
      'Mermaid только docs/export; product canvas = интерактивные HTML-узлы + pan/zoom + minimap.',
      ANALYTICS_BODY,
    ],
    vector: [
      'Единый graph canvas runtime на lit-flow для Architecture, Schematic, Intent roadmap.',
      'dagre/elk → positions → flow nodes; клик по узлу → drawer (task / block / intent).',
      'Удалить legacy HTML+SVG renderers после миграции всех трёх view.',
    ],
    goal: [
      'Operator получает n8n-class canvas: pan/zoom, fitView, кликабельные карточки, keyboard lineage — один engine на все graph views.',
    ],
    checks: [
      'Architecture / Schematic / Intent roadmap рендерятся через lit-flow island',
      'npm test и UI smoke проходят без legacy static canvas',
      'AN-4 relatedWorkItems показывает epic и подзадачи',
    ],
    targetFiles: [
      'work/analytics/graph-visualization-engine.md',
      'protocols/graph-canvas-lit-flow-v1.bvc',
      'src/graphCanvasLitFlow/',
      'src/workGraphBacklogUiServer.mjs',
      'package.json',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'design-graph-canvas-lit-flow-v1',
    title: 'спроектировать graph canvas lit-flow v1 (protocol + render contract)',
    department: 'frontend-ui',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}), Phase B — protocol и render contract.`,
      'Зафиксировать границу: server snapshot JSON → client lit-flow mount → custom node types → drawer events.',
    ],
    vector: [
      'protocols/graph-canvas-lit-flow-v1.bvc: node kinds, edge kinds, viewport, layoutDirection, manualOverrides.',
      'schemas/graph-canvas-lit-flow-projection.v1.json — payload для client island.',
      'Mapping текущих architecture/schematic/intent models в единый GraphCanvasProjection.',
    ],
    goal: [
      'Контракт lit-flow canvas согласован; миграция views не требует ad-hoc JSON в UI server.',
    ],
    checks: [
      'protocol описывает mount contract и event bridge (node-click → drawer)',
      'schema проходит validate',
      'документирован отказ от Mermaid runtime UI',
    ],
    targetFiles: [
      'protocols/graph-canvas-lit-flow-v1.bvc',
      'schemas/graph-canvas-lit-flow-projection.v1.json',
      ANALYTICS_BODY,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'implement-lit-flow-package-and-build',
    title: 'подключить lit-flow и client bundle для graph canvas',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['design-graph-canvas-lit-flow-v1'],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}).`,
      'Зависимости: lit, @xyflow/system, lit-flow (или @ghchinoy/litflow); сборка client chunk для backlog UI.',
    ],
    vector: [
      'npm deps + vite/esbuild entry src/graphCanvasLitFlow/mountGraphCanvasLitFlow.ts.',
      'Экспорт window.__WORKGRAPH_MOUNT_GRAPH_CANVAS__ для workGraphBacklogUiServer.',
      'Dev/prod bundle size gate; без Vue/React в основном SSR shell.',
    ],
    goal: [
      'Client island собирается и монтируется на пустой host div в backlog UI.',
    ],
    checks: [
      'npm run build (или backlog:ui client step) включает lit-flow chunk',
      'smoke: mount на fixture projection без ошибок в console',
    ],
    targetFiles: [
      'package.json',
      'package-lock.json',
      'src/graphCanvasLitFlow/mountGraphCanvasLitFlow.ts',
      'vite.config.graph-canvas.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'implement-lit-flow-custom-node-cards',
    title: 'реализовать custom Lit-узлы (карточки architecture / intent / work)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-lit-flow-package-and-build'],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}).`,
      'Карточки должны сохранить тёмную тему Cursor и data-* атрибуты для drawer routing.',
    ],
    vector: [
      'Lit components: GraphBlockNode, GraphIntentNode, GraphWorkNode — CSS из --cursor-* / intent-canvas-node.',
      'node-click → CustomEvent с nodeId, kind, taskId/intentId/blockId.',
      'Selected / rejected / done states как в текущем canvas.',
    ],
    goal: [
      'Клик по карточке на lit-flow canvas открывает тот же drawer, что и сейчас.',
    ],
    checks: [
      'unit test на node template render',
      'e2e или manual: click work node → task drawer',
    ],
    targetFiles: [
      'src/graphCanvasLitFlow/nodes/',
      'src/workGraphBacklogUiServer.mjs',
      'src/style.css',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'implement-graph-canvas-dagre-to-flow-adapter',
    title: 'реализовать adapter dagre layout → lit-flow nodes/edges',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-lit-flow-package-and-build', 'design-graph-canvas-lit-flow-v1'],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}).`,
      'Переиспользовать dagreGraphLayout.mjs и layout profile overrides из AN-1.',
    ],
    vector: [
      'graphCanvasProjectionToFlow(projection) → { nodes, edges, viewport }.',
      'LR/TB из layout profile; rejected/upstream edge styles.',
      'fitView on mount; сохранять manualOverrides после drag (optional phase).',
    ],
    goal: [
      'Любой GraphCanvasProjection автоматически раскладывается и отображается в lit-flow.',
    ],
    checks: [
      'tests/graphCanvasLitFlowAdapter.test.mjs покрывает LR intent branch fixture',
      'layout quality metrics из AN-1 не регрессируют',
    ],
    targetFiles: [
      'src/graphCanvasLitFlow/graphCanvasProjectionToFlow.ts',
      'src/dagreGraphLayout.mjs',
      'src/graphCanvasLayout.mjs',
      'tests/graphCanvasLitFlowAdapter.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'migrate-architecture-map-lit-flow',
    title: 'мигрировать карту архитектуры на lit-flow canvas',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'high',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-lit-flow-custom-node-cards', 'implement-graph-canvas-dagre-to-flow-adapter'],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}).`,
      'Заменить renderArchitectureCanvas (HTML+SVG) на lit-flow mount + Pipeline/Full toggle.',
    ],
    vector: [
      'API /api/architecture-snapshot → GraphCanvasProjection → client mount.',
      'Сохранить graph-canvas-mode-toggle full/pipeline.',
      'Удалить дубли edge geometry из architectureLayout после cutover.',
    ],
    goal: [
      'Вкладка «Дорожная карта» / architecture panel использует lit-flow с pan/zoom.',
    ],
    checks: [
      'workGraphBacklogUiServer.test.mjs обновлён под lit-flow host',
      'Pipeline и Full graph переключаются без reload',
    ],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'src/architectureLayout.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'migrate-schematic-view-lit-flow',
    title: 'мигрировать схему (schematic) на lit-flow canvas',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'high',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['migrate-architecture-map-lit-flow'],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}).`,
      'Schematic view — второй потребитель того же runtime; переиспользовать nodes/adapter.',
    ],
    vector: [
      'buildSchematicViewModel → GraphCanvasProjection → lit-flow.',
      'Upstream/dashed edges и storage layer через edge type mapping.',
    ],
    goal: [
      'Вкладка «Схема» на lit-flow; клик по блоку → drawer L2.',
    ],
    checks: [
      'schematic panel рендерит lit-flow host',
      'npm test schematic/layout не регрессируют на fixture',
    ],
    targetFiles: [
      'src/schematicView.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'migrate-intent-roadmap-lit-flow',
    title: 'мигрировать intent roadmap canvas на lit-flow',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-lit-flow-custom-node-cards', 'implement-graph-canvas-dagre-to-flow-adapter'],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}).`,
      'Intent roadmap уже на dagre LR — первый кандидат для проверки adapter до architecture/schematic.',
    ],
    vector: [
      'branch.canvas → GraphCanvasProjection → lit-flow; сохранить LR и rejected option styling.',
      'Клик work/intent node → openTaskDetails / intent drawer.',
    ],
    goal: [
      'Intent roadmap panel на lit-flow с pan/zoom; без legacy intent-canvas SVG.',
    ],
    checks: [
      'intentRoadmapCanvas.test.mjs + UI: 4 options, selected path, subtasks',
      'data-testid intent-roadmap-canvas указывает на lit-flow host',
    ],
    targetFiles: [
      'src/intentRoadmapCanvas.mjs',
      'src/intentRoadmapProjection.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'tests/intentRoadmapCanvas.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'implement-graph-canvas-lineage-keyboard-nav',
    title: 'реализовать keyboard lineage nav и highlight (n8n parity)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['migrate-intent-roadmap-lit-flow'],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}).`,
      'n8n useCanvasTraversal: upstream/downstream/siblings для keyboard selection.',
    ],
    vector: [
      'graphCanvasTraversal.ts: getIncoming/Outgoing/Upstream/Downstream от selected node.',
      'Arrow keys + Enter → drawer; highlight lineage path на edges.',
    ],
    goal: [
      'Operator navigates graph with keyboard как на n8n canvas.',
    ],
    checks: [
      'unit tests traversal на fixture graph',
      'focused node visible after pan (fitView partial)',
    ],
    targetFiles: [
      'src/graphCanvasLitFlow/graphCanvasTraversal.ts',
      'tests/graphCanvasTraversal.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'implement-graph-canvas-minimap-controls',
    title: 'добавить minimap и canvas controls (fitView, zoom)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['migrate-architecture-map-lit-flow'],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}).`,
      'n8n: Background + MiniMap + Controls panels из vue-flow ecosystem.',
    ],
    vector: [
      'flow-background dots; flow-minimap; zoom in/out/fit buttons.',
      'Единый компонент для всех graph views.',
    ],
    goal: [
      'Большие графы navigable через minimap и controls.',
    ],
    checks: [
      'minimap отображается на architecture и intent roadmap',
      'fitView центрирует выбранную ветку',
    ],
    targetFiles: [
      'src/graphCanvasLitFlow/GraphCanvasControls.ts',
      'src/workGraphBacklogUiServer.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'remove-legacy-static-graph-canvas',
    title: 'удалить legacy HTML+SVG graph canvas renderers',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [
      'migrate-architecture-map-lit-flow',
      'migrate-schematic-view-lit-flow',
      'migrate-intent-roadmap-lit-flow',
      'implement-graph-canvas-lineage-keyboard-nav',
    ],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}).`,
      'После cutover удалить renderIntentRoadmapCanvas SVG paths, architecture inline edge geometry duplication.',
    ],
    vector: [
      'Удалить мёртвый CSS .intent-canvas-edges где заменён lit-flow.',
      'Оставить dagreGraphLayout + projection builders; убрать только legacy DOM render.',
      'Обновить tests и docs AN-4 todo.',
    ],
    goal: [
      'Один render path — lit-flow; нет параллельного static canvas кода.',
    ],
    checks: [
      'grep не находит renderIntentRoadmapCanvas SVG builder в UI server',
      'npm test green',
    ],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'src/intentRoadmapCanvas.mjs',
      'src/architectureLayout.mjs',
      'work/analytics/graph-visualization-engine.md',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
];

async function main() {
  const cwd = process.cwd();
  const existing = new Set((await readWorkItemsFromRepo({ cwd })).map((item) => item.id));
  let created = 0;
  let skipped = 0;

  for (const task of TASKS) {
    if (existing.has(task.workId)) {
      skipped += 1;
      console.log(`skip ${task.workId}`);
      continue;
    }

    const result = await createWorkItem(task, { cwd });
    existing.add(task.workId);
    created += 1;
    console.log(`created ${result.workId} → ${result.path}`);
  }

  console.log(JSON.stringify({
    schema: 'workgraph.seed-graph-visualization-engine-tasks.v1',
    analyticsRef: ANALYTICS_REF,
    epicId: EPIC_ID,
    created,
    skipped,
    total: TASKS.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
