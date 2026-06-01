import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  ANALYTICS_PANEL_PROJECTION_SCHEMA,
  ANALYTICS_RECORDS_API_SCHEMA,
  ANALYTICS_RECORD_KIND_CLOSING,
  ANALYTICS_RECORD_KIND_INTAKE,
  assignAnalyticsRecordKeys,
  attachAnalyticsRecordKind,
  buildAnalyticsPanelProjection,
  buildAnalyticsPanelProjectionFromRecords,
  buildAnalyticsRecordsApiResponse,
  filterAnalyticsRecords,
  filterAnalyticsRecordsByKind,
  inferAnalyticsRecordKind,
  sortAnalyticsRecordsByRecencyDesc,
} from '../src/analyticsPanelProjection.mjs';
import {
  ANALYTICS_RECORD_JOURNAL_SCHEMA,
  appendAnalyticsRecordJournal,
  buildAnalyticsRecord,
  readAnalyticsRecordJournal,
} from '../src/analyticsRecordStore.mjs';

describe('buildAnalyticsRecord', () => {
  it('requires title and query', () => {
    assert.throws(() => buildAnalyticsRecord({ title: 'T' }), /query is required/);
    assert.throws(() => buildAnalyticsRecord({ query: 'Q' }), /title is required/);
  });

  it('builds stable id from slug', () => {
    const record = buildAnalyticsRecord({
      title: 'Graph layout mess',
      query: 'Why messy?',
      slug: 'graph-layout-mess',
    });

    assert.equal(record.id, 'analytics:graph-layout-mess');
    assert.equal(record.schema, 'analytics-record.v1');
  });
});

describe('readAnalyticsRecordJournal', () => {
  it('hydrates body from bodyPath', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'analytics-records-'));
    const journalPath = 'analytics-records.jsonl';
    const bodyPath = 'analytics/sample.md';

    try {
      await mkdir(join(tempDir, 'analytics'), { recursive: true });
      await writeFile(join(tempDir, bodyPath), '# Sample analysis\n\nBody text.', 'utf8');

      await appendAnalyticsRecordJournal([
        buildAnalyticsRecord({
          title: 'Sample',
          query: 'Why?',
          bodyPath,
        }),
      ], journalPath, { cwd: tempDir });

      const journal = await readAnalyticsRecordJournal({ cwd: tempDir, journalPath });
      assert.equal(journal.records.length, 1);
      assert.match(journal.records[0].body, /Body text\./);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('returns empty journal when file missing', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'analytics-records-empty-'));

    try {
      const journal = await readAnalyticsRecordJournal({ cwd: tempDir, journalPath: 'missing.jsonl' });
      assert.equal(journal.entryCount, 0);
      assert.deepEqual(journal.records, []);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe('assignAnalyticsRecordKeys', () => {
  it('assigns stable AN-n keys by createdAt then id', () => {
    const records = [
      { id: 'analytics:b', createdAt: '2026-05-30T12:00:00.000Z', title: 'B' },
      { id: 'analytics:a', createdAt: '2026-05-29T12:00:00.000Z', title: 'A' },
    ];

    const keyed = assignAnalyticsRecordKeys(records);
    assert.deepEqual(
      keyed.map((record) => ({ id: record.id, key: record.key })),
      [
        { id: 'analytics:b', key: 'AN-2' },
        { id: 'analytics:a', key: 'AN-1' },
      ],
    );
  });

  it('preserves explicit key from journal', () => {
    const keyed = assignAnalyticsRecordKeys([
      { id: 'analytics:custom', createdAt: '2026-05-29T12:00:00.000Z', key: 'AN-CUSTOM' },
    ]);

    assert.equal(keyed[0].key, 'AN-CUSTOM');
  });
});

describe('sortAnalyticsRecordsByRecencyDesc', () => {
  it('orders records newest-first by createdAt with id as tie-breaker', () => {
    const ordered = sortAnalyticsRecordsByRecencyDesc([
      { id: 'analytics:a', createdAt: '2026-05-29T12:00:00.000Z' },
      { id: 'analytics:c', createdAt: '2026-05-31T12:00:00.000Z' },
      { id: 'analytics:b', createdAt: '2026-05-30T12:00:00.000Z' },
      { id: 'analytics:c2', createdAt: '2026-05-31T12:00:00.000Z' },
    ]);

    assert.deepEqual(
      ordered.map((record) => record.id),
      ['analytics:c2', 'analytics:c', 'analytics:b', 'analytics:a'],
    );
  });
});

describe('buildAnalyticsPanelProjectionFromRecords ordering', () => {
  it('returns records newest-first while preserving AN-n keys from chronological order', () => {
    const projection = buildAnalyticsPanelProjectionFromRecords([
      { id: 'analytics:old', createdAt: '2026-05-28T12:00:00.000Z', topic: 'general', status: 'published' },
      { id: 'analytics:mid', createdAt: '2026-05-29T12:00:00.000Z', topic: 'general', status: 'published' },
      { id: 'analytics:new', createdAt: '2026-05-30T12:00:00.000Z', topic: 'general', status: 'published' },
    ]);

    assert.deepEqual(
      projection.records.map((record) => record.id),
      ['analytics:new', 'analytics:mid', 'analytics:old'],
    );
    assert.deepEqual(
      projection.records.map((record) => record.key),
      ['AN-3', 'AN-2', 'AN-1'],
    );
  });
});

describe('filterAnalyticsRecords', () => {
  it('filters by topic and applies limit', () => {
    const records = [
      { id: 'a1', topic: 'ui/graph-layout', title: 'A' },
      { id: 'a2', topic: 'general', title: 'B' },
      { id: 'a3', topic: 'ui/graph-layout', title: 'C' },
    ];

    const filtered = filterAnalyticsRecords(records, { topic: 'ui/graph-layout', limit: 1 });
    assert.equal(filtered.records.length, 1);
    assert.equal(filtered.truncated, true);
    assert.equal(filtered.topic, 'ui/graph-layout');
  });
});

describe('inferAnalyticsRecordKind', () => {
  it('classifies closing records by id, bodyPath, and title', () => {
    assert.equal(
      inferAnalyticsRecordKind({
        id: 'analytics:closing-epic-decision-pipeline-canonization',
        title: 'AN-23: Closing — epic-decision-pipeline-canonization',
        bodyPath: 'work/analytics/closing-epic-decision-pipeline-canonization.md',
        tags: ['closing-analysis'],
      }),
      ANALYTICS_RECORD_KIND_CLOSING,
    );
  });

  it('keeps intake that mentions closing-analysis in tags (AN-22)', () => {
    assert.equal(
      inferAnalyticsRecordKind({
        id: 'analytics:pipeline-analysis-to-board',
        title: 'AN-22: Пайплайн — канонизация и обратный контур',
        bodyPath: 'work/analytics/pipeline-analysis-to-board.md',
        tags: ['closing-analysis', 'pipeline'],
      }),
      ANALYTICS_RECORD_KIND_INTAKE,
    );
  });

  it('keeps intake records with feeds_epics (AN-25 pattern)', () => {
    assert.equal(
      inferAnalyticsRecordKind({
        id: 'analytics:agent-bypass-work-graph-dual-backlog',
        title: 'AN-25: Зачем Work Graph',
        bodyPath: 'work/analytics/agent-bypass-work-graph-dual-backlog.md',
        feeds_epics: ['epic-agent-workgraph-enforcement'],
        tags: ['feeds-epic-agent-workgraph-enforcement'],
      }),
      ANALYTICS_RECORD_KIND_INTAKE,
    );
  });

  it('attachAnalyticsRecordKind adds recordKind', () => {
    const record = attachAnalyticsRecordKind({
      id: 'analytics:pipeline-analysis-to-board',
      title: 'AN-22: pipeline',
    });
    assert.equal(record.recordKind, ANALYTICS_RECORD_KIND_INTAKE);
  });

  it('filterAnalyticsRecordsByKind splits intake and closing', () => {
    const records = [
      { id: 'analytics:a', title: 'Intake' },
      { id: 'analytics:closing-epic-x', title: 'Closing', tags: ['closing-analysis'] },
    ];
    assert.equal(filterAnalyticsRecordsByKind(records, ANALYTICS_RECORD_KIND_CLOSING).length, 1);
    assert.equal(filterAnalyticsRecordsByKind(records, ANALYTICS_RECORD_KIND_INTAKE).length, 1);
  });
});

describe('buildAnalyticsPanelProjection', () => {
  it('reads seeded journal from repo work directory', async () => {
    const repoRoot = join(import.meta.dirname, '..');
    const projection = await buildAnalyticsPanelProjection({ cwd: repoRoot });

    assert.equal(projection.schema, ANALYTICS_PANEL_PROJECTION_SCHEMA);
    assert.equal(projection.summary.total, 48);
    assert.equal(projection.summary.byKind?.intake, 36);
    assert.equal(projection.summary.byKind?.closing, 12);
    assert.equal(
      projection.records.find((record) => record.id === 'analytics:pipeline-analysis-to-board')?.recordKind,
      ANALYTICS_RECORD_KIND_INTAKE,
    );
    assert.equal(
      projection.records.find((record) => record.id === 'analytics:closing-epic-decision-pipeline-canonization')?.recordKind,
      ANALYTICS_RECORD_KIND_CLOSING,
    );
    assert.equal(
      projection.records[0]?.id,
      'analytics:open-publication-technology-holdback-strategy',
      'newest analytics record should appear first by default',
    );
    assert.ok(projection.records.some((record) => record.id === 'analytics:pipeline-analysis-to-board'));
    assert.equal(
      projection.records.find((record) => record.id === 'analytics:pipeline-analysis-to-board')?.key,
      'AN-22',
    );
    assert.match(
      projection.records.find((record) => record.id === 'analytics:pipeline-analysis-to-board')?.body ?? '',
      /pipeline_stage|канон|epic[- ]?decision[- ]?pipeline/i,
    );
    assert.equal(
      projection.records[projection.records.length - 1]?.id,
      'analytics:graph-canvas-layout-mess',
      'oldest analytics record (AN-1) should appear last by default',
    );
    assert.ok(projection.records.some((record) => record.id === 'analytics:graph-canvas-layout-mess'));
    assert.ok(projection.records.some((record) => record.id === 'analytics:parent-subtask-hierarchy'));
    assert.ok(projection.records.some((record) => record.id === 'analytics:intent-graph-storage-roadmap'));
    assert.ok(projection.records.some((record) => record.id === 'analytics:graph-visualization-engine'));
    assert.ok(projection.records.some((record) => record.id === 'analytics:graph-edges-n8n-parity'));
    assert.ok(projection.records.some((record) => record.id === 'analytics:product-self-audit-tech'));
    assert.ok(projection.records.some((record) => record.id === 'analytics:product-self-audit-user'));
    assert.ok(projection.records.some((record) => record.id === 'analytics:step-as-open-canon-standard'));
    assert.ok(projection.records.some((record) => record.id === 'analytics:ir-rich-ir-open-canon'));
    assert.ok(projection.records.some((record) => record.id === 'analytics:pvrg-verified-reference-graph'));
    assert.ok(projection.records.some((record) => record.id === 'analytics:gbc-gfs-binary-slice-overlay'));
    assert.ok(projection.records.some((record) => record.id === 'analytics:gvm-sbg-mandate-wasm-runtime'));
    assert.ok(projection.records.some((record) => record.id === 'analytics:uncertainty-barrier-shannon-metric'));
    assert.ok(projection.records.some((record) => record.id === 'analytics:compiler-round-trip-low-code-scaffold'));
    assert.ok(projection.records.some((record) => record.id === 'analytics:other-unique-technologies-overview'));
    assert.ok(projection.records.some((record) => record.id === 'analytics:unique-tech-stack-meta-review'));
    assert.ok(projection.records.some((record) => record.id === 'analytics:onebase-integration-vertical-stack'));
    assert.ok(projection.records.some((record) => record.id === 'analytics:bvc-naming-branding-review'));
    assert.ok(projection.records.some((record) => record.id === 'analytics:bvc-multilingual-keys-design'));
    assert.ok(projection.records.some((record) => record.id === 'analytics:ux-current-state-and-vector'));
    assert.ok(projection.records.some((record) => record.id === 'analytics:marketplace-integration-and-shared-design-system'));
    assert.equal(
      projection.records.find((record) => record.id === 'analytics:graph-canvas-layout-mess')?.key,
      'AN-1',
    );
    assert.equal(
      projection.records.find((record) => record.id === 'analytics:parent-subtask-hierarchy')?.key,
      'AN-2',
    );
    assert.equal(
      projection.records.find((record) => record.id === 'analytics:intent-graph-storage-roadmap')?.key,
      'AN-3',
    );
    assert.equal(
      projection.records.find((record) => record.id === 'analytics:graph-visualization-engine')?.key,
      'AN-4',
    );
    assert.equal(
      projection.records.find((record) => record.id === 'analytics:graph-edges-n8n-parity')?.key,
      'AN-5',
    );
    assert.equal(
      projection.records.find((record) => record.id === 'analytics:product-self-audit-tech')?.key,
      'AN-6',
    );
    assert.equal(
      projection.records.find((record) => record.id === 'analytics:product-self-audit-user')?.key,
      'AN-7',
    );
    assert.equal(
      projection.records.find((record) => record.id === 'analytics:step-as-open-canon-standard')?.key,
      'AN-8',
    );
    assert.equal(
      projection.records.find((record) => record.id === 'analytics:ir-rich-ir-open-canon')?.key,
      'AN-9',
    );
    assert.equal(
      projection.records.find((record) => record.id === 'analytics:pvrg-verified-reference-graph')?.key,
      'AN-10',
    );
    assert.equal(
      projection.records.find((record) => record.id === 'analytics:gbc-gfs-binary-slice-overlay')?.key,
      'AN-11',
    );
    assert.equal(
      projection.records.find((record) => record.id === 'analytics:gvm-sbg-mandate-wasm-runtime')?.key,
      'AN-12',
    );
    assert.equal(
      projection.records.find((record) => record.id === 'analytics:uncertainty-barrier-shannon-metric')?.key,
      'AN-13',
    );
    assert.equal(
      projection.records.find((record) => record.id === 'analytics:compiler-round-trip-low-code-scaffold')?.key,
      'AN-14',
    );
    assert.equal(
      projection.records.find((record) => record.id === 'analytics:other-unique-technologies-overview')?.key,
      'AN-15',
    );
    assert.equal(
      projection.records.find((record) => record.id === 'analytics:unique-tech-stack-meta-review')?.key,
      'AN-16',
    );
    assert.equal(
      projection.records.find((record) => record.id === 'analytics:onebase-integration-vertical-stack')?.key,
      'AN-17',
    );
    assert.equal(
      projection.records.find((record) => record.id === 'analytics:bvc-naming-branding-review')?.key,
      'AN-18',
    );
    assert.equal(
      projection.records.find((record) => record.id === 'analytics:bvc-multilingual-keys-design')?.key,
      'AN-19',
    );
    assert.equal(
      projection.records.find((record) => record.id === 'analytics:ux-current-state-and-vector')?.key,
      'AN-20',
    );
    assert.equal(
      projection.records.find((record) => record.id === 'analytics:marketplace-integration-and-shared-design-system')?.key,
      'AN-21',
    );
    assert.match(
      projection.records.find((record) => record.id === 'analytics:bvc-multilingual-keys-design')?.body ?? '',
      /Detect-or-Declare/,
    );
    assert.match(
      projection.records.find((record) => record.id === 'analytics:ux-current-state-and-vector')?.body ?? '',
      /(?:mission[- ]control|центр[- ]управления)/i,
    );
    assert.match(
      projection.records.find((record) => record.id === 'analytics:marketplace-integration-and-shared-design-system')?.body ?? '',
      /atomic[- ]?design/i,
    );
    assert.match(
      projection.records.find((record) => record.id === 'analytics:bvc-naming-branding-review')?.body ?? '',
      /\.bvc` — лучший кандидат/,
    );
    assert.match(
      projection.records.find((record) => record.id === 'analytics:unique-tech-stack-meta-review')?.body ?? '',
      /Step-Canon Stack/,
    );
    assert.match(
      projection.records.find((record) => record.id === 'analytics:onebase-integration-vertical-stack')?.body ?? '',
      /OneBase.*ранн/i,
    );
    assert.match(
      projection.records.find((record) => record.id === 'analytics:pvrg-verified-reference-graph')?.body ?? '',
      /AI-agent code map для MCP/,
    );
    assert.match(
      projection.records.find((record) => record.id === 'analytics:gbc-gfs-binary-slice-overlay')?.body ?? '',
      /overlay-VFS поверх дискового дерева/,
    );
    assert.match(
      projection.records.find((record) => record.id === 'analytics:gvm-sbg-mandate-wasm-runtime')?.body ?? '',
      /политик.*мандат|mandate-policy gating/i,
    );
    assert.match(
      projection.records.find((record) => record.id === 'analytics:uncertainty-barrier-shannon-metric')?.body ?? '',
      /Runtime барьер для прозы/,
    );
    assert.match(
      projection.records.find((record) => record.id === 'analytics:compiler-round-trip-low-code-scaffold')?.body ?? '',
      /trace-driven codegen/,
    );
    assert.match(
      projection.records.find((record) => record.id === 'analytics:other-unique-technologies-overview')?.body ?? '',
      /Trace-Links v1/,
    );
    assert.match(
      projection.records.find((record) => record.id === 'analytics:product-self-audit-tech')?.body ?? '',
      /Монолит UI-сервера/,
    );
    assert.match(
      projection.records.find((record) => record.id === 'analytics:product-self-audit-user')?.body ?? '',
      /позиционирование отсутствует/,
    );
    assert.match(
      projection.records.find((record) => record.id === 'analytics:step-as-open-canon-standard')?.body ?? '',
      /@bvc\/parser/,
    );
    assert.match(
      projection.records.find((record) => record.id === 'analytics:step-as-open-canon-standard')?.body ?? '',
      /Detect-or-Declare/,
    );
    assert.match(
      projection.records.find((record) => record.id === 'analytics:ir-rich-ir-open-canon')?.body ?? '',
      /AI-agent reasoning trace IR/,
    );
    assert.match(
      projection.records.find((record) => record.id === 'analytics:graph-canvas-layout-mess')?.body ?? '',
      /Почему получается «каша»/,
    );
    const an1Related = projection.records.find((record) => record.id === 'analytics:graph-canvas-layout-mess')?.relatedWorkItems ?? [];
    assert.ok(an1Related.length >= 1, 'AN-1 should list seeded graph-canvas tasks');
    assert.ok(an1Related.some((entry) => entry.id === 'design-graph-canvas-layout-profile-v1'));
    assert.match(
      projection.records.find((record) => record.id === 'analytics:parent-subtask-hierarchy')?.body ?? '',
      /уровни задач/,
    );
    assert.match(
      projection.records.find((record) => record.id === 'analytics:intent-graph-storage-roadmap')?.body ?? '',
      /Аналитический вопрос/,
    );
    assert.match(
      projection.records.find((record) => record.id === 'analytics:graph-visualization-engine')?.body ?? '',
      /n8n/,
    );
    assert.match(
      projection.records.find((record) => record.id === 'analytics:graph-edges-n8n-parity')?.body ?? '',
      /lit-flow игнорирует направление handle/,
    );
    const an4Related = projection.records.find((record) => record.id === 'analytics:graph-visualization-engine')?.relatedWorkItems ?? [];
    assert.ok(an4Related.length >= 1, 'AN-4 should list seeded lit-flow tasks');
    assert.ok(an4Related.some((entry) => entry.id === 'implement-lit-flow-graph-canvas-v1'));
    const an3 = projection.records.find((record) => record.id === 'analytics:intent-graph-storage-roadmap');
    assert.ok(an3?.intentGraph?.question, 'AN-3 should expose intent graph question');
    assert.ok((an3?.intentOptions ?? an3?.intentGraph?.options ?? []).length >= 3, 'AN-3 should list options');
    assert.equal(an3?.selectedDecision?.id ?? an3?.intentGraph?.selectedDecision?.id, 'decision:intent-graph-storage-v1');
  });
});

describe('buildAnalyticsRecordsApiResponse', () => {
  it('returns bounded api payload', async () => {
    const repoRoot = join(import.meta.dirname, '..');
    const payload = await buildAnalyticsRecordsApiResponse({ cwd: repoRoot, limit: 5 });

    assert.equal(payload.schema, ANALYTICS_RECORDS_API_SCHEMA);
    assert.ok(payload.count >= 1);
    assert.equal(payload.limit, 5);
  });
});

describe('appendAnalyticsRecordJournal', () => {
  it('writes journal entries with expected schema', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'analytics-append-'));
    const journalPath = 'analytics-records.jsonl';

    try {
      const result = await appendAnalyticsRecordJournal([
        buildAnalyticsRecord({ title: 'One', query: 'Q1', body: 'Body one' }),
      ], journalPath, { cwd: tempDir });

      assert.equal(result.entries[0].schema, ANALYTICS_RECORD_JOURNAL_SCHEMA);
      assert.equal(result.appended, 1);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
