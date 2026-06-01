import { runOpenAiCompatibleWorker } from './agentWorkerOpenAiProvider.mjs';
import { runLocalWorker } from './agentWorkerLocalRunner.mjs';
import { runCursorSdkWorker } from './agentWorkerCursorSdkProvider.mjs';
import { runClaudeSdkApiWorker } from './agentWorkerClaudeProvider.mjs';
import { runLocalCliWorker } from './agentWorkerLocalCliProvider.mjs';
import {
  ONEBASE_WORKER_TOOL_IDS,
  isOnebaseDomainTask,
  resolveOnebaseAllowedTools,
} from './onebaseWorkerTools.mjs';

export const WORKER_PROVIDER_IDS = ['local', 'openai'];

export const PROVIDER_CAPABILITY_KEYS = [
  'deterministic',
  'nativeToolCalls',
  'structuredOutput',
  'timeoutSupport',
  'cancelSupport',
  'fileContext',
  'networkAccess',
  'shellAccess',
  'longContext',
  'ideWorkspaceActions',
];

const REGISTRY_ENTRIES = {
  local: {
    id: 'local',
    title: 'Deterministic local dry-run provider',
    aliases: [],
    implementationStatus: 'implemented',
    async: false,
    liveEnvFlag: null,
    runWorker: runLocalWorker,
    capabilities: {
      deterministic: true,
      nativeToolCalls: false,
      structuredOutput: 'high',
      timeoutSupport: true,
      cancelSupport: false,
      fileContext: 'targetFiles',
      networkAccess: false,
      shellAccess: false,
      longContext: false,
      ideWorkspaceActions: false,
    },
    costHint: 'free',
    latencyHint: 'low',
    reliabilityHint: 'high',
    defaultForCi: true,
  },
  openai: {
    id: 'openai',
    title: 'OpenAI-compatible HTTP provider',
    aliases: ['openai-compatible'],
    implementationStatus: 'implemented',
    async: true,
    liveEnvFlag: 'IOHASC_E2E_REAL_LLM',
    runWorker: runOpenAiCompatibleWorker,
    capabilities: {
      deterministic: false,
      nativeToolCalls: true,
      structuredOutput: 'medium',
      timeoutSupport: true,
      cancelSupport: false,
      fileContext: 'targetFiles',
      networkAccess: true,
      shellAccess: false,
      longContext: 'medium',
      ideWorkspaceActions: false,
    },
    costHint: 'variable',
    latencyHint: 'medium',
    reliabilityHint: 'medium',
    defaultForCi: false,
  },
  'cursor-sdk': {
    id: 'cursor-sdk',
    title: 'Cursor SDK agent provider',
    aliases: [],
    implementationStatus: 'implemented',
    async: true,
    liveEnvFlag: 'IOHASC_CURSOR_SDK_WORKER',
    runWorker: runCursorSdkWorker,
    capabilities: {
      deterministic: false,
      nativeToolCalls: true,
      structuredOutput: 'medium',
      timeoutSupport: true,
      cancelSupport: true,
      fileContext: 'workspace',
      networkAccess: true,
      shellAccess: true,
      longContext: 'medium',
      ideWorkspaceActions: true,
    },
    costHint: 'subscription',
    latencyHint: 'medium',
    reliabilityHint: 'medium',
    defaultForCi: false,
  },
  'claude-sdk-api': {
    id: 'claude-sdk-api',
    title: 'Claude SDK/API provider',
    aliases: ['claude', 'anthropic'],
    implementationStatus: 'implemented',
    async: true,
    liveEnvFlag: 'IOHASC_CLAUDE_WORKER',
    runWorker: runClaudeSdkApiWorker,
    capabilities: {
      deterministic: false,
      nativeToolCalls: true,
      structuredOutput: 'high',
      timeoutSupport: true,
      cancelSupport: true,
      fileContext: 'targetFiles',
      networkAccess: true,
      shellAccess: false,
      longContext: 'high',
      ideWorkspaceActions: false,
    },
    costHint: 'variable',
    latencyHint: 'medium',
    reliabilityHint: 'high',
    defaultForCi: false,
  },
  'local-cli': {
    id: 'local-cli',
    title: 'Local CLI/runner provider',
    aliases: ['cli'],
    implementationStatus: 'implemented',
    async: true,
    liveEnvFlag: 'IOHASC_LOCAL_CLI_WORKER',
    runWorker: runLocalCliWorker,
    capabilities: {
      deterministic: true,
      nativeToolCalls: false,
      structuredOutput: 'medium',
      timeoutSupport: true,
      cancelSupport: true,
      fileContext: 'targetFiles',
      networkAccess: false,
      shellAccess: true,
      longContext: false,
      ideWorkspaceActions: false,
    },
    costHint: 'free',
    latencyHint: 'low',
    reliabilityHint: 'high',
    defaultForCi: false,
  },
};

function normalizeProviderId(providerId) {
  const id = String(providerId ?? 'local').trim().toLowerCase();

  for (const entry of Object.values(REGISTRY_ENTRIES)) {
    if (entry.id === id) {
      return entry.id;
    }

    if (entry.aliases.includes(id)) {
      return entry.id;
    }
  }

  return id;
}

function getRegistryEntry(providerId) {
  const id = normalizeProviderId(providerId);
  const entry = REGISTRY_ENTRIES[id];

  if (!entry) {
    throw new Error(`unsupported worker provider: ${providerId}`);
  }

  return entry;
}

function capabilityMatches(required, actual) {
  if (required === undefined || required === null) {
    return true;
  }

  if (typeof required === 'boolean') {
    return Boolean(actual) === required;
  }

  if (typeof required === 'string' && typeof actual === 'string') {
    const rank = { low: 1, medium: 2, high: 3, targetFiles: 2, workspace: 3 };
    return (rank[actual] ?? 0) >= (rank[required] ?? 0);
  }

  return actual === required;
}

function scoreProvider(entry, requiredCapabilities = {}, policy = {}) {
  let score = 0;
  const matchedCapabilities = [];
  const missingCapabilities = [];

  for (const [key, required] of Object.entries(requiredCapabilities)) {
    const actual = entry.capabilities[key];

    if (capabilityMatches(required, actual)) {
      score += 10;
      matchedCapabilities.push(key);
    } else {
      score -= 25;
      missingCapabilities.push(key);
    }
  }

  if (policy.denyNetworkAccess && entry.capabilities.networkAccess) {
    score -= 100;
  }

  if (policy.denyShellAccess && entry.capabilities.shellAccess) {
    score -= 100;
  }

  if (policy.requireDeterministic && !entry.capabilities.deterministic) {
    score -= 50;
  }

  if (entry.implementationStatus !== 'implemented') {
    score -= 1000;
  }

  if (entry.defaultForCi) {
    score += 1;
  }

  const reliabilityBonus = { high: 3, medium: 2, low: 1 }[entry.reliabilityHint] ?? 0;
  const latencyBonus = { low: 3, medium: 2, high: 1 }[entry.latencyHint] ?? 0;
  score += reliabilityBonus + latencyBonus;

  return {
    providerId: entry.id,
    score,
    matchedCapabilities,
    missingCapabilities,
    implementationStatus: entry.implementationStatus,
  };
}

export function buildWorkerProviderRegistry() {
  return {
    schema: 'workgraph.worker.provider.registry.v1',
    providers: Object.values(REGISTRY_ENTRIES).map((entry) => ({
      id: entry.id,
      title: entry.title,
      aliases: [...entry.aliases],
      implementationStatus: entry.implementationStatus,
      async: entry.async,
      liveEnvFlag: entry.liveEnvFlag,
      capabilities: { ...entry.capabilities },
      costHint: entry.costHint,
      latencyHint: entry.latencyHint,
      reliabilityHint: entry.reliabilityHint,
      defaultForCi: entry.defaultForCi,
    })),
    selectionPolicy: {
      order: ['requiredCapabilities', 'policyCompatibility', 'reliability', 'cost', 'latency'],
      fallbackEvidenceKind: 'provider_fallback',
    },
  };
}

export function selectWorkerProvider(input = {}, options = {}) {
  const requiredCapabilities = {
    ...(input.providerHints?.requiredCapabilities ?? {}),
    ...(options.requiredCapabilities ?? {}),
  };
  const policy = {
    denyNetworkAccess: options.policy?.denyNetworkAccess ?? input.policy?.denyNetworkAccess ?? false,
    denyShellAccess: options.policy?.denyShellAccess ?? input.policy?.denyShellAccess ?? false,
    requireDeterministic: options.policy?.requireDeterministic ?? input.policy?.requireDeterministic ?? false,
  };
  const preferredProviderId = options.preferredProviderId ?? input.providerHints?.preferredProviderId ?? null;
  const allowPlanned = options.allowPlanned === true;

  const candidates = Object.values(REGISTRY_ENTRIES)
    .filter((entry) => allowPlanned || entry.implementationStatus === 'implemented')
    .map((entry) => scoreProvider(entry, requiredCapabilities, policy))
    .sort((left, right) => right.score - left.score);

  const best = candidates[0] ?? null;

  if (!best || best.score < 0) {
    return {
      ok: false,
      selectedProviderId: null,
      selectionRationale: {
        requiredCapabilities,
        policy,
        candidates,
        reason: 'no_provider_satisfies_capabilities_or_policy',
      },
    };
  }

  if (preferredProviderId) {
    const preferredId = normalizeProviderId(preferredProviderId);
    const preferredEntry = REGISTRY_ENTRIES[preferredId];

    if (preferredEntry && (allowPlanned || preferredEntry.implementationStatus === 'implemented')) {
      const preferredScore = scoreProvider(preferredEntry, requiredCapabilities, policy);

      if (preferredScore.score >= 0) {
        return {
          ok: true,
          selectedProviderId: preferredId,
          selectionRationale: {
            requiredCapabilities,
            policy,
            preferredProviderId: preferredId,
            matchedCapabilities: preferredScore.matchedCapabilities,
            missingCapabilities: preferredScore.missingCapabilities,
            selectionMode: 'preferred_provider',
            candidates,
          },
        };
      }
    }
  }

  return {
    ok: true,
    selectedProviderId: best.providerId,
    selectionRationale: {
      requiredCapabilities,
      policy,
      matchedCapabilities: best.matchedCapabilities,
      missingCapabilities: best.missingCapabilities,
      selectionMode: 'capability_score',
      candidates,
    },
  };
}

export function buildProviderFallbackEvidence({
  previousProviderId,
  nextProviderId,
  failureClass,
  reason,
  retryAdvice = '',
  runId = '',
  taskId = '',
}) {
  return {
    kind: 'provider_fallback',
    source: 'workgraph.worker.provider.registry.v1',
    result: 'switched',
    summary: [
      'provider-fallback',
      previousProviderId ? `from=${previousProviderId}` : '',
      nextProviderId ? `to=${nextProviderId}` : '',
      failureClass ? `failureClass=${failureClass}` : '',
      reason ? `reason=${String(reason).trim()}` : '',
    ].filter(Boolean).join(' '),
    details: {
      previousProviderId: previousProviderId ?? null,
      nextProviderId: nextProviderId ?? null,
      failureClass: failureClass ?? 'unknown',
      reason: String(reason ?? '').trim(),
      retryAdvice: String(retryAdvice ?? '').trim(),
      runId: runId || null,
      taskId: taskId || null,
    },
  };
}

export function classifyWorkerFailureForFallback(output) {
  if (!output || output.status === 'succeeded') {
    return 'succeeded';
  }

  const reason = String(output.failureReason || output.transitionRequest?.reason || '').toLowerCase();

  if (reason.includes('timeout') || reason.includes('timed out')) {
    return 'timeout';
  }

  if (reason.includes('env') || reason.includes('missing_model') || reason.includes('econnrefused')) {
    return 'env_blocker';
  }

  if (reason.includes('rate limit') || reason.includes('429')) {
    return 'rate_limit';
  }

  if (reason.includes('policy') || reason.includes('denied')) {
    return 'policy_denied';
  }

  return 'model_failure';
}

export function shouldFallbackWorkerProvider(output, context = {}) {
  if (context.enableFallback === false) {
    return false;
  }

  if (!output || output.status === 'succeeded') {
    return false;
  }

  if (context.currentProviderId === 'local') {
    return false;
  }

  const failureClass = classifyWorkerFailureForFallback(output);
  return failureClass !== 'policy_denied';
}

export function mergeFallbackEvidenceIntoOutput(output, fallbackTrail = []) {
  if (!Array.isArray(fallbackTrail) || fallbackTrail.length === 0) {
    return output;
  }

  const existingEvidence = Array.isArray(output.evidence) ? output.evidence : [];

  return {
    ...output,
    evidence: [...existingEvidence, ...fallbackTrail],
  };
}

export function buildLocalFallbackWorkerInput(input) {
  return {
    ...input,
    policy: {
      mode: 'dry-run',
      allowShell: false,
      allowNetwork: false,
      allowFileWrite: false,
      timeoutMs: input?.policy?.timeoutMs ?? 0,
    },
    providerHints: {
      ...(input?.providerHints ?? {}),
      provider: 'local-runner',
      deterministic: true,
    },
  };
}

export async function runWorkerWithSelectionAndFallback(input, options = {}) {
  const explicitProviderId = options.provider ?? null;
  const enableFallback = options.enableFallback !== false;
  const maxFallbackAttempts = Number(options.maxFallbackAttempts ?? 1);

  let providerId = explicitProviderId;
  let selectionRationale = null;
  const fallbackTrail = [];

  if (!providerId) {
    const selection = selectWorkerProvider(input, options.selectionOptions ?? {});

    if (!selection.ok) {
      throw new Error(`provider selection failed: ${selection.selectionRationale.reason}`);
    }

    providerId = selection.selectedProviderId;
    selectionRationale = selection.selectionRationale;
  }

  let attempt = 0;
  let workerInput = input;

  while (attempt <= maxFallbackAttempts) {
    const provider = resolveWorkerProvider(providerId);
    const output = await Promise.resolve(
      provider.runWorker(workerInput, options.providerOptions ?? {}),
    );

    const fallbackContext = {
      enableFallback,
      explicitProvider: Boolean(explicitProviderId),
      currentProviderId: provider.id,
    };

    if (
      shouldFallbackWorkerProvider(output, fallbackContext)
      && attempt < maxFallbackAttempts
    ) {
      const failureClass = classifyWorkerFailureForFallback(output);
      fallbackTrail.push(buildProviderFallbackEvidence({
        previousProviderId: provider.id,
        nextProviderId: 'local',
        failureClass,
        reason: output.failureReason || output.transitionRequest?.reason || failureClass,
        retryAdvice: output.retryAdvice || 'retry with local deterministic provider',
        runId: output.runId,
        taskId: output.taskId,
      }));
      providerId = 'local';
      workerInput = buildLocalFallbackWorkerInput(input);
      attempt += 1;
      continue;
    }

    const mergedOutput = mergeFallbackEvidenceIntoOutput(output, fallbackTrail);

    return {
      providerId: provider.id,
      providerTitle: provider.title,
      selectionRationale: attempt === 0 ? selectionRationale : selectionRationale,
      explicitProvider: Boolean(explicitProviderId),
      fallbackTrail,
      usedFallback: fallbackTrail.length > 0,
      output: mergedOutput,
    };
  }

  throw new Error('provider fallback loop exhausted without result');
}

export function resolveWorkerProvider(providerId = 'local') {
  const entry = getRegistryEntry(providerId);

  if (entry.implementationStatus !== 'implemented' || typeof entry.runWorker !== 'function') {
    throw new Error(`worker provider not implemented: ${entry.id}`);
  }

  return {
    id: entry.id,
    title: entry.title,
    runWorker: entry.runWorker,
    async: entry.async,
    liveEnvFlag: entry.liveEnvFlag,
    implementationStatus: entry.implementationStatus,
    capabilities: { ...entry.capabilities },
  };
}

export async function runWorkerWithProvider(input, options = {}) {
  const result = await runWorkerWithSelectionAndFallback(input, options);
  return {
    providerId: result.providerId,
    providerTitle: result.providerTitle,
    selectionRationale: result.selectionRationale,
    explicitProvider: result.explicitProvider,
    fallbackTrail: result.fallbackTrail,
    usedFallback: result.usedFallback,
    output: result.output,
  };
}

export function buildWorkerProviderCatalog() {
  const registry = buildWorkerProviderRegistry();

  return {
    schema: 'workgraph.worker.provider.catalog.v1',
    registrySchema: registry.schema,
    providers: registry.providers
      .filter((entry) => entry.implementationStatus === 'implemented')
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        async: entry.async,
        liveEnvFlag: entry.liveEnvFlag,
        defaultForCi: entry.defaultForCi,
        capabilities: entry.capabilities,
      })),
    plannedProviders: registry.providers
      .filter((entry) => entry.implementationStatus === 'planned')
      .map((entry) => ({
        id: entry.id,
        title: entry.title,
        capabilities: entry.capabilities,
      })),
    policy: {
      mandatoryCiProvider: 'local',
      optionalLiveProvider: 'openai',
      liveEnableEnv: 'IOHASC_E2E_REAL_LLM=1',
      llmBaseUrlEnv: 'IOHASC_LLM_BASE_URL',
      llmModelEnv: 'IOHASC_LLM_MODEL',
      selectionPolicy: registry.selectionPolicy,
    },
  };
}

export function resolveDomainWorkerCapabilities(task) {
  if (isOnebaseDomainTask(task)) {
    return {
      domainId: 'onebase',
      allowedTools: resolveOnebaseAllowedTools(task),
      toolIds: ONEBASE_WORKER_TOOL_IDS,
    };
  }

  return {
    domainId: null,
    allowedTools: [],
    toolIds: [],
  };
}
