import { buildCodegenVerificationGate } from './codegenEvidence.mjs';
import { buildWorkItemContractV1 } from './workItemContractProjection.mjs';
import { buildContractHealthSummary, evaluateWorkItemReadyForDone } from './workItemReadyForDone.mjs';

/** @typedef {'deterministic' | 'optional-env' | 'optional-llm'} VerificationTier */
/** @typedef {'passed' | 'pending' | 'blocked' | 'not_run' | 'failed'} VerificationStatus */

/** @type {Array<{ id: string, tier: VerificationTier, title: string, command: string, gateTaskIds: string[], evidenceHints: string[] }>} */
export const VERIFICATION_MATRIX = [
  {
    id: 'formatter-roundtrip',
    tier: 'deterministic',
    title: 'Roundtrip форматтера Step Atom',
    command: 'npm run test:deterministic',
    gateTaskIds: ['implement-step-atom-formatter'],
    evidenceHints: ['formatter', 'roundtrip', 'npm test'],
  },
  {
    id: 'workgraph-runtime',
    tier: 'deterministic',
    title: 'Политика runtime Work Graph',
    command: 'npm run test:deterministic',
    gateTaskIds: ['implement-workgraph-minimal-runtime'],
    evidenceHints: ['claimNext', 'transitionStatus', 'npm test'],
  },
  {
    id: 'trace-links-v1',
    tier: 'deterministic',
    title: 'Валидатор Trace Links v1',
    command: 'npm run test:deterministic',
    gateTaskIds: ['implement-step-code-trace-link-validator'],
    evidenceHints: ['Trace Links', 'validateTraceLinksV1', 'npm test'],
  },
  {
    id: 'ui-server-smoke',
    tier: 'deterministic',
    title: 'Smoke UI-сервера backlog',
    command: 'npm run test:deterministic',
    gateTaskIds: ['implement-workgraph-minimal-runtime', 'implement-schematic-visualization-view-mvp'],
    evidenceHints: ['workGraphBacklogUiServer', 'renderBacklogHtml', 'npm test'],
  },
  {
    id: 'golden-path-runtime',
    tier: 'deterministic',
    title: 'Сценарий golden path runtime',
    command: 'npm run test:deterministic',
    gateTaskIds: ['golden-path-test'],
    evidenceHints: ['goldenPath', 'runDeterministicGoldenPath', 'npm test'],
  },
  {
    id: 'onebase-gross-profit-static',
    tier: 'deterministic',
    title: 'OneBase: статическая проверка артефакта валовой прибыли',
    command: 'npm run test:deterministic',
    gateTaskIds: ['onebase-implement-gross-profit-warehouse-dimension'],
    evidenceHints: ['verifyOnebaseGrossProfitWarehouseArtifacts', 'валовая_прибыль', 'ДвВП.Склад'],
  },
  {
    id: 'onebase-go-test',
    tier: 'optional-env',
    title: 'OneBase golden path (go test)',
    command: 'npm run test:optional:onebase',
    gateTaskIds: ['onebase-verification-command', 'onebase-implement-gross-profit-warehouse-dimension'],
    evidenceHints: ['go test', 'go version', 'CommandNotFoundException', 'blocked evidence'],
  },
  {
    id: 'onebase-config-check',
    tier: 'optional-env',
    title: 'OneBase config check (CLI)',
    command: 'npm run test:optional:onebase-check',
    gateTaskIds: ['wire-onebase-cli-tools-parity', 'implement-onebase-check-verification-gate'],
    evidenceHints: ['onebase check', 'config-check', 'cli_command_unavailable', 'skipped'],
  },
  {
    id: 'lowcode-arch-scaffold',
    tier: 'optional-env',
    title: 'Low-code: verify scaffold arch-rules',
    command: 'npm run verify:lowcode',
    gateTaskIds: ['implement-lowcode-scaffold-cli-mvp'],
    evidenceHints: ['scaffold:arch-rules', 'arch-rules.bvc', 'manifest.json'],
  },
  {
    id: 'onebase-llm-scenario',
    tier: 'optional-llm',
    title: 'OneBase: сценарий с реальной LLM',
    command: 'вручную / будущий optional eval',
    gateTaskIds: ['onebase-posting-rule-golden-path'],
    evidenceHints: ['real LLM', 'tool-call', 'optional'],
  },
];

/**
 * @param {{ items?: Array<{ id: string, status: string, evidence?: string[], blocker?: string, title?: string, nextAction?: string }> }} workGraphSnapshot
 */
export function buildVerificationSummary(workGraphSnapshot, options = {}) {
  const items = Array.isArray(options.items) ? options.items : (workGraphSnapshot?.items ?? []);
  const itemById = new Map(items.map((item) => [item.id, item]));

  const matrix = VERIFICATION_MATRIX.map((row) => ({
    ...row,
    status: deriveMatrixRowStatus(row, itemById),
    gateTasks: row.gateTaskIds.map((taskId) => summarizeGateTask(itemById.get(taskId))),
  }));

  const tierCounts = summarizeTierCounts(matrix);
  const onebaseGate = matrix.find((row) => row.id === 'onebase-go-test') ?? null;
  const codegenGate = buildCodegenVerificationGate(items);
  const contractSummaries = items
    .filter((item) => VERIFICATION_MATRIX.some((row) => row.gateTaskIds.includes(item.id)))
    .slice(0, 24)
    .map((item) => {
      const contract = buildWorkItemContractV1(item);
      const readiness = evaluateWorkItemReadyForDone(item, { allItems: items });
      return {
        workId: item.id,
        title: item.title,
        status: item.status,
        contract,
        readiness: {
          ok: readiness.ok,
          violationCount: readiness.violations.length,
          violations: readiness.violations,
          suggestedCommands: readiness.suggestedCommands,
        },
      };
    });
  const contractHealth = buildContractHealthSummary(items);

  return {
    schema: 'verification.summary.v1',
    tierCounts,
    matrix,
    onebaseGate: onebaseGate
      ? {
          status: onebaseGate.status,
          preflightCommand: 'go version',
          primaryCommand: 'go test ./...',
          cwd: '../onebase',
          blockedTaskId: items.find((item) => item.id === 'onebase-implement-gross-profit-warehouse-dimension' && item.status === 'blocked')?.id ?? null,
        }
      : null,
    codegenGate,
    contractSummaries,
    contractHealth,
    policy: {
      deterministicCommand: 'npm run test:deterministic',
      optionalOnebaseCommand: 'npm run test:optional:onebase',
      optionalOnebaseCheckCommand: 'npm run test:optional:onebase-check',
      protocolPath: 'protocols/rebuild-verification-loop.bvc',
    },
  };
}

/**
 * @param {typeof VERIFICATION_MATRIX[number]} row
 * @param {Map<string, object>} itemById
 * @returns {VerificationStatus}
 */
function deriveMatrixRowStatus(row, itemById) {
  const gateTasks = row.gateTaskIds.map((id) => itemById.get(id)).filter(Boolean);
  if (gateTasks.length === 0) return 'pending';

  if (row.tier === 'optional-llm') {
    return gateTasks.some((task) => task.status === 'done' && hasEvidenceMatch(task, row.evidenceHints))
      ? 'passed'
      : 'not_run';
  }

  if (row.tier === 'optional-env') {
    const blocked = gateTasks.find((task) => task.status === 'blocked');
    if (blocked && mentionsAny(blocked, ['go', 'PATH', 'CommandNotFound', 'blocked evidence'])) {
      return 'blocked';
    }
    if (gateTasks.some((task) => task.status === 'done' && hasEvidenceMatch(task, row.evidenceHints))) {
      return 'passed';
    }
    return gateTasks.some((task) => task.status === 'done') ? 'pending' : 'not_run';
  }

  const allDone = row.gateTaskIds.every((taskId) => {
    const task = itemById.get(taskId);
    return task && ['done', 'verified'].includes(task.status);
  });
  if (!allDone) return 'pending';

  const evidenceOk = gateTasks.some((task) => hasEvidenceMatch(task, row.evidenceHints) || (task.evidence || []).length > 0);
  return evidenceOk ? 'passed' : 'pending';
}

/** @param {object | undefined} task */
function summarizeGateTask(task) {
  if (!task) {
    return { id: null, status: 'missing', evidenceCount: 0 };
  }
  return {
    id: task.id,
    status: task.status,
    title: task.title,
    evidenceCount: (task.evidence || []).length,
  };
}

/** @param {object} task @param {string[]} hints */
function hasEvidenceMatch(task, hints) {
  const haystack = [(task.evidence || []).join('\n'), task.blocker, task.nextAction].filter(Boolean).join('\n').toLowerCase();
  return hints.some((hint) => haystack.includes(hint.toLowerCase()));
}

/** @param {object} task @param {string[]} needles */
function mentionsAny(task, needles) {
  const haystack = [(task.evidence || []).join('\n'), task.blocker, task.nextAction, task.title].filter(Boolean).join('\n').toLowerCase();
  return needles.some((needle) => haystack.includes(needle.toLowerCase()));
}

/** @param {Array<{ tier: VerificationTier, status: VerificationStatus }>} matrix */
function summarizeTierCounts(matrix) {
  const countTier = (tier) => ({
    passed: matrix.filter((row) => row.tier === tier && row.status === 'passed').length,
    pending: matrix.filter((row) => row.tier === tier && row.status === 'pending').length,
    blocked: matrix.filter((row) => row.tier === tier && row.status === 'blocked').length,
    notRun: matrix.filter((row) => row.tier === tier && row.status === 'not_run').length,
    total: matrix.filter((row) => row.tier === tier).length,
  });

  return {
    deterministic: countTier('deterministic'),
    optionalEnv: countTier('optional-env'),
    optionalLlm: countTier('optional-llm'),
  };
}
