import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import {
  onebaseListMetadata,
  onebaseReadConfigFile,
  onebaseRestGet,
  onebaseRestWriteExecute,
  onebaseRestWritePrepare,
} from '../packages/workgraph-mcp/src/handlers.mjs';

const root = await mkdtemp(join(tmpdir(), 'wg-onebase-product-pilot-'));

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

try {
  await mkdir(join(root, 'documents'), { recursive: true });
  await writeFile(join(root, 'documents', 'sale.yaml'), 'name: РеализацияТоваров\nposting: true\n', 'utf8');

  const metadata = await onebaseListMetadata({ onebaseRoot: root }, { root });
  assert(metadata.ok === true, 'metadata scan must succeed');
  assert(metadata.summary.total === 1, 'metadata scan must find fixture document');

  const artifact = await onebaseReadConfigFile({
    onebaseRoot: root,
    relativePath: 'documents/sale.yaml',
  }, { root });
  assert(artifact.ok === true, 'bounded artifact read must succeed');
  assert(artifact.facts?.domainMetadata?.name === 'РеализацияТоваров', 'artifact facts must include document name');

  const blockedRest = await onebaseRestGet({
    path: '/documents/РеализацияТоваров',
    taskId: 'onebase-product-pilot-smoke',
  }, { root, env: {} });
  assert(blockedRest.blocked === true, 'REST GET without base URL must be blocked');

  const restRead = await onebaseRestGet({
    path: '/documents/РеализацияТоваров',
    baseUrl: 'http://onebase.local',
    taskId: 'onebase-product-pilot-smoke',
  }, {
    root,
    fetchImpl: async (_url, options) => {
      assert(options.method === 'GET', 'REST read must use GET');
      return {
        ok: true,
        status: 200,
        text: async () => '{"items":[]}',
      };
    },
  });
  assert(restRead.ok === true, 'mocked REST GET must succeed');

  const body = { reason: 'smoke' };
  const preparedWrite = await onebaseRestWritePrepare({
    path: '/documents/РеализацияТоваров/123/post',
    body,
    taskId: 'onebase-product-pilot-smoke',
  }, { root });
  assert(preparedWrite.ok === true, 'write prepare must succeed');

  const blockedWrite = await onebaseRestWriteExecute({
    path: '/documents/РеализацияТоваров/123/post',
    body,
    confirmToken: 'wrong-token',
    baseUrl: 'http://onebase.local',
    taskId: 'onebase-product-pilot-smoke',
  }, { root });
  assert(blockedWrite.blocked === true, 'write execute without matching confirm must be blocked');

  const executedWrite = await onebaseRestWriteExecute({
    path: '/documents/РеализацияТоваров/123/post',
    body,
    confirmToken: preparedWrite.confirmToken,
    confirmedBy: 'smoke',
    baseUrl: 'http://onebase.local',
    taskId: 'onebase-product-pilot-smoke',
  }, {
    root,
    fetchImpl: async (_url, options) => {
      assert(options.method === 'POST', 'REST write must use POST');
      return {
        ok: true,
        status: 200,
        text: async () => '{"posted":true}',
      };
    },
  });
  assert(executedWrite.ok === true, 'confirmed write must succeed against mock runtime');

  console.log(JSON.stringify({
    schema: 'onebase.product-pilot-smoke.v1',
    ok: true,
    metadataTotal: metadata.summary.total,
    restReadEvidence: restRead.evidenceRecords[0].id,
    writeConfirmToken: preparedWrite.confirmToken,
    writeEvidence: executedWrite.evidenceRecords[0].id,
  }, null, 2));
} finally {
  await rm(root, { recursive: true, force: true });
}
