import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  createBuiltinTransportHandlers,
  createMockMcpTransport,
  createMockSidecarTransport,
  invokeToolCapability,
  selectTransportLane,
  TOOL_TRANSPORT_INVOKE_SCHEMA,
} from '../src/workGraphToolTransportRuntime.mjs';
import { resolveToolCapabilityRequest } from '../src/workGraphToolSurfaceAudit.mjs';

describe('selectTransportLane', () => {
  it('prefers builtin when multiple lanes are allowed', () => {
    const resolved = resolveToolCapabilityRequest({ capability: 'onebase.listMetadata' });
    assert.equal(selectTransportLane(resolved), 'builtin');
    assert.equal(selectTransportLane(resolved, 'mcp'), 'mcp');
  });
});

describe('invokeToolCapability', () => {
  it('blocks shell capability without allowShell policy', async () => {
    const result = await invokeToolCapability({
      capability: 'onebase.runVerificationCommand',
    }, {
      transports: {
        builtin: createBuiltinTransportHandlers({}),
        sidecar: createMockSidecarTransport(),
      },
    });

    assert.equal(result.schema, TOOL_TRANSPORT_INVOKE_SCHEMA);
    assert.equal(result.ok, false);
    assert.equal(result.blockedReason, 'shell_not_allowed');
  });

  it('invokes sidecar transport through mock adapter', async () => {
    const sidecar = createMockSidecarTransport({
      summary: 'mock sidecar read',
    });

    const result = await invokeToolCapability({
      capability: 'worker.boundedTargetFileRead',
      targetFiles: ['src/runtime.mjs'],
      transportHint: 'sidecar',
    }, {
      policy: { allowShell: false, allowNetwork: false, allowFileWrite: false },
      transports: {
        builtin: createBuiltinTransportHandlers({}),
        sidecar,
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.lane, 'sidecar');
    assert.equal(result.evidence.summary, 'mock sidecar read');
  });

  it('invokes mcp transport and redacts secrets in evidence', async () => {
    const mcp = createMockMcpTransport({ includeSecrets: true });

    const result = await invokeToolCapability({
      capability: 'mcp.list_metadata',
      transportHint: 'mcp',
    }, {
      policy: { allowNetwork: true },
      transports: {
        builtin: createBuiltinTransportHandlers({}),
        mcp,
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.lane, 'mcp');
    assert.equal(result.evidence.authorization, '[REDACTED]');
  });

  it('returns transport_not_configured when lane adapter is missing', async () => {
    const result = await invokeToolCapability({
      capability: 'mcp.rest_get',
      transportHint: 'mcp',
    }, {
      policy: { allowNetwork: true },
      transports: {
        builtin: createBuiltinTransportHandlers({}),
      },
    });

    assert.equal(result.ok, false);
    assert.equal(result.blockedReason, 'transport_not_configured');
  });

  it('blocks forbidden capabilities by default', async () => {
    const result = await invokeToolCapability({
      capability: 'writeFile',
      targetFiles: ['src/runtime.mjs'],
    }, {
      policy: { allowFileWrite: true },
      transports: {
        builtin: createBuiltinTransportHandlers({}),
        sidecar: createMockSidecarTransport(),
      },
    });

    assert.equal(result.ok, false);
    assert.equal(result.blockedReason, 'forbidden_by_default');
  });

  it('uses builtin handler when configured', async () => {
    const result = await invokeToolCapability({
      capability: 'onebase.listMetadata',
    }, {
      transports: {
        builtin: createBuiltinTransportHandlers({
          'onebase.listMetadata': async () => ({
            ok: true,
            result: { catalogs: 2 },
            evidence: { summary: 'listed metadata' },
          }),
        }),
      },
    });

    assert.equal(result.ok, true);
    assert.equal(result.lane, 'builtin');
    assert.deepEqual(result.result, { catalogs: 2 });
  });
});
