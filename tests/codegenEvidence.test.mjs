import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildBracketIrTraceSignal,
  computeBracketIrVectorHash,
  evaluateBracketIrDrift,
  extractBracketVectorFromStepText,
} from '../src/bracketIrTraceSignal.mjs';
import { buildCodeGapBacklogFeed } from '../src/codeGapBacklogFeeder.mjs';
import {
  buildCodegenIntegrityEvidence,
  buildCodegenRoundtripEvidence,
  evaluateCodegenVerifyGate,
  isCodegenFacingWorkItem,
} from '../src/codegenEvidence.mjs';

const SAMPLE_STEP = `#Task<[
Базис:
  Sample.
Вектор:
  bracket: (define foo 1)
Цель:
  Hash.

Метки:
  atom.profile: work_item
  work.id: bracket-task
  trace.bracket_ir_hash: placeholder
]>
`;

describe('computeBracketIrVectorHash', () => {
  it('hashes normalized bracket body with engine version', () => {
    const first = computeBracketIrVectorHash('(define foo 1)');
    const second = computeBracketIrVectorHash('(define foo 1)');

    assert.equal(first.vectorHash, second.vectorHash);
    assert.match(first.vectorHash, /^[a-f0-9]{64}$/u);
  });
});

describe('buildBracketIrTraceSignal', () => {
  it('detects hash drift against stored label', () => {
    const bracketBody = extractBracketVectorFromStepText(SAMPLE_STEP);
    const { vectorHash } = computeBracketIrVectorHash(bracketBody);

    const item = {
      id: 'bracket-task',
      labels: {
        'trace.bracket_ir_hash': 'deadbeef',
        'trace.bracket_ir_step': 'steps/sample.bvc',
      },
    };

    const drift = evaluateBracketIrDrift(item, {
      stepTextByPath: { 'steps/sample.bvc': SAMPLE_STEP },
    });

    assert.equal(drift.ok, false);
    assert.equal(drift.signal.currentHash, vectorHash);
    assert.equal(drift.diagnostics[0].code, 'bracket_ir.hash_drift');
  });

  it('passes when stored hash matches recomputed hash', () => {
    const bracketBody = extractBracketVectorFromStepText(SAMPLE_STEP);
    const { vectorHash } = computeBracketIrVectorHash(bracketBody);
    const item = {
      id: 'bracket-task',
      labels: {
        'trace.bracket_ir_hash': vectorHash,
        'trace.bracket_ir_step': 'steps/sample.bvc',
      },
    };

    const result = buildBracketIrTraceSignal(item, {
      stepTextByPath: { 'steps/sample.bvc': SAMPLE_STEP },
    });

    assert.equal(result.drift, false);
  });
});

describe('codegen evidence contract', () => {
  it('detects codegen-facing work items', () => {
    assert.equal(isCodegenFacingWorkItem({ labels: { 'trace.codegen_source_step': 'steps/foo.bvc' } }), true);
    assert.equal(isCodegenFacingWorkItem({ labels: {} }), false);
  });

  it('builds roundtrip and integrity evidence records', () => {
    const roundtrip = buildCodegenRoundtripEvidence({
      taskId: 'codegen-task',
      stepPath: 'steps/compiler.bvc',
      generatedPaths: ['src/generated.mjs'],
      status: 'passed',
      command: 'npm run iohasc -- step-round-trip steps/compiler.bvc',
      exitCode: 0,
      diffSummary: 'round-trip passed',
    });

    assert.equal(roundtrip.kind, 'roundtrip');
    assert.equal(roundtrip.evidenceV1.type, 'test');

    const integrity = buildCodegenIntegrityEvidence({
      taskId: 'codegen-task',
      integrityHash: 'abc123',
      artifacts: ['src/generated.mjs'],
    });

    assert.equal(integrity.kind, 'integrity');
    assert.equal(integrity.details.integrityHash, 'abc123');
  });

  it('blocks verify when integrity evidence missing for codegen task', () => {
    const item = {
      id: 'codegen-task',
      status: 'verify',
      evidence: [],
      labels: {
        'trace.codegen_integrity_hash': 'abc123',
        'trace.codegen_source_step': 'steps/compiler.bvc',
      },
    };

    const gate = evaluateCodegenVerifyGate(item, { targetStatus: 'verify' });
    assert.equal(gate.ok, false);
    assert.ok(gate.diagnostics.some((diagnostic) => diagnostic.code === 'codegen.integrity_missing'));
  });
});

describe('buildCodeGapBacklogFeed', () => {
  it('maps gap report entries to reviewable work item drafts', () => {
    const feed = buildCodeGapBacklogFeed({
      summary: { untrackedExports: 1, total: 1 },
      entries: [{
        kind: 'untracked_export',
        filePath: 'src/runtime.mjs',
        symbol: 'parseWorkItems',
        reason: 'export without step',
      }],
    });

    assert.equal(feed.schema, 'code-gap.backlog-feed.v1');
    assert.equal(feed.suggestionCount, 1);
    assert.equal(feed.suggestions[0].reviewRequired, true);
    assert.equal(feed.suggestions[0].targetFiles[0], 'src/runtime.mjs');
    assert.equal(feed.suggestions[0].provenance.source, 'code-gap-analyzer');
  });
});
