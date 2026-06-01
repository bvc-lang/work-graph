import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildPromptEvalWorkGraphFixtureCatalog,
  buildToolTransportBoundary,
  buildWorkGraphToolSurfaceAudit,
  evaluateTransportPolicyGate,
  redactTransportSecrets,
  resolveToolCapabilityRequest,
  resolveRoleChainHandoff,
  WORKGRAPH_LIVE_LOOP_REQUIRED_TOOLS,
} from '../src/workGraphToolSurfaceAudit.mjs';

describe('buildWorkGraphToolSurfaceAudit', () => {
  it('classifies ioHasC tools into keep/replace/defer with live-loop required set', () => {
    const audit = buildWorkGraphToolSurfaceAudit();

    assert.equal(audit.schema, 'workgraph.tool.surface.audit.v1');
    assert.ok(audit.summary.replace >= 5);
    assert.ok(audit.summary.defer >= 5);
    assert.deepEqual(audit.liveLoopRequiredTools, WORKGRAPH_LIVE_LOOP_REQUIRED_TOOLS);
    assert.equal(audit.policy.llmTransportIsNotTool, true);

    const readFileRow = audit.rows.find((row) => row.iohascTool === 'readFile');
    assert.equal(readFileRow?.category, 'replace');
    assert.equal(readFileRow?.workGraphEquivalent, 'worker.boundedTargetFileRead');

    const claimRow = audit.rows.find((row) => row.iohascTool === 'agentWorkGraphClaimNext');
    assert.equal(claimRow?.category, 'replace');
    assert.equal(claimRow?.liveLoopRequired, true);

    const onebaseRow = audit.rows.find((row) => row.iohascTool === 'onebaseListMetadata');
    assert.equal(onebaseRow?.category, 'replace');
    assert.equal(onebaseRow?.workGraphEquivalent, 'onebase.listMetadata');
  });
});

describe('buildToolTransportBoundary', () => {
  it('separates builtin, sidecar, mcp and forbidden lanes', () => {
    const boundary = buildToolTransportBoundary();

    assert.equal(boundary.schema, 'workgraph.tool.transport.boundary.v1');
    assert.equal(boundary.protocolId, 'sidecar-mcp-execution-boundary-v1');
    assert.deepEqual(boundary.lanes, ['builtin', 'sidecar', 'mcp', 'forbidden']);
    assert.ok(boundary.summary.total >= 10);
    assert.ok(boundary.summary.laneCounts.builtin >= 5);
    assert.ok(boundary.summary.forbiddenDefault >= 2);

    const writeRow = boundary.rows.find((row) => row.capability === 'writeFile');
    assert.deepEqual(writeRow?.lanes, ['forbidden']);
  });
});

describe('evaluateTransportPolicyGate', () => {
  it('blocks shell and network capabilities without policy flags', () => {
    const shellGate = evaluateTransportPolicyGate(
      { capability: 'onebase.runVerificationCommand' },
      { allowShell: false },
    );
    assert.equal(shellGate.allowed, false);
    assert.equal(shellGate.blockedReason, 'shell_not_allowed');

    const networkGate = evaluateTransportPolicyGate(
      { capability: 'mcp.rest_get' },
      { allowNetwork: false },
    );
    assert.equal(networkGate.allowed, false);
    assert.equal(networkGate.blockedReason, 'network_not_allowed');
  });

  it('allows bounded read when targetFiles are present', () => {
    const gate = evaluateTransportPolicyGate(
      { capability: 'worker.boundedTargetFileRead', targetFiles: ['src/foo.mjs'] },
      { allowFileWrite: false, allowShell: false, allowNetwork: false },
    );
    assert.equal(gate.allowed, true);
  });
});

describe('resolveToolCapabilityRequest', () => {
  it('returns allowed lanes independent of transport hint', () => {
    const resolved = resolveToolCapabilityRequest({
      capability: 'onebase.listMetadata',
      transportHint: 'mcp',
    });

    assert.equal(resolved.allowed, true);
    assert.ok(resolved.allowedLanes.includes('builtin'));
    assert.ok(resolved.allowedLanes.includes('mcp'));
  });
});

describe('redactTransportSecrets', () => {
  it('redacts token-like strings from evidence payloads', () => {
    const redacted = redactTransportSecrets({
      summary: 'Authorization: Bearer sk-testsecret123456',
      api_key: 'abc',
      nested: { password: 'secret' },
    });

    assert.match(redacted.summary, /\[REDACTED\]/u);
    assert.equal(redacted.api_key, '[REDACTED]');
    assert.equal(redacted.nested.password, '[REDACTED]');
  });
});

describe('resolveRoleChainHandoff', () => {
  it('maps owner_role to policy and provider hints', () => {
    const handoff = resolveRoleChainHandoff('qa_automation');

    assert.equal(handoff.schema, 'role_chain.handoff.v1');
    assert.equal(handoff.roleProfile, 'verification');
    assert.equal(handoff.policy.allowFileWrite, false);
    assert.equal(handoff.policy.allowShell, true);
    assert.equal(handoff.providerHints.deterministic, true);
  });

  it('falls back to feature_engineer profile for unknown roles', () => {
    const handoff = resolveRoleChainHandoff('unknown_role');

    assert.equal(handoff.roleProfile, 'implementation');
    assert.equal(handoff.policy.allowFileWrite, true);
  });
});

describe('buildPromptEvalWorkGraphFixtureCatalog', () => {
  it('lists mandatory and optional Work Graph prompt eval fixtures', () => {
    const catalog = buildPromptEvalWorkGraphFixtureCatalog();

    assert.equal(catalog.schema, 'prompt-eval.workgraph.fixtures.v1');
    assert.ok(catalog.mandatoryCount >= 2);
    assert.ok(catalog.optionalCount >= 2);
    assert.ok(catalog.fixtures.some((fixture) => fixture.id === 'claim-no-eligible'));
    assert.ok(catalog.fixtures.some((fixture) => fixture.id === 'blocked-onebase-go-preflight'));
  });
});
