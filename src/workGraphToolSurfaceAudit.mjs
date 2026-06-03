const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

/** @typedef {'keep' | 'replace' | 'defer'} ToolAuditCategory */

export const WORKGRAPH_LIVE_LOOP_REQUIRED_TOOLS = [
  'workGraph.claimNext',
  'workGraph.buildSnapshot',
  'workGraph.recordEvidence',
  'workGraph.transitionStatus',
  'worker.buildWorkerInputFromTask',
  'worker.runLocalWorker',
  'worker.runAgentWorkerLiveLoop',
  'verification.buildVerificationSummary',
];

/** @type {Array<{ iohascTool: string, category: ToolAuditCategory, workGraphEquivalent: string | null, liveLoopRequired: boolean, notes: string }>} */
export const IOHASC_TOOL_AUDIT_ROWS = [
  { iohascTool: 'agentWorkGraphSnapshot', category: 'replace', workGraphEquivalent: 'workGraph.buildSnapshot', liveLoopRequired: true, notes: 'Snapshot v1 from backlog parse' },
  { iohascTool: 'agentWorkGraphSelectNext', category: 'replace', workGraphEquivalent: 'workGraph.claimNext', liveLoopRequired: true, notes: 'Read-only next eligible' },
  { iohascTool: 'agentWorkGraphClaimNext', category: 'replace', workGraphEquivalent: 'workGraph.claimNext', liveLoopRequired: true, notes: 'Claim policy in runtime' },
  { iohascTool: 'agentWorkGraphAddEvidence', category: 'replace', workGraphEquivalent: 'workGraph.recordEvidence', liveLoopRequired: true, notes: 'Evidence gate for done' },
  { iohascTool: 'agentWorkGraphUpdateStatus', category: 'replace', workGraphEquivalent: 'workGraph.transitionStatus', liveLoopRequired: true, notes: 'Policy-gated transitions' },
  { iohascTool: 'agentWorkGraphRunAutonomousLoop', category: 'replace', workGraphEquivalent: 'worker.runAgentWorkerLiveLoop', liveLoopRequired: true, notes: 'observe→stop phases' },
  { iohascTool: 'agentWorkGraphSchedulerTick', category: 'replace', workGraphEquivalent: 'daemon.runWorkGraphDaemonTick', liveLoopRequired: false, notes: 'Scheduler tick wrapper' },
  { iohascTool: 'readFile', category: 'replace', workGraphEquivalent: 'worker.boundedTargetFileRead', liveLoopRequired: false, notes: 'Bounded read on targetFiles only (workGraphBoundedTargetFileRead.mjs)' },
  { iohascTool: 'writeFile', category: 'defer', workGraphEquivalent: null, liveLoopRequired: false, notes: 'Phase 10+ verified file ops skill' },
  { iohascTool: 'runCommand', category: 'defer', workGraphEquivalent: 'verification.allowlistedCommand', liveLoopRequired: false, notes: 'Verification matrix allowlist only' },
  { iohascTool: 'semanticCodeSearch', category: 'defer', workGraphEquivalent: null, liveLoopRequired: false, notes: 'Phase 8+ Graph RAG bundle optional' },
  { iohascTool: 'getPvrgSubgraph', category: 'defer', workGraphEquivalent: 'pvrg.buildPvrgTaskScopeSlice', liveLoopRequired: false, notes: 'Derived projection exists; agent tool deferred' },
  { iohascTool: 'getGraphRagBundle', category: 'defer', workGraphEquivalent: null, liveLoopRequired: false, notes: 'Optional context bundle' },
  { iohascTool: 'onebaseListMetadata', category: 'replace', workGraphEquivalent: 'onebase.listMetadata', liveLoopRequired: false, notes: 'Builtin worker tool; MCP parity optional discovery' },
  { iohascTool: 'onebaseRestCall', category: 'defer', workGraphEquivalent: 'mcp.rest_get', liveLoopRequired: false, notes: 'MCP/sidecar lane; optional REST evidence only' },
  { iohascTool: 'iohascCodeGap', category: 'replace', workGraphEquivalent: 'codegen.buildCodeGapBacklogFeed', liveLoopRequired: false, notes: 'Feeder contract in phase 5' },
  { iohascTool: 'todoWrite', category: 'defer', workGraphEquivalent: null, liveLoopRequired: false, notes: 'Not Work Graph source of truth' },
];

export function buildWorkGraphToolSurfaceAudit() {
  const rows = [...IOHASC_TOOL_AUDIT_ROWS].sort((left, right) => compareText(left.iohascTool, right.iohascTool));
  const byCategory = {
    keep: rows.filter((row) => row.category === 'keep'),
    replace: rows.filter((row) => row.category === 'replace'),
    defer: rows.filter((row) => row.category === 'defer'),
  };

  return {
    schema: 'workgraph.tool.surface.audit.v1',
    liveLoopRequiredTools: [...WORKGRAPH_LIVE_LOOP_REQUIRED_TOOLS],
    summary: {
      total: rows.length,
      keep: byCategory.keep.length,
      replace: byCategory.replace.length,
      defer: byCategory.defer.length,
      liveLoopRequired: rows.filter((row) => row.liveLoopRequired).length,
    },
    rows,
    byCategory,
    policy: {
      allowFileWriteDefault: false,
      allowNetworkDefault: false,
      allowShellDefault: false,
      verificationViaAllowlist: true,
      llmTransportIsNotTool: true,
    },
  };
}

export const TOOL_TRANSPORT_LANES = ['builtin', 'sidecar', 'mcp', 'forbidden'];

export const DEFAULT_TRANSPORT_POLICY_GATES = {
  allowShell: false,
  allowNetwork: false,
  allowFileWrite: false,
  requireTargetFilesAllowlist: true,
  requireEvidenceLogging: true,
  secretsRedaction: true,
  defaultTimeoutMs: 60_000,
  cancellationSupported: false,
};

/** @typedef {'builtin' | 'sidecar' | 'mcp' | 'forbidden'} ToolTransportLane */

/** @type {Array<{ capability: string, lanes: ToolTransportLane[], requiresTargetFiles: boolean, requiresShell: boolean, requiresNetwork: boolean, requiresFileWrite: boolean, notes: string }>} */
export const TOOL_TRANSPORT_BOUNDARY_ROWS = [
  { capability: 'workGraph.claimNext', lanes: ['builtin'], requiresTargetFiles: false, requiresShell: false, requiresNetwork: false, requiresFileWrite: false, notes: 'Work Graph runtime only' },
  { capability: 'workGraph.buildSnapshot', lanes: ['builtin'], requiresTargetFiles: false, requiresShell: false, requiresNetwork: false, requiresFileWrite: false, notes: 'Parse backlog snapshot' },
  { capability: 'workGraph.recordEvidence', lanes: ['builtin'], requiresTargetFiles: false, requiresShell: false, requiresNetwork: false, requiresFileWrite: true, notes: 'Persist evidence via Work Graph apply path only' },
  { capability: 'workGraph.transitionStatus', lanes: ['builtin'], requiresTargetFiles: false, requiresShell: false, requiresNetwork: false, requiresFileWrite: true, notes: 'Policy-gated transitions' },
  { capability: 'worker.runLocalWorker', lanes: ['builtin'], requiresTargetFiles: false, requiresShell: false, requiresNetwork: false, requiresFileWrite: false, notes: 'Mandatory CI provider path' },
  { capability: 'worker.boundedTargetFileRead', lanes: ['builtin', 'sidecar'], requiresTargetFiles: true, requiresShell: false, requiresNetwork: false, requiresFileWrite: false, notes: 'Sidecar may proxy read with same allowlist' },
  { capability: 'verification.allowlistedCommand', lanes: ['builtin', 'sidecar'], requiresTargetFiles: false, requiresShell: true, requiresNetwork: false, requiresFileWrite: false, notes: 'Shell only via verification matrix allowlist' },
  { capability: 'onebase.listMetadata', lanes: ['builtin', 'mcp'], requiresTargetFiles: false, requiresShell: false, requiresNetwork: false, requiresFileWrite: false, notes: 'Prefer builtin; MCP list_metadata for discovery' },
  { capability: 'onebase.readConfigFile', lanes: ['builtin', 'mcp'], requiresTargetFiles: true, requiresShell: false, requiresNetwork: false, requiresFileWrite: false, notes: 'Bounded paths only' },
  { capability: 'onebase.staticVerify', lanes: ['builtin'], requiresTargetFiles: false, requiresShell: false, requiresNetwork: false, requiresFileWrite: false, notes: 'Deterministic static gate' },
  { capability: 'onebase.runVerificationCommand', lanes: ['builtin', 'sidecar'], requiresTargetFiles: false, requiresShell: true, requiresNetwork: false, requiresFileWrite: false, notes: 'go test blocked unless allowShell' },
  { capability: 'mcp.list_metadata', lanes: ['mcp'], requiresTargetFiles: false, requiresShell: false, requiresNetwork: false, requiresFileWrite: false, notes: 'External MCP server' },
  { capability: 'mcp.read_config_file', lanes: ['mcp'], requiresTargetFiles: true, requiresShell: false, requiresNetwork: false, requiresFileWrite: false, notes: 'External MCP bounded read' },
  { capability: 'mcp.rest_get', lanes: ['mcp', 'sidecar'], requiresTargetFiles: false, requiresShell: false, requiresNetwork: true, requiresFileWrite: false, notes: 'Optional REST evidence; never CI gate' },
  { capability: 'sidecar.runCommand', lanes: ['sidecar'], requiresTargetFiles: false, requiresShell: true, requiresNetwork: false, requiresFileWrite: false, notes: 'Proxy shell with policy envelope' },
  { capability: 'sidecar.writeFile', lanes: ['sidecar'], requiresTargetFiles: true, requiresShell: false, requiresNetwork: false, requiresFileWrite: true, notes: 'Deferred verified file ops' },
  { capability: 'writeFile', lanes: ['forbidden'], requiresTargetFiles: true, requiresShell: false, requiresNetwork: false, requiresFileWrite: true, notes: 'Default deny; use sidecar proxy + policy' },
  { capability: 'runCommand', lanes: ['forbidden'], requiresTargetFiles: false, requiresShell: true, requiresNetwork: false, requiresFileWrite: false, notes: 'Default deny; use verification allowlist path' },
  { capability: 'generateFromCharter', lanes: ['forbidden'], requiresTargetFiles: true, requiresShell: true, requiresNetwork: false, requiresFileWrite: true, notes: 'Deferred until sidecar boundary implemented' },
];

const SECRET_REDACTION_PATTERNS = [
  /\b(?:api[_-]?key|token|secret|password|authorization)\s*[:=]\s*[^\s,;]+/giu,
  /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/giu,
  /\bsk-[A-Za-z0-9]{8,}\b/gu,
];

export function buildToolTransportBoundary() {
  const rows = [...TOOL_TRANSPORT_BOUNDARY_ROWS].sort((left, right) => compareText(left.capability, right.capability));
  const laneCounts = Object.fromEntries(TOOL_TRANSPORT_LANES.map((lane) => [lane, 0]));

  for (const row of rows) {
    for (const lane of row.lanes) {
      laneCounts[lane] = (laneCounts[lane] ?? 0) + 1;
    }
  }

  return {
    schema: 'workgraph.tool.transport.boundary.v1',
    protocolId: 'sidecar-mcp-execution-boundary-v1',
    lanes: [...TOOL_TRANSPORT_LANES],
    defaultPolicyGates: { ...DEFAULT_TRANSPORT_POLICY_GATES },
    summary: {
      total: rows.length,
      laneCounts,
      forbiddenDefault: rows.filter((row) => row.lanes.length === 1 && row.lanes[0] === 'forbidden').length,
    },
    rows,
    rules: [
      'LLM HTTP transport is not a tool lane',
      'Mandatory CI uses builtin lane only',
      'Sidecar/MCP adapters must not mutate work/backlog.bvc directly',
      'Policy gates apply before transport selection',
    ],
  };
}

export function findToolTransportBoundaryRow(capability) {
  const normalized = String(capability ?? '').trim();
  return TOOL_TRANSPORT_BOUNDARY_ROWS.find((row) => row.capability === normalized) ?? null;
}

export function resolveToolCapabilityRequest(request = {}, context = {}) {
  const capability = String(request.capability ?? '').trim();
  const row = findToolTransportBoundaryRow(capability);

  if (!row) {
    return {
      schema: 'workgraph.tool.capability.request.v1',
      capability,
      allowed: false,
      allowedLanes: [],
      effectivePolicy: mergeTransportPolicy(request.policy, context.policy),
      blockedReason: 'unknown_capability',
    };
  }

  const effectivePolicy = mergeTransportPolicy(DEFAULT_TRANSPORT_POLICY_GATES, context.policy, request.policy);
  const gate = evaluateTransportPolicyGate({ capability, row, targetFiles: request.targetFiles }, effectivePolicy);

  return {
    schema: 'workgraph.tool.capability.request.v1',
    capability,
    allowed: gate.allowed,
    allowedLanes: gate.allowed ? row.lanes : [],
    effectivePolicy: gate.effectivePolicy,
    blockedReason: gate.blockedReason,
    requiresTargetFiles: row.requiresTargetFiles,
    transportHint: request.transportHint ?? null,
  };
}

export function evaluateTransportPolicyGate(request = {}, policy = {}) {
  const row = request.row ?? findToolTransportBoundaryRow(request.capability);
  const effectivePolicy = mergeTransportPolicy(DEFAULT_TRANSPORT_POLICY_GATES, policy);

  if (!row) {
    return {
      allowed: false,
      blockedReason: 'unknown_capability',
      effectivePolicy,
    };
  }

  if (row.lanes.length === 1 && row.lanes[0] === 'forbidden') {
    return {
      allowed: false,
      blockedReason: 'forbidden_by_default',
      effectivePolicy,
    };
  }

  if (row.requiresShell && effectivePolicy.allowShell !== true) {
    return {
      allowed: false,
      blockedReason: 'shell_not_allowed',
      effectivePolicy,
    };
  }

  if (row.requiresNetwork && effectivePolicy.allowNetwork !== true) {
    return {
      allowed: false,
      blockedReason: 'network_not_allowed',
      effectivePolicy,
    };
  }

  if (row.requiresFileWrite && effectivePolicy.allowFileWrite !== true) {
    return {
      allowed: false,
      blockedReason: 'file_write_not_allowed',
      effectivePolicy,
    };
  }

  if (row.requiresTargetFiles && effectivePolicy.requireTargetFilesAllowlist !== false) {
    const targetFiles = request.targetFiles ?? policy.targetFiles ?? [];
    if (!Array.isArray(targetFiles) || targetFiles.length === 0) {
      return {
        allowed: false,
        blockedReason: 'target_files_required',
        effectivePolicy,
      };
    }
  }

  return {
    allowed: true,
    blockedReason: null,
    effectivePolicy,
  };
}

export function redactTransportSecrets(payload) {
  if (payload === null || payload === undefined) {
    return payload;
  }

  if (typeof payload === 'string') {
    return redactSecretString(payload);
  }

  if (Array.isArray(payload)) {
    return payload.map((entry) => redactTransportSecrets(entry));
  }

  if (typeof payload === 'object') {
    const redacted = {};
    for (const [key, value] of Object.entries(payload)) {
      if (/secret|token|password|authorization|api[_-]?key/iu.test(key)) {
        redacted[key] = '[REDACTED]';
        continue;
      }
      redacted[key] = redactTransportSecrets(value);
    }
    return redacted;
  }

  return payload;
}

function mergeTransportPolicy(...policies) {
  return {
    ...DEFAULT_TRANSPORT_POLICY_GATES,
    ...policies.filter(Boolean).reduce((merged, policy) => ({ ...merged, ...policy }), {}),
  };
}

function redactSecretString(value) {
  let next = String(value);
  for (const pattern of SECRET_REDACTION_PATTERNS) {
    next = next.replace(pattern, '[REDACTED]');
  }
  return next;
}

export const ROLE_CHAIN_PROFILES_V1 = {
  product_architect: { mode: 'dry-run', allowFileWrite: false, allowShell: false, focus: 'planning' },
  feature_engineer: { mode: 'execute', allowFileWrite: true, allowShell: true, focus: 'implementation' },
  domain_architect: { mode: 'dry-run', allowFileWrite: false, allowShell: false, focus: 'domain-bridge' },
  agent_platform_architect: { mode: 'dry-run', allowFileWrite: false, allowShell: false, focus: 'runtime-audit' },
  qa_automation: { mode: 'verify-only', allowFileWrite: false, allowShell: true, focus: 'verification' },
  frontend_architect: { mode: 'execute', allowFileWrite: true, allowShell: false, focus: 'ui' },
};

export function resolveRoleChainHandoff(ownerRole, options = {}) {
  const role = String(ownerRole ?? '').trim() || 'feature_engineer';
  const profile = ROLE_CHAIN_PROFILES_V1[role] ?? ROLE_CHAIN_PROFILES_V1.feature_engineer;

  return {
    schema: 'role_chain.handoff.v1',
    ownerRole: role,
    roleProfile: profile.focus,
    policy: {
      mode: options.mode ?? profile.mode,
      allowFileWrite: options.allowFileWrite ?? profile.allowFileWrite,
      allowShell: options.allowShell ?? profile.allowShell,
      allowNetwork: false,
      timeoutMs: options.timeoutMs ?? 0,
    },
    providerHints: {
      role,
      roleProfile: profile.focus,
      deterministic: profile.mode === 'dry-run' || profile.mode === 'verify-only',
    },
  };
}

export const PROMPT_EVAL_WORKGRAPH_FIXTURES_V1 = [
  {
    id: 'claim-no-eligible',
    tier: 'optional-llm',
    failureClass: 'model_failure',
    description: 'Empty ready queue — agent must stop without inventing a task id',
    allowedTools: ['workGraph.claimNext', 'workGraph.buildSnapshot'],
    expectedKeywords: ['no claimable', 'no eligible', 'stop'],
  },
  {
    id: 'policy-denial-dry-run',
    tier: 'mandatory-deterministic',
    failureClass: 'code_failure',
    description: 'Local runner rejects non-dry-run policy — covered by agentWorkerLocalRunner.test.mjs',
    allowedTools: ['worker.runLocalWorker'],
    expectedKeywords: ['unsupported local runner mode', 'failed'],
  },
  {
    id: 'trace-gate-without-evidence',
    tier: 'mandatory-deterministic',
    failureClass: 'code_failure',
    description: 'transitionStatus to done without evidence — workGraphRuntime policy',
    allowedTools: ['workGraph.transitionStatus'],
    expectedKeywords: ['cannot mark done without evidence'],
  },
  {
    id: 'blocked-onebase-go-preflight',
    tier: 'optional-env',
    failureClass: 'env_blocker',
    description: 'OneBase go version missing — blocked evidence not failed verify',
    allowedTools: ['verification.buildVerificationSummary'],
    expectedKeywords: ['blocked', 'go version', 'preflight'],
  },
  {
    id: 'worker-dry-run-verify-proposal',
    tier: 'mandatory-deterministic',
    failureClass: null,
    description: 'Dry-run worker proposes verify transition — agentWorkerLiveLoop.test.mjs',
    allowedTools: ['worker.runAgentWorkerLiveLoop'],
    expectedKeywords: ['verify', 'succeeded', 'dry-run'],
  },
  {
    id: 'cursor-mcp-primer-v1',
    tier: 'optional-llm',
    failureClass: 'model_failure',
    description: 'Session warm-up: agent must claim via MCP before write; no TodoWrite for trackable work; Russian create_work_item prose',
    allowedTools: ['workGraph.claimNext', 'workGraph.createWorkItem', 'workGraph.transitionStatus'],
    expectedKeywords: ['claim_work_item', 'no TodoWrite', 'русск', 'work.id'],
  },
  {
    id: 'loop-hint-repeat-tool',
    tier: 'optional-llm',
    failureClass: 'model_failure',
    description: 'Repeated identical tool call should surface LOOP_HINT (defer port from ioHasC orchestrator)',
    allowedTools: ['worker.runLocalWorker'],
    expectedKeywords: ['LOOP_HINT', 'loopAborted'],
  },
];

export function buildPromptEvalWorkGraphFixtureCatalog() {
  const fixtures = [...PROMPT_EVAL_WORKGRAPH_FIXTURES_V1].sort((left, right) => compareText(left.id, right.id));
  return {
    schema: 'prompt-eval.workgraph.fixtures.v1',
    mandatoryCount: fixtures.filter((fixture) => fixture.tier === 'mandatory-deterministic').length,
    optionalCount: fixtures.filter((fixture) => fixture.tier !== 'mandatory-deterministic').length,
    fixtures,
  };
}
