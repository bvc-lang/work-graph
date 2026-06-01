#!/usr/bin/env node
/**
 * Seed WorkItems from analytics AN-5 (SVG edge router, n8n parity).
 * Idempotent: skips existing work.id.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS_REF = 'analytics:graph-edges-n8n-parity';
const ANALYTICS_KEY = 'AN-5';
const ANALYTICS_BODY = 'work/analytics/graph-edges-n8n-parity.md';
const EPIC_ID = 'implement-graph-canvas-svg-edges-v1';

const TASKS = [
  {
    workId: EPIC_ID,
    title: 'гибрид SVG edges для graph canvas (n8n parity)',
    department: 'frontend-ui',
    ownerRole: 'frontend_architect',
    priority: 'high',
    risk: 'high',
    status: 'backlog',
    itemKind: 'epic',
    dependsOn: ['implement-lit-flow-graph-canvas-v1'],
    basis: [
      `Источник: аналитика ${ANALYTICS_REF} (${ANALYTICS_KEY}).`,
      'Root cause: lit-flow flow-edge игнорирует vertical handles → smoothstep рисует L-образные линии.',
      'Вердикт AN-5: variant C — lit-flow только nodes/viewport; рёбра через SVG overlay + graphCanvasEdgeRouter.',
      ANALYTICS_BODY,
      'docs/plan-graph-edges-n8n-parity.md',
    ],
    vector: [
      'Единый edge router для Architecture, Schematic, Intent roadmap.',
      'SVG overlay синхронизируется с viewport transform lit-flow.',
      'Скрыть native flow-edges-layer; labels через buildGraphCanvasEdgeLabelHtml.',
    ],
    goal: [
      'Operator видит читаемые bezier/vertical edges как в n8n, без crooked lit-flow smoothstep.',
    ],
    checks: [
      'Intent roadmap: vertical decision→work без параллельных горизонтальных артефактов',
      'Architecture/schematic: LR spine + vertical stacks',
      'npm test graphCanvasEdgeRouter + intentRoadmapCanvas green',
    ],
    targetFiles: [
      'work/analytics/graph-edges-n8n-parity.md',
      'docs/plan-graph-edges-n8n-parity.md',
      'src/graphCanvasLitFlow/graphCanvasEdgeRouter.mjs',
      'src/graphCanvasLitFlow/client/graphCanvasSvgEdges.ts',
      'src/graphCanvasLitFlow/client/mountGraphCanvasLitFlow.ts',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'implement-graph-canvas-edge-router',
    title: 'реализовать graphCanvasEdgeRouter (intent + architecture lanes)',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: [EPIC_ID],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}), C1.`,
      'Обобщить intentRoadmapEdgeGeometry; intentRoadmapCanvas re-export для backward compat.',
    ],
    vector: [
      'buildGraphCanvasEdgeGeometry + buildGraphCanvasEdgeRoutes(projection).',
      'LR horizontal spine, vertical parent→child cubic, hide «подзадача» label on vertical.',
    ],
    goal: [
      'Router покрывает intent roadmap и generic projection nodes с x/y/width/height.',
    ],
    checks: [
      'tests/graphCanvasEdgeRouter.test.mjs: horizontal LR + vertical stack',
      'intentRoadmapCanvas.test.mjs edge geometry не регрессирует',
    ],
    targetFiles: [
      'src/graphCanvasLitFlow/graphCanvasEdgeRouter.mjs',
      'src/intentRoadmapCanvas.mjs',
      'tests/graphCanvasEdgeRouter.test.mjs',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'implement-graph-canvas-svg-edge-overlay',
    title: 'реализовать SVG edge overlay в mountGraphCanvasLitFlow',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'high',
    risk: 'medium',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-graph-canvas-edge-router'],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}), C2–C3.`,
      'Overlay под flow-canvas (z-index), sync viewport via FlowInstance.subscribe.',
    ],
    vector: [
      'graphCanvasSvgEdges.ts: mount/unmount/repaint, marker-end arrows, edge labels.',
      'injectFlowCanvasNativeEdgeHide — скрыть flow-edges-layer и flow-labels-overlay.',
      'canvas.setEdges([]) — lit-flow только nodes.',
    ],
    goal: [
      'Все graph views рендерят рёбра через SVG overlay, не через lit-flow flow-edge.',
    ],
    checks: [
      'data-testid graph-canvas-svg-edges присутствует в DOM',
      'npm run build:graph-canvas-lit-flow без ошибок',
      'manual: intent roadmap edges readable',
    ],
    targetFiles: [
      'src/graphCanvasLitFlow/client/graphCanvasSvgEdges.ts',
      'src/graphCanvasLitFlow/client/mountGraphCanvasLitFlow.ts',
      'src/graphCanvasLitFlow/client/graphCanvasTheme.css',
      'public/graph-canvas-lit-flow.js',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'verify-graph-edges-all-views',
    title: 'проверить SVG edges на architecture / schematic / intent roadmap',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    itemKind: 'subtask',
    parentId: EPIC_ID,
    dependsOn: ['implement-graph-canvas-svg-edge-overlay'],
    basis: [
      `Источник: ${ANALYTICS_REF} (${ANALYTICS_KEY}).`,
      'Regression pass на трёх graph views после cutover.',
    ],
    vector: [
      'Manual smoke: full-screen canvas, pan/zoom, rejected/upstream dashed edges.',
      'Обновить plan todo и AN-5 status при закрытии epic.',
    ],
    goal: [
      'Все три view визуально соответствуют n8n edge quality из AN-5.',
    ],
    checks: [
      'Architecture pipeline/full toggle edges OK',
      'Schematic upstream dashed edges OK',
      'Intent roadmap 4 options + work stack edges OK',
    ],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'docs/plan-graph-edges-n8n-parity.md',
      'work/analytics/graph-edges-n8n-parity.md',
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
    schema: 'workgraph.seed-graph-edges-n8n-parity-tasks.v1',
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
