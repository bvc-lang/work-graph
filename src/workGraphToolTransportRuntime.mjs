import {
  evaluateTransportPolicyGate,
  findToolTransportBoundaryRow,
  redactTransportSecrets,
  resolveToolCapabilityRequest,
} from './workGraphToolSurfaceAudit.mjs';

export const TOOL_TRANSPORT_INVOKE_SCHEMA = 'workgraph.tool.transport.invoke.v1';

const LANE_PRIORITY = ['builtin', 'sidecar', 'mcp'];

export function selectTransportLane(resolved, preferredLane = null) {
  const allowedLanes = resolved?.allowedLanes ?? [];
  if (allowedLanes.length === 0) {
    return null;
  }

  const preferred = String(preferredLane ?? resolved?.transportHint ?? '').trim();
  if (preferred && allowedLanes.includes(preferred)) {
    return preferred;
  }

  for (const lane of LANE_PRIORITY) {
    if (allowedLanes.includes(lane)) {
      return lane;
    }
  }

  return allowedLanes[0] ?? null;
}

export function createBuiltinTransportHandlers(handlers = {}) {
  return {
    lane: 'builtin',
    async invoke(call) {
      const handler = handlers[call.capability];
      if (typeof handler !== 'function') {
        return {
          ok: false,
          error: 'builtin_handler_missing',
          evidence: { capability: call.capability, lane: 'builtin' },
        };
      }

      const result = await handler(call);
      return {
        ok: result?.ok !== false,
        result: result?.result ?? result,
        evidence: result?.evidence ?? { capability: call.capability, lane: 'builtin' },
      };
    },
  };
}

export function createMockSidecarTransport(options = {}) {
  const invoke = options.invoke ?? (async (call) => ({
    ok: true,
    result: { proxied: true, capability: call.capability },
    evidence: {
      capability: call.capability,
      lane: 'sidecar',
      summary: options.summary ?? 'sidecar proxy invoke',
    },
  }));

  return {
    lane: 'sidecar',
    invoke,
  };
}

export function createMockMcpTransport(options = {}) {
  const invoke = options.invoke ?? (async (call) => ({
    ok: true,
    result: { mcp: true, capability: call.capability },
    evidence: {
      capability: call.capability,
      lane: 'mcp',
      summary: options.summary ?? 'mcp tool invoke',
      authorization: options.includeSecrets ? 'Bearer sk-testsecret123456' : undefined,
    },
  }));

  return {
    lane: 'mcp',
    invoke,
  };
}

export function buildDefaultTransportRegistry(options = {}) {
  const builtinHandlers = options.builtinHandlers ?? {};
  return {
    builtin: createBuiltinTransportHandlers(builtinHandlers),
    sidecar: options.sidecarTransport ?? null,
    mcp: options.mcpTransport ?? null,
  };
}

export async function invokeToolCapability(request = {}, options = {}) {
  const capability = String(request.capability ?? '').trim();
  const targetFiles = request.targetFiles ?? options.targetFiles ?? [];
  const resolved = resolveToolCapabilityRequest(
    {
      ...request,
      capability,
      targetFiles,
    },
    {
      policy: {
        ...(options.policy ?? {}),
        targetFiles,
      },
    },
  );

  if (!resolved.allowed) {
    return {
      schema: TOOL_TRANSPORT_INVOKE_SCHEMA,
      ok: false,
      capability,
      lane: null,
      blockedReason: resolved.blockedReason ?? 'capability_denied',
      result: null,
      evidence: redactTransportSecrets({
        capability,
        blockedReason: resolved.blockedReason ?? 'capability_denied',
      }),
    };
  }

  const lane = selectTransportLane(resolved, request.transportHint ?? options.lane);
  if (!lane || !resolved.allowedLanes.includes(lane)) {
    return {
      schema: TOOL_TRANSPORT_INVOKE_SCHEMA,
      ok: false,
      capability,
      lane: lane ?? null,
      blockedReason: 'lane_not_allowed',
      result: null,
      evidence: redactTransportSecrets({ capability, blockedReason: 'lane_not_allowed' }),
    };
  }

  const row = findToolTransportBoundaryRow(capability);
  const gate = evaluateTransportPolicyGate(
    { capability, row, targetFiles },
    resolved.effectivePolicy,
  );

  if (!gate.allowed) {
    return {
      schema: TOOL_TRANSPORT_INVOKE_SCHEMA,
      ok: false,
      capability,
      lane,
      blockedReason: gate.blockedReason ?? 'policy_denied',
      result: null,
      evidence: redactTransportSecrets({ capability, blockedReason: gate.blockedReason }),
    };
  }

  const transports = options.transports ?? buildDefaultTransportRegistry(options);
  const transport = transports[lane];
  if (!transport || typeof transport.invoke !== 'function') {
    return {
      schema: TOOL_TRANSPORT_INVOKE_SCHEMA,
      ok: false,
      capability,
      lane,
      blockedReason: 'transport_not_configured',
      result: null,
      evidence: redactTransportSecrets({ capability, lane, blockedReason: 'transport_not_configured' }),
    };
  }

  const startedAt = Date.now();
  const transportResult = await transport.invoke({
    capability,
    args: request.args ?? {},
    policy: resolved.effectivePolicy,
    targetFiles,
    timeoutMs: resolved.effectivePolicy.defaultTimeoutMs,
  });

  return {
    schema: TOOL_TRANSPORT_INVOKE_SCHEMA,
    ok: transportResult.ok !== false,
    capability,
    lane,
    blockedReason: transportResult.ok === false ? (transportResult.error ?? 'transport_failed') : null,
    result: redactTransportSecrets(transportResult.result ?? null),
    evidence: redactTransportSecrets(transportResult.evidence ?? transportResult),
    durationMs: Date.now() - startedAt,
  };
}
