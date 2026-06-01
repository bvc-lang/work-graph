#!/usr/bin/env node
/**
 * Seed WorkItems from analytics AN-1 section C (layout as part of model).
 * Idempotent: skips existing work.id.
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';

const ANALYTICS_REF = 'analytics:graph-canvas-layout-mess';
const ANALYTICS_KEY = 'AN-1';
const ANALYTICS_BODY = 'work/analytics/graph-canvas-layout-mess.md';

const TASKS = [
  {
    workId: 'design-graph-canvas-layout-profile-v1',
    title: 'спроектировать layout profile v1 для graph canvas (.bvc / snapshot)',
    department: 'frontend-ui',
    ownerRole: 'frontend_architect',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    dependsOn: ['implement-schematic-visualization-view-mvp', 'implement-architecture-map-l1-mvp'],
    basis: [
      `Источник: аналитика ${ANALYTICS_REF} (AN-1), блок C п.8 — layout как часть модели Work Graph.`,
      'Сейчас POSITIONS захардкожены в schematicView.mjs и architectureLayout.mjs; нет версионируемого layout.profile в snapshot.',
      ANALYTICS_BODY,
    ],
    vector: [
      'Описать protocols/graph-canvas-layout-profile-v1.bvc и schemas/graph-canvas-layout-profile.v1.json.',
      'Зафиксировать поля layout.profile, layout.ranks, layout.manualOverrides и mapping в architecture/schematic snapshot.',
      'Определить default auto-layout preset (layered-dag-v1) и правила merge override поверх engine output.',
    ],
    goal: [
      'Канон layout profile v1 согласован с derived snapshot; агент может добавить profile в .bvc без правки UI-кода.',
    ],
    checks: [
      'protocols/graph-canvas-layout-profile-v1.bvc описывает profile, ranks и overrides',
      'schemas/graph-canvas-layout-profile.v1.json проходит lint/validate',
      'mapping snapshot ↔ step labels документирован',
    ],
    targetFiles: [
      'protocols/graph-canvas-layout-profile-v1.bvc',
      'schemas/graph-canvas-layout-profile.v1.json',
      'schemas/architecture-snapshot.v1.json',
      'src/schematicView.mjs',
      'src/architectureSnapshot.mjs',
      ANALYTICS_BODY,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'implement-graph-canvas-layout-profile-v1',
    title: 'реализовать layout profile v1 в snapshot и graph canvas engine',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'high',
    status: 'backlog',
    dependsOn: ['design-graph-canvas-layout-profile-v1'],
    basis: [
      `Источник: ${ANALYTICS_REF} (AN-1), блок C п.8 — auto-layout по умолчанию, manualOverrides для презентации.`,
      'Требует закрытого design-graph-canvas-layout-profile-v1 и рабочего layout engine (dagre/elk или graphCanvasLayout.mjs из блока B).',
    ],
    vector: [
      'Расширить buildArchitectureSnapshot / buildSchematicViewModel: читать layoutProfile из step labels или snapshot extension.',
      'Применить layered layout + manualOverrides поверх node placement; убрать дубли POSITIONS где profile задан.',
      'Единый graphCanvasLayout.mjs: rank → place → route hooks; Схема и Дорожная карта используют один profile pipeline.',
    ],
    goal: [
      'UI рендерит graph canvas из snapshot с layoutProfile; override col/row сохраняется в каноне, не в localStorage.',
    ],
    checks: [
      'snapshot содержит layoutProfile v1 для architecture и schematic',
      'manualOverrides применяются поверх auto-layout',
      'npm test покрывает profile parse и placement merge',
    ],
    targetFiles: [
      'src/graphCanvasLayout.mjs',
      'src/architectureSnapshot.mjs',
      'src/architectureLayout.mjs',
      'src/schematicView.mjs',
      'src/workGraphBacklogUiServer.mjs',
      'tests/graphCanvasLayout.test.mjs',
      'protocols/graph-canvas-layout-profile-v1.bvc',
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'implement-graph-canvas-pipeline-full-view-modes',
    title: 'реализовать режимы Pipeline и Full graph на вкладке схемы/архитектуры',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'medium',
    status: 'backlog',
    dependsOn: ['implement-graph-canvas-layout-profile-v1'],
    basis: [
      `Источник: ${ANALYTICS_REF} (AN-1), блок C п.9 — одна перегруженная схема смешивает pipeline и fan-in/fan-out.`,
      'Дорожная карта одновременно показывает main path, domain sidecars и upstream rebuilds; нужны два режима одной вкладки.',
    ],
    vector: [
      'Добавить переключатель Pipeline / Full graph в UI (Дорожная карта и/или Схема).',
      'Pipeline: 5–7 узлов main path, одна линия, profile pipeline-v1.',
      'Full graph: все блоки + upstream/dashed edges, profile layered-dag-v1 из layout profile.',
    ],
    goal: [
      'Operator переключает режим без смены вкладки; каждый режим использует свой layout profile preset.',
    ],
    checks: [
      'переключатель Pipeline / Full graph доступен в UI',
      'Pipeline mode скрывает sidecar/upstream clutter',
      'Full graph mode показывает все nodes/edges с auto-layout',
      'e2e или unit test на переключение режима',
    ],
    targetFiles: [
      'src/workGraphBacklogUiServer.mjs',
      'src/architectureSnapshot.mjs',
      'src/schematicView.mjs',
      'src/graphCanvasLayout.mjs',
      'tests/workGraphBacklogUiServer.test.mjs',
      ANALYTICS_BODY,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
  {
    workId: 'implement-graph-canvas-layout-quality-snapshot-test',
    title: 'добавить snapshot-тест качества layout graph canvas в CI',
    department: 'frontend-ui',
    ownerRole: 'feature_engineer',
    priority: 'medium',
    risk: 'low',
    status: 'backlog',
    dependsOn: ['implement-graph-canvas-layout-profile-v1'],
    basis: [
      `Источник: ${ANALYTICS_REF} (AN-1), блок C п.10 — метрики edge_crossings, min_gap, no_label_under_node в CI.`,
      'Без автоматической проверки layout регрессии снова ловятся только глазами.',
    ],
    vector: [
      'Вычислять метрики на fixture snapshot (architecture + schematic): edge_crossings ≤ N, min_gap ≥ 24px, labels не под nodes.',
      'Добавить tests/graphCanvasLayoutQuality.test.mjs и включить в npm test / ci:mandatory.',
      'Сохранять golden metrics или threshold gate; при изменении profile — explicit snapshot update.',
    ],
    goal: [
      'CI падает при деградации layout quality; изменения POSITIONS/profile сопровождаются осознанным обновлением gate.',
    ],
    checks: [
      'tests/graphCanvasLayoutQuality.test.mjs проходит на текущем baseline',
      'метрики edge_crossings, min_gap, label_overlap документированы',
      'npm run ci включает layout quality gate',
    ],
    targetFiles: [
      'tests/graphCanvasLayoutQuality.test.mjs',
      'tests/fixtures/graph-canvas-layout/',
      'src/graphCanvasLayout.mjs',
      'package.json',
      ANALYTICS_BODY,
    ],
    intakeSourceKind: 'analytics-record',
    intakeSourceRef: ANALYTICS_REF,
    analyticsKey: ANALYTICS_KEY,
  },
];

async function main() {
  const existing = await readWorkItemsFromRepo({ cwd: process.cwd() });
  const existingIds = new Set(existing.map((item) => item.id));

  let created = 0;
  let skipped = 0;

  for (const task of TASKS) {
    if (existingIds.has(task.workId)) {
      skipped += 1;
      console.log(`skip ${task.workId} (exists)`);
      continue;
    }

    const result = await createWorkItem(task, { cwd: process.cwd() });
    existingIds.add(task.workId);
    created += 1;
    console.log(`created ${result.workId} → ${result.path}`);
  }

  console.log(JSON.stringify({
    schema: 'workgraph.seed-graph-canvas-layout-canon-tasks.v1',
    analyticsRef: ANALYTICS_REF,
    created,
    skipped,
    total: TASKS.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
