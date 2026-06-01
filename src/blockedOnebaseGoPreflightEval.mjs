import { buildSnapshot, parseWorkItems } from './workGraphRuntime.mjs';
import { buildVerificationSummary } from './verificationLoop.mjs';
import { executeOnebaseVerificationCommand } from './onebaseWorkerTools.mjs';

export const BLOCKED_ONEBASE_GO_PREFLIGHT_EVAL_SCHEMA = 'workgraph.blocked-onebase-go-preflight.eval.v1';

export const BLOCKED_ONEBASE_GO_BACKLOG = `#Задача_blocked_onebase<[
Базис:
  OneBase blocked by missing Go toolchain.
Вектор:
  Record blocked evidence instead of failed verify.
Цель:
  Optional env gate.

Свидетельства:
  Blocker evidence: go version CommandNotFoundException; go not found in PATH; blocked evidence recorded.

Метки:
  atom.profile: work_item
  work.id: onebase-implement-gross-profit-warehouse-dimension
  work.title: OneBase gross profit warehouse
  work.status: blocked
  work.blocker: go not in PATH
  trace.status: verified
]>
`;

export function evaluateBlockedOnebaseGoPreflightDeterministic(options = {}) {
  const items = parseWorkItems(options.backlogText ?? BLOCKED_ONEBASE_GO_BACKLOG);
  const snapshot = buildSnapshot(items);
  const summary = buildVerificationSummary(snapshot, { items });
  const onebaseRow = summary.matrix.find((row) => row.id === 'onebase-go-test');
  const blockedTask = items.find((item) => item.id === 'onebase-implement-gross-profit-warehouse-dimension');
  const combined = JSON.stringify({ summary, onebaseRow, blockedTask });

  const keywordsOk = ['blocked', 'go version', 'preflight'].every((keyword) => {
    if (keyword === 'preflight') {
      return combined.includes('preflightCommand') || combined.toLowerCase().includes('preflight');
    }

    return combined.toLowerCase().includes(keyword.toLowerCase());
  });

  return {
    ok: onebaseRow?.status === 'blocked'
      && summary.onebaseGate?.status === 'blocked'
      && blockedTask?.status === 'blocked'
      && keywordsOk,
    onebaseRowStatus: onebaseRow?.status ?? null,
    onebaseGateStatus: summary.onebaseGate?.status ?? null,
    blockedTaskStatus: blockedTask?.status ?? null,
    preflightCommand: summary.onebaseGate?.preflightCommand ?? null,
    keywordsOk,
  };
}

export function evaluateOnebaseVerificationCommandGoPreflight(options = {}) {
  const spawnSyncImpl = options.spawnSyncImpl ?? (() => ({
    status: 1,
    stdout: '',
    stderr: 'go not found in PATH',
  }));

  const result = executeOnebaseVerificationCommand({
    policy: { allowShell: true },
    onebaseRoot: options.onebaseRoot ?? '../onebase',
    spawnSyncImpl,
  });

  const combined = JSON.stringify(result);
  const keywordsOk = ['go version', 'preflight'].every((keyword) => combined.toLowerCase().includes(keyword));

  return {
    ok: result.ok === false
      && result.blocked !== true
      && result.reason === 'go preflight failed'
      && keywordsOk,
    result,
    keywordsOk,
  };
}

export async function runBlockedOnebaseGoPreflightEval(options = {}) {
  const deterministic = evaluateBlockedOnebaseGoPreflightDeterministic(options);
  const verificationCommand = evaluateOnebaseVerificationCommandGoPreflight(options);

  const ok = deterministic.ok && verificationCommand.ok;

  return {
    schema: BLOCKED_ONEBASE_GO_PREFLIGHT_EVAL_SCHEMA,
    ok,
    failureClass: ok ? null : 'code_failure',
    reason: ok
      ? 'OneBase go preflight blocked path verified deterministically (no live LLM required)'
      : 'blocked-onebase-go-preflight deterministic checks failed',
    deterministic,
    verificationCommand,
    live: null,
  };
}
