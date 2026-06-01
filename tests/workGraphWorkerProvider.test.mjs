import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildProviderFallbackEvidence,
  buildWorkerProviderCatalog,
  buildWorkerProviderRegistry,
  resolveWorkerProvider,
  runWorkerWithProvider,
  selectWorkerProvider,
} from '../src/workGraphWorkerProvider.mjs';
import { createWorkerInputFromBacklogText } from '../src/agentWorkerLocalRunner.mjs';

const SAMPLE_BACKLOG = `#Задача_ready_task<[
Метки:
  atom.profile: work_item
  work.id: ready-task
  work.title: Ready Task
  work.status: ready
  work.target_files: src/workGraphWorkerProvider.mjs
  trace.status: pending
]>
`;

describe('buildWorkerProviderRegistry', () => {
  it('lists all planned and implemented providers with capabilities', () => {
    const registry = buildWorkerProviderRegistry();

    assert.equal(registry.schema, 'workgraph.worker.provider.registry.v1');
    assert.deepEqual(
      registry.providers.map((entry) => entry.id).sort(),
      ['claude-sdk-api', 'cursor-sdk', 'local', 'local-cli', 'openai'].sort(),
    );

    const openai = registry.providers.find((entry) => entry.id === 'openai');
    assert.equal(openai.implementationStatus, 'implemented');
    assert.equal(openai.capabilities.nativeToolCalls, true);

    const cursor = registry.providers.find((entry) => entry.id === 'cursor-sdk');
    assert.equal(cursor.implementationStatus, 'implemented');
    assert.equal(cursor.liveEnvFlag, 'IOHASC_CURSOR_SDK_WORKER');
    assert.equal(cursor.capabilities.ideWorkspaceActions, true);
  });
});

describe('buildWorkerProviderCatalog', () => {
  it('lists implemented providers and planned entries separately', () => {
    const catalog = buildWorkerProviderCatalog();

    assert.equal(catalog.schema, 'workgraph.worker.provider.catalog.v1');
    assert.equal(catalog.registrySchema, 'workgraph.worker.provider.registry.v1');
    assert.deepEqual(catalog.providers.map((entry) => entry.id).sort(), ['claude-sdk-api', 'cursor-sdk', 'local', 'local-cli', 'openai'].sort());
    assert.deepEqual(catalog.plannedProviders.map((entry) => entry.id), []);
    assert.equal(catalog.policy.mandatoryCiProvider, 'local');
    assert.equal(catalog.policy.optionalLiveProvider, 'openai');
  });
});

describe('selectWorkerProvider', () => {
  it('selects local for deterministic verification tasks', () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task' });
    const selection = selectWorkerProvider({
      ...input,
      providerHints: {
        requiredCapabilities: {
          deterministic: true,
        },
      },
    });

    assert.equal(selection.ok, true);
    assert.equal(selection.selectedProviderId, 'local');
    assert.equal(selection.selectionRationale.selectionMode, 'capability_score');
    assert.ok(selection.selectionRationale.matchedCapabilities.includes('deterministic'));
  });

  it('selects a native-tool-call provider when native tool calls are required', () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task' });
    const selection = selectWorkerProvider({
      ...input,
      providerHints: {
        requiredCapabilities: {
          nativeToolCalls: true,
        },
      },
    });

    assert.equal(selection.ok, true);
    assert.ok(['openai', 'claude-sdk-api', 'cursor-sdk'].includes(selection.selectedProviderId));
    assert.ok(selection.selectionRationale.matchedCapabilities.includes('nativeToolCalls'));
  });

  it('respects preferred provider when capabilities match', () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task' });
    const selection = selectWorkerProvider(
      {
        ...input,
        providerHints: {
          preferredProviderId: 'local',
        },
      },
      {
        requiredCapabilities: {
          deterministic: true,
        },
      },
    );

    assert.equal(selection.ok, true);
    assert.equal(selection.selectedProviderId, 'local');
    assert.equal(selection.selectionRationale.selectionMode, 'preferred_provider');
  });

  it('selects cursor-sdk when IDE workspace actions are required', () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task' });
    const selection = selectWorkerProvider({
      ...input,
      providerHints: {
        requiredCapabilities: {
          ideWorkspaceActions: true,
        },
      },
    });

    assert.equal(selection.ok, true);
    assert.equal(selection.selectedProviderId, 'cursor-sdk');
  });

  it('selects claude-sdk-api when long context and native tool calls are required', () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task' });
    const selection = selectWorkerProvider({
      ...input,
      providerHints: {
        requiredCapabilities: {
          longContext: 'high',
          nativeToolCalls: true,
        },
      },
    });

    assert.equal(selection.ok, true);
    assert.equal(selection.selectedProviderId, 'claude-sdk-api');
  });

  it('selects local-cli when deterministic shell verification is required', () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task' });
    const selection = selectWorkerProvider({
      ...input,
      providerHints: {
        requiredCapabilities: {
          deterministic: true,
          shellAccess: true,
        },
      },
    });

    assert.equal(selection.ok, true);
    assert.equal(selection.selectedProviderId, 'local-cli');
  });
});

describe('buildProviderFallbackEvidence', () => {
  it('returns evidence payload without mutating Work Graph state', () => {
    const evidence = buildProviderFallbackEvidence({
      previousProviderId: 'openai',
      nextProviderId: 'local',
      failureClass: 'timeout',
      reason: 'model did not respond within budget',
      retryAdvice: 'retry with local dry-run',
      runId: 'run-1',
      taskId: 'ready-task',
    });

    assert.equal(evidence.kind, 'provider_fallback');
    assert.equal(evidence.source, 'workgraph.worker.provider.registry.v1');
    assert.equal(evidence.details.previousProviderId, 'openai');
    assert.equal(evidence.details.nextProviderId, 'local');
    assert.match(evidence.summary, /provider-fallback/);
    assert.match(evidence.summary, /failureClass=timeout/);
  });
});

describe('runWorkerWithProvider', () => {
  it('runs local provider synchronously by default', async () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task' });
    const result = await runWorkerWithProvider(input, { provider: 'local' });

    assert.equal(result.providerId, 'local');
    assert.equal(result.output.status, 'succeeded');
  });

  it('auto-selects provider when provider option is omitted', async () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task' });
    const result = await runWorkerWithProvider({
      ...input,
      providerHints: {
        requiredCapabilities: {
          deterministic: true,
        },
      },
    });

    assert.equal(result.providerId, 'local');
    assert.equal(result.selectionRationale.selectionMode, 'capability_score');
  });

  it('falls back to local when primary provider fails', async () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task' });
    let callCount = 0;

    const result = await runWorkerWithProvider(input, {
      provider: 'openai',
      providerOptions: {
        requireLive: false,
        fetch: async () => {
          callCount += 1;
          return {
            ok: false,
            status: 503,
            statusText: 'Service Unavailable',
            text: async () => JSON.stringify({ error: { message: 'timeout' } }),
          };
        },
      },
      enableFallback: true,
    });

    assert.equal(result.usedFallback, true);
    assert.equal(result.providerId, 'local');
    assert.equal(result.output.status, 'succeeded');
    assert.ok(result.fallbackTrail.length >= 1);
    assert.equal(result.fallbackTrail[0].kind, 'provider_fallback');
    assert.ok(result.output.evidence.some((entry) => entry.kind === 'provider_fallback'));
    assert.equal(callCount, 1);
  });

  it('does not fallback when explicit provider fails and fallback disabled', async () => {
    const input = createWorkerInputFromBacklogText(SAMPLE_BACKLOG, { taskId: 'ready-task' });
    const result = await runWorkerWithProvider(input, {
      provider: 'openai',
      providerOptions: {
        requireLive: false,
        fetch: async () => ({
          ok: false,
          status: 503,
          statusText: 'Service Unavailable',
          text: async () => JSON.stringify({ error: { message: 'timeout' } }),
        }),
      },
      enableFallback: false,
    });

    assert.equal(result.usedFallback, false);
    assert.equal(result.providerId, 'openai');
    assert.equal(result.output.status, 'failed');
  });
});

describe('resolveWorkerProvider', () => {
  it('accepts openai-compatible alias', () => {
    const provider = resolveWorkerProvider('openai-compatible');
    assert.equal(provider.id, 'openai');
  });

  it('resolves cursor-sdk as implemented provider', () => {
    const provider = resolveWorkerProvider('cursor-sdk');
    assert.equal(provider.id, 'cursor-sdk');
    assert.equal(provider.implementationStatus, 'implemented');
  });

  it('resolves local-cli alias', () => {
    const provider = resolveWorkerProvider('cli');
    assert.equal(provider.id, 'local-cli');
    assert.equal(provider.implementationStatus, 'implemented');
  });
});
