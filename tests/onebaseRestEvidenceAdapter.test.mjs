import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  buildEvidenceRecordsFromOnebaseCheck,
  buildEvidenceRecordsFromOnebaseDescribe,
  buildOnebaseRestEvidenceAdapterResult,
  executeOnebaseRestGet,
  executeOnebaseRestWrite,
  parseOnebaseDescribePayload,
  prepareOnebaseRestWrite,
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

describe('executeOnebaseRestGet', () => {
  it('blocks missing base URL and non-allowlisted paths', async () => {
    const missingBase = await executeOnebaseRestGet('/catalogs/Номенклатура', {
      env: {},
      taskId: 'rest-task',
    });
    assert.equal(missingBase.ok, false);
    assert.equal(missingBase.blocked, true);
    assert.match(missingBase.evidenceLines[0], /ONEBASE_API_BASE_URL/u);

    const forbidden = await executeOnebaseRestGet('/admin/secrets', {
      baseUrl: 'http://127.0.0.1:8081',
      taskId: 'rest-task',
    });
    assert.equal(forbidden.ok, false);
    assert.equal(forbidden.blocked, true);
    assert.match(forbidden.evidenceLines[0], /allowlist/u);
  });

  it('performs GET-only request and records evidence', async () => {
    const result = await executeOnebaseRestGet('/documents/РеализацияТоваров', {
      baseUrl: 'http://onebase.local/api',
      taskId: 'rest-task',
      fetchImpl: async (url, options) => {
        assert.equal(url, 'http://onebase.local/documents/%D0%A0%D0%B5%D0%B0%D0%BB%D0%B8%D0%B7%D0%B0%D1%86%D0%B8%D1%8F%D0%A2%D0%BE%D0%B2%D0%B0%D1%80%D0%BE%D0%B2');
        assert.equal(options.method, 'GET');
        return {
          ok: true,
          status: 200,
          text: async () => JSON.stringify({ items: [] }),
        };
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.blocked, false);
    assert.equal(result.status, 200);
    assert.equal(result.evidenceRecords[0].source, 'onebase.rest.get');
    assert.match(result.evidenceLines[0], /REST GET/u);
  });
});

describe('prepareOnebaseRestWrite / executeOnebaseRestWrite', () => {
  it('prepares write token and blocks execute without confirm', async () => {
    const prepared = prepareOnebaseRestWrite('/documents/РеализацияТоваров/123/post', { reason: 'test' }, {
      taskId: 'write-task',
    });
    assert.equal(prepared.schema, 'onebase.rest-write.prepare.v1');
    assert.equal(prepared.ok, true);
    assert.match(prepared.confirmToken, /^[a-f0-9]{16}$/u);

    const blocked = await executeOnebaseRestWrite('/documents/РеализацияТоваров/123/post', { reason: 'test' }, {
      taskId: 'write-task',
      baseUrl: 'http://onebase.local',
    });
    assert.equal(blocked.ok, false);
    assert.equal(blocked.blocked, true);
    assert.match(blocked.evidenceLines[0], /confirmToken/u);
  });

  it('rejects arbitrary write paths and executes confirmed POST', async () => {
    const rejected = prepareOnebaseRestWrite('/catalogs/Номенклатура', {}, {
      taskId: 'write-task',
    });
    assert.equal(rejected.ok, false);
    assert.equal(rejected.blocked, true);
    assert.match(rejected.evidenceLines[0], /allowlist/u);

    const body = { reason: 'test' };
    const prepared = prepareOnebaseRestWrite('/documents/РеализацияТоваров/123/post', body, {
      taskId: 'write-task',
    });
    const executed = await executeOnebaseRestWrite('/documents/РеализацияТоваров/123/post', body, {
      taskId: 'write-task',
      baseUrl: 'http://onebase.local',
      confirmToken: prepared.confirmToken,
      confirmedBy: 'operator',
      fetchImpl: async (url, options) => {
        assert.match(url, /^http:\/\/onebase\.local\/documents\//u);
        assert.equal(options.method, 'POST');
        assert.equal(options.body, JSON.stringify(body));
        return {
          ok: true,
          status: 200,
          text: async () => '{"posted":true}',
        };
      },
    });

    assert.equal(executed.ok, true);
    assert.equal(executed.blocked, false);
    assert.equal(executed.evidenceRecords[0].source, 'onebase.rest.write');
    assert.equal(executed.evidenceRecords[0].details.confirmedBy, 'operator');
  });
});
