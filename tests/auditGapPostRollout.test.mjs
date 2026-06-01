import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { readWorkItemsFromIntentTree } from '../src/intentTreeWorkItems.mjs';
import { buildWorkerProviderCatalog } from '../src/workGraphWorkerProvider.mjs';
import { buildToolTransportBoundary } from '../src/workGraphToolSurfaceAudit.mjs';

describe('audit-gap post-provider-rollout snapshot', () => {
  it('exposes five implemented worker providers and no planned entries', () => {
    const catalog = buildWorkerProviderCatalog();
    assert.equal(catalog.providers.length, 5);
    assert.deepEqual(
      catalog.providers.map((entry) => entry.id).sort(),
      ['claude-sdk-api', 'cursor-sdk', 'local', 'local-cli', 'openai'].sort(),
    );
    assert.deepEqual(catalog.plannedProviders, []);
  });

  it('documents sidecar/mcp transport boundary protocol id', () => {
    const boundary = buildToolTransportBoundary();
    assert.equal(boundary.protocolId, 'sidecar-mcp-execution-boundary-v1');
    assert.ok(boundary.summary.total >= 10);
  });

  it('marks reconcile work item done in intent tree canon', async () => {
    const items = await readWorkItemsFromIntentTree();
    const item = items.find((entry) => entry.id === 'reconcile-audit-gap-matrix-post-provider-rollout');

    assert.equal(item?.status, 'done');
  });
});
