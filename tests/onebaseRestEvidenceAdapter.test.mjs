import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildEvidenceRecordsFromOnebaseCheck,
  buildEvidenceRecordsFromOnebaseDescribe,
  buildOnebaseRestEvidenceAdapterResult,
  parseOnebaseDescribePayload,
} from '../src/onebaseRestEvidenceAdapter.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const fixtureRoot = path.join(testDir, 'fixtures/onebase');

describe('parseOnebaseDescribePayload', () => {
  it('parses describe JSON fixture', async () => {
    const text = await readFile(path.join(fixtureRoot, 'describe-trade.json'), 'utf8');
    const parsed = parseOnebaseDescribePayload(text);

    assert.equal(parsed.ok, true);
    assert.equal(parsed.payload.documents.length, 1);
    assert.equal(parsed.payload.catalogs.length, 1);
  });
});

describe('buildEvidenceRecordsFromOnebaseDescribe', () => {
  it('maps describe CLI stdout to evidence-record.v1 rows', async () => {
    const stdout = await readFile(path.join(fixtureRoot, 'describe-trade.json'), 'utf8');
    const records = buildEvidenceRecordsFromOnebaseDescribe('onebase-task', {
      ok: true,
      exitCode: 0,
      command: 'onebase describe --json --project ../onebase/examples/trade',
      stdout,
      stderr: '',
    });

    assert.ok(records.length >= 2);
    assert.equal(records[0].schema, 'evidence-record.v1');
    assert.equal(records[0].source, 'onebase.cli.describe');
    assert.match(records[0].summary, /documents=1/u);
    assert.ok(records.some((record) => record.details?.onebaseKind === 'document'));
  });
});

describe('buildEvidenceRecordsFromOnebaseCheck', () => {
  it('maps check CLI output to evidence-record.v1', async () => {
    const stdout = await readFile(path.join(fixtureRoot, 'check-ok.txt'), 'utf8');
    const records = buildEvidenceRecordsFromOnebaseCheck('onebase-task', {
      ok: true,
      exitCode: 0,
      command: 'onebase check --project ../onebase/examples/trade',
      stdout,
      stderr: '',
    });

    assert.equal(records.length, 1);
    assert.equal(records[0].type, 'command');
    assert.equal(records[0].status, 'succeeded');
    assert.match(records[0].summary, /check passed/u);
  });
});

describe('buildOnebaseRestEvidenceAdapterResult', () => {
  it('returns workerEvidence summaries for preflight merge', async () => {
    const stdout = await readFile(path.join(fixtureRoot, 'check-ok.txt'), 'utf8');
    const adapter = buildOnebaseRestEvidenceAdapterResult('check', {
      ok: true,
      exitCode: 0,
      command: 'onebase check',
      stdout,
      stderr: '',
    }, 'trade-task');

    assert.equal(adapter.schema, 'onebase.rest-evidence.adapter.v1');
    assert.equal(adapter.ok, true);
    assert.ok(adapter.workerEvidence.length >= 1);
    assert.match(adapter.legacyLines[0], /check passed/u);
  });
});
