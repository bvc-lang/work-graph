#!/usr/bin/env node
/**
 * Repair analytics ↔ backlog linkage gaps (2026-06 audit):
 * - journal keys for AN-1..4
 * - seed AN-65, AN-68, AN-66 (app-update)
 * - positioning reference epic + intake subtasks
 */
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';
import { createWorkItem } from '../packages/workgraph-mcp/src/handlers.mjs';
import {
  appendAnalyticsRecordJournal,
  readAnalyticsRecordJournal,
} from '../src/analyticsRecordStore.mjs';
import { seedAnalyticsRecord } from '../src/seedAnalyticsRecord.mjs';

const EPIC_ID = 'epic-iohasc-positioning-reference-v1';

const JOURNAL_KEY_PATCHES = [
  { id: 'analytics:graph-canvas-layout-mess', key: 'AN-1' },
  { id: 'analytics:parent-subtask-hierarchy', key: 'AN-2' },
  { id: 'analytics:intent-graph-storage-roadmap', key: 'AN-3' },
  { id: 'analytics:graph-visualization-engine', key: 'AN-4' },
];

const POSITIONING_INTAKES = [
  {
    workId: 'intake-reference-an11-gbc-gfs',
    analyticsKey: 'AN-11',
    sourceRef: 'analytics:gbc-gfs-binary-slice-overlay',
    bodyPath: 'work/analytics/gbc-gfs-binary-slice-overlay.md',
    title: 'Intake (reference): AN-11 GBC+GFS — positioning catalog',
  },
  {
    workId: 'intake-reference-an12-gvm-sbg',
    analyticsKey: 'AN-12',
    sourceRef: 'analytics:gvm-sbg-mandate-wasm-runtime',
    bodyPath: 'work/analytics/gvm-sbg-mandate-wasm-runtime.md',
    title: 'Intake (reference): AN-12 GVM+SBG Mandate — positioning catalog',
  },
  {
    workId: 'intake-reference-an13-uncertainty-barrier',
    analyticsKey: 'AN-13',
    sourceRef: 'analytics:uncertainty-barrier-shannon-metric',
    bodyPath: 'work/analytics/uncertainty-barrier-shannon-metric.md',
    title: 'Intake (reference): AN-13 Uncertainty Barrier — positioning catalog',
  },
  {
    workId: 'intake-reference-an14-compiler-round-trip',
    analyticsKey: 'AN-14',
    sourceRef: 'analytics:compiler-round-trip-low-code-scaffold',
    bodyPath: 'work/analytics/compiler-round-trip-low-code-scaffold.md',
    title: 'Intake (reference): AN-14 Compiler Round-Trip — positioning catalog',
  },
  {
    workId: 'intake-reference-an15-unique-tech-overview',
    analyticsKey: 'AN-15',
    sourceRef: 'analytics:other-unique-technologies-overview',
    bodyPath: 'work/analytics/other-unique-technologies-overview.md',
    title: 'Intake (reference): AN-15 Unique tech overview — positioning catalog',
  },
  {
    workId: 'intake-reference-an31-promptpilot-comparison',
    analyticsKey: 'AN-31',
    sourceRef: 'analytics:promptpilot-claude-note-vs-work-graph',
    bodyPath: 'work/analytics/promptpilot-claude-note-vs-work-graph.md',
    title: 'Intake (reference): AN-31 PromptPilot vs WG — comparison catalog',
  },
  {
    workId: 'intake-reference-an41-desktop-exe-packaging',
    analyticsKey: 'AN-41',
    sourceRef: 'analytics:work-graph-desktop-exe-packaging',
    bodyPath: 'work/analytics/work-graph-desktop-exe-packaging.md',
    title: 'Intake (reference): AN-41 Desktop exe packaging — positioning catalog',
  },
  {
    workId: 'intake-reference-an48-open-agent-chat-ui',
    analyticsKey: 'AN-48',
    sourceRef: 'analytics:open-agent-chat-ui-embed-options',
    bodyPath: 'work/analytics/open-agent-chat-ui-embed-options.md',
    title: 'Intake (reference): AN-48 Open agent chat UI — integration catalog',
  },
  {
    workId: 'intake-reference-an49-codebase-volume',
    analyticsKey: 'AN-49',
    sourceRef: 'analytics:work-graph-codebase-volume-rewrite-scope',
    bodyPath: 'work/analytics/work-graph-codebase-volume-rewrite-scope.md',
    title: 'Intake (reference): AN-49 Codebase volume — rewrite scope catalog',
  },
];

async function patchJournalKeys() {
  const journal = await readAnalyticsRecordJournal();
  const byId = new Map(journal.records.map((record) => [record.id, record]));
  const toAppend = [];

  for (const patch of JOURNAL_KEY_PATCHES) {
    const existing = byId.get(patch.id);
    if (!existing) {
      console.warn(`skip key patch: missing ${patch.id}`);
      continue;
    }
    if (existing.key === patch.key) {
      console.log(`skip key patch: ${patch.id} already ${patch.key}`);
      continue;
    }
    toAppend.push({
      ...existing,
      key: patch.key,
      updatedAt: new Date().toISOString(),
    });
    console.log(`patch journal key: ${patch.id} → ${patch.key}`);
  }

  if (toAppend.length > 0) {
    await appendAnalyticsRecordJournal(toAppend);
  }

  return toAppend.length;
}

async function seedMissingJournalRecords() {
  const seeds = [
    {
      body: 'work/analytics/work-graph-intent-information-plane.md',
      key: 'AN-65',
    },
    {
      body: 'work/analytics/work-graph-semantic-plane.md',
      key: 'AN-68',
    },
    {
      body: 'docs/analysis/2026-06-app-update-mechanism.md',
      key: 'AN-66',
      title: 'Механизм обновлений Work Graph — версия, npm, настройки, уведомления',
      query: 'Нужен полноценный механизм обновлений: где хранить версию, npm registry, настройки, проактивные уведомления',
      topic: 'product/distribution',
      tags: ['app-update', 'npm', 'version', 'settings', 'notice-stack', 'AN-66'],
      relatedFiles: [
        'docs/plan-app-update-mechanism-v1.md',
        'intent/ui/dashboard/work/epic-app-update-mechanism-v1.work.bvc',
      ],
    },
  ];

  let appended = 0;
  for (const seed of seeds) {
    const result = await seedAnalyticsRecord({ ...seed, force: true });
    console.log(JSON.stringify(result));
    if (!result.skipped) {
      appended += 1;
    }
  }
  return appended;
}

async function seedPositioningReferenceWorkItems() {
  const existing = await readWorkItemsFromRepo({ root: process.cwd() });
  const existingIds = new Set(existing.map((item) => item.id));
  let created = 0;

  if (!existingIds.has(EPIC_ID)) {
    await createWorkItem({
      workId: EPIC_ID,
      title: 'Каталог positioning reference: ioHasC unique tech (AN-11..15, AN-31, AN-41, AN-48, AN-49)',
      department: 'product',
      ownerRole: 'product_manager',
      priority: 'low',
      risk: 'low',
      status: 'done',
      itemKind: 'epic',
      basis: [
        'AN-11..15: positioning reference разборы ioHasC unique tech без отдельного production epic v1.',
        'AN-31, AN-41, AN-48, AN-49: standalone reference/comparison — нужна формальная связь с бэклогом.',
        'Цель: оператор видит related work items в UI «Аналитика»; defer до product decision.',
      ].join('\n'),
      vector: [
        'Intake subtasks (done) с intake.analytics_key + intake.source_ref на каждый AN.',
        'Без исполнения — только catalog linkage для discovery и lineage.',
      ].join('\n'),
      goal: [
        'Все positioning/reference AN из аудита 202-06 имеют work item linkage в бэклоге.',
      ].join('\n'),
      checks: [
        '9 intake subtasks created with intake labels',
        'UI analytics panel shows relatedWorkItems for AN-11..15, AN-31, AN-41, AN-48, AN-49',
      ].join('\n'),
      decision: [
        'Вердикт: полезно как reference catalog',
        'Defer productization — revisit via decide-positioning-from-an7 / AN-16 meta-review.',
      ].join('\n'),
      targetFiles: POSITIONING_INTAKES.map((entry) => entry.bodyPath).join(', '),
      intakeSourceKind: 'analytics-record',
      intakeSourceRef: 'analytics:other-unique-technologies-overview',
      analyticsKey: 'AN-15',
    }, { root: process.cwd() });
    console.log(`created ${EPIC_ID}`);
    created += 1;
  } else {
    console.log(`skip ${EPIC_ID}`);
  }

  for (const intake of POSITIONING_INTAKES) {
    if (existingIds.has(intake.workId)) {
      console.log(`skip ${intake.workId}`);
      continue;
    }

    await createWorkItem({
      workId: intake.workId,
      title: intake.title,
      department: 'product',
      ownerRole: 'product_manager',
      priority: 'low',
      risk: 'low',
      status: 'done',
      itemKind: 'subtask',
      parentId: EPIC_ID,
      dependsOn: EPIC_ID,
      basis: [
        `${intake.analyticsKey}: reference positioning/comparison intake — formal backlog linkage.`,
        `Источник: ${intake.sourceRef} (${intake.bodyPath}).`,
      ].join('\n'),
      vector: [
        'Статус done = catalog only; без исполнения до product decision.',
        'См. epic-iohasc-positioning-reference-v1 и AN-16 meta-review.',
      ].join('\n'),
      goal: [
        `${intake.analyticsKey} отображается в relatedWorkItems панели «Аналитика».`,
      ].join('\n'),
      checks: [
        `intake.analytics_key=${intake.analyticsKey}`,
        `intake.source_ref=${intake.sourceRef}`,
      ].join('\n'),
      decision: [
        'Вердикт: defer (reference catalog)',
      ].join('\n'),
      targetFiles: intake.bodyPath,
      intakeSourceKind: 'analytics-record',
      intakeSourceRef: intake.sourceRef,
      analyticsKey: intake.analyticsKey,
    }, { root: process.cwd() });

    console.log(`created ${intake.workId}`);
    created += 1;
  }

  return created;
}

async function main() {
  const keyPatches = await patchJournalKeys();
  const journalSeeds = await seedMissingJournalRecords();
  const workItemsCreated = await seedPositioningReferenceWorkItems();

  console.log(JSON.stringify({
    schema: 'workgraph.repair-analytics-backlog-linkage-v1',
    keyPatches,
    journalSeeds,
    workItemsCreated,
    epicId: EPIC_ID,
  }, null, 2));
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
