import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildSnapshot, parseWorkItems } from '../src/workGraphRuntime.mjs';
import { buildVerificationSummary, VERIFICATION_MATRIX } from '../src/verificationLoop.mjs';

const SAMPLE_BACKLOG = `#Задача_done_formatter<[
Базис: Formatter done.
Вектор: Roundtrip.
Цель: Verified.

Метки:
  atom.profile: work_item
  work.id: implement-step-atom-formatter
  work.title: Formatter
  work.status: done
  trace.status: verified
]>

#Задача_blocked_onebase<[
Базис: OneBase blocked.
Вектор: Need go.
Цель: Blocked.

Свидетельства:
  Blocker evidence: go version CommandNotFoundException; go not found in PATH.

Метки:
  atom.profile: work_item
  work.id: onebase-implement-gross-profit-warehouse-dimension
  work.title: OneBase impl
  work.status: blocked
  work.blocker: go not in PATH
  trace.status: pending
]>

#Задача_codegen<[
Базис: Codegen task.
Вектор: Generate.
Цель: Pending.

Метки:
  atom.profile: work_item
  work.id: port-compiler-round-trip-cli-from-iohasc
  work.title: Compiler roundtrip
  work.status: todo
  trace.status: pending
  trace.codegen_source_step: steps/example.bvc
]>
`;

describe('buildVerificationSummary', () => {
  it('builds verification.summary.v1 with deterministic and optional tiers', () => {
    const items = parseWorkItems(SAMPLE_BACKLOG);
    const snapshot = buildSnapshot(items);
    const summary = buildVerificationSummary(snapshot, { items });

    assert.equal(summary.schema, 'verification.summary.v1');
    assert.equal(summary.matrix.length, VERIFICATION_MATRIX.length);
    assert.ok(summary.tierCounts.deterministic.total >= 4);
    assert.equal(summary.policy.deterministicCommand, 'npm run test:deterministic');
    assert.equal(summary.policy.optionalOnebaseCommand, 'npm run test:optional:onebase');
    assert.equal(summary.policy.optionalOnebaseCheckCommand, 'npm run test:optional:onebase-check');
  });

  it('marks OneBase optional gate blocked when go evidence exists', () => {
    const items = parseWorkItems(SAMPLE_BACKLOG);
    const snapshot = buildSnapshot(items);
    const summary = buildVerificationSummary(snapshot, { items });
    const onebaseRow = summary.matrix.find((row) => row.id === 'onebase-go-test');

    assert.ok(onebaseRow);
    assert.equal(onebaseRow.status, 'blocked');
    assert.equal(summary.onebaseGate.status, 'blocked');
    assert.equal(summary.onebaseGate.blockedTaskId, 'onebase-implement-gross-profit-warehouse-dimension');
  });

  it('includes codegenGate for codegen-facing work items', () => {
    const items = parseWorkItems(SAMPLE_BACKLOG);
    const snapshot = buildSnapshot(items);
    const summary = buildVerificationSummary(snapshot, { items });

    assert.ok(summary.codegenGate);
    assert.equal(summary.codegenGate.schema, 'verification.codegen-gate.v1');
    assert.equal(summary.codegenGate.codegenFacingCount, 1);
    assert.equal(summary.codegenGate.status, 'passed');
    assert.equal(summary.codegenGate.passedCount, 1);
    assert.equal(summary.codegenGate.failedCount, 0);
    assert.equal(summary.codegenGate.items[0].workId, 'port-compiler-round-trip-cli-from-iohasc');
  });
});
