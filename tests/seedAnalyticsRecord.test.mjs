import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { readAnalyticsRecordJournal } from '../src/analyticsRecordStore.mjs';
import {
  buildAnalyticsRecordInputFromMarkdown,
  parseAnalyticsMarkdownMetadata,
  parseSeedAnalyticsRecordArgs,
  seedAnalyticsRecord,
} from '../src/seedAnalyticsRecord.mjs';

describe('parseAnalyticsMarkdownMetadata', () => {
  it('extracts key, title, and query from markdown', () => {
    const body = `# AN-40: Deployment model

**Запрос:** how to install WG on a project?

## Кратко
`;
    assert.deepEqual(parseAnalyticsMarkdownMetadata(body), {
      key: 'AN-40',
      title: 'Deployment model',
      query: 'how to install WG on a project?',
    });
  });
});

describe('parseSeedAnalyticsRecordArgs', () => {
  it('requires --body', () => {
    assert.throws(
      () => parseSeedAnalyticsRecordArgs([]),
      /--body is required/,
    );
  });

  it('parses optional flags', () => {
    const parsed = parseSeedAnalyticsRecordArgs([
      '--body', 'work/analytics/sample.md',
      '--key', 'AN-99',
      '--topic', 'product/integration',
      '--tags', 'deployment,AN-99',
      '--dry-run',
    ], { cwd: '/repo' });

    assert.equal(parsed.bodyPath, 'work/analytics/sample.md');
    assert.equal(parsed.key, 'AN-99');
    assert.equal(parsed.topic, 'product/integration');
    assert.deepEqual(parsed.tags, ['deployment', 'AN-99']);
    assert.equal(parsed.dryRun, true);
  });
});

describe('seedAnalyticsRecord', () => {
  it('appends journal entry from markdown metadata and is idempotent', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'seed-analytics-record-'));
    const bodyPath = 'work/analytics/sample-deployment.md';
    const journalPath = 'work/analytics-records.jsonl';

    try {
      await mkdir(join(tempDir, 'work/analytics'), { recursive: true });
      await writeFile(join(tempDir, bodyPath), `# AN-99: Sample deployment

**Запрос:** how to connect WG to a repo?

## Кратко
Hybrid model.
`, 'utf8');

      const first = await seedAnalyticsRecord({
        cwd: tempDir,
        body: bodyPath,
        journalPath,
        topic: 'product/integration',
      });

      assert.equal(first.skipped, false);
      assert.equal(first.appended, 1);
      assert.equal(first.key, 'AN-99');
      assert.equal(first.id, 'analytics:sample-deployment');

      const journal = await readAnalyticsRecordJournal({ cwd: tempDir, journalPath });
      assert.equal(journal.records.length, 1);
      assert.equal(journal.records[0].bodyPath, bodyPath);
      assert.match(journal.records[0].body, /Hybrid model\./);

      const second = await seedAnalyticsRecord({
        cwd: tempDir,
        body: bodyPath,
        journalPath,
      });
      assert.equal(second.skipped, true);
      assert.equal(second.reason, 'record_exists');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('supports dry-run without writing journal', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'seed-analytics-record-dry-'));
    const bodyPath = 'work/analytics/dry-run.md';
    const journalPath = 'work/analytics-records.jsonl';

    try {
      await mkdir(join(tempDir, 'work/analytics'), { recursive: true });
      await writeFile(join(tempDir, bodyPath), `# AN-100: Dry run

**Запрос:** test dry run?
`, 'utf8');

      const result = await seedAnalyticsRecord({
        cwd: tempDir,
        body: bodyPath,
        journalPath,
        dryRun: true,
      });

      assert.equal(result.skipped, false);
      assert.equal(result.dryRun, true);
      const journal = await readAnalyticsRecordJournal({ cwd: tempDir, journalPath });
      assert.equal(journal.entryCount, 0);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});

describe('buildAnalyticsRecordInputFromMarkdown', () => {
  it('falls back to markdown metadata when cli title/query are empty strings', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'seed-analytics-record-empty-cli-'));
    const bodyPath = 'work/analytics/empty-cli-overrides.md';

    try {
      await mkdir(join(tempDir, 'work/analytics'), { recursive: true });
      await writeFile(join(tempDir, bodyPath), `# AN-42: From markdown

**Запрос:** parsed query?
`, 'utf8');

      const input = await buildAnalyticsRecordInputFromMarkdown({
        cwd: tempDir,
        body: bodyPath,
        title: '',
        query: '',
        key: '',
      });

      assert.equal(input.title, 'AN-42: From markdown');
      assert.equal(input.query, 'parsed query?');
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('builds prefixed title when key is present', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'seed-analytics-record-input-'));
    const bodyPath = 'work/analytics/title-prefix.md';

    try {
      await mkdir(join(tempDir, 'work/analytics'), { recursive: true });
      await writeFile(join(tempDir, bodyPath), `# AN-41: Host console

**Запрос:** should WG be host or embedded?
`, 'utf8');

      const input = await buildAnalyticsRecordInputFromMarkdown({
        cwd: tempDir,
        body: bodyPath,
      });

      assert.equal(input.title, 'AN-41: Host console');
      assert.equal(input.key, 'AN-41');
      assert.deepEqual(input.tags, ['AN-41']);
      assert.deepEqual(input.relatedFiles, [bodyPath]);
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });
});
