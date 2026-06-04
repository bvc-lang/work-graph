import { buildCodegenEvidenceRecord } from './codegenEvidence.mjs';
import { executeIrFlowCfg } from './irFlow/executeIrFlowCfg.mjs';
import { mergePvrgScanFactsWithBatch } from './pvrgCoreScannerAdapter.mjs';

export const SEMANTIC_RUNTIME_STAGE2_SCHEMA = 'semantic.runtime.stage2.v1';

export function runSemanticRuntimeStage2(input = {}) {
  const taskId = String(input.taskId ?? 'unknown');
  const flow = input.flow ?? null;
  const factsBatch = input.factsBatch ?? { facts: [] };
  const scanAdapter = input.scanAdapter ?? null;

  const mergedFacts = scanAdapter
    ? mergePvrgScanFactsWithBatch(factsBatch, scanAdapter)
    : factsBatch;

  const execution = flow ? executeIrFlowCfg(flow, input.context ?? {}) : null;

  const barrier = {
    passed: execution ? execution.status === 'completed' : true,
    reason: execution?.status ?? 'no-flow',
  };

  const shannonMetrics = {
    factCount: mergedFacts.facts?.length ?? 0,
    uniqueLanguages: mergedFacts.summary?.languages?.length ?? 0,
    traceSteps: execution?.trace?.length ?? 0,
  };

  const evidence = buildCodegenEvidenceRecord({
    kind: 'integrity',
    taskId,
    summary: `semantic runtime stage2 ${barrier.passed ? 'passed' : 'blocked'} for ${taskId}`,
    status: barrier.passed ? 'succeeded' : 'failed',
    artifacts: input.artifacts ?? [],
    details: {
      barrier,
      shannonMetrics,
      executionStatus: execution?.status ?? null,
    },
  });

  return {
    schema: SEMANTIC_RUNTIME_STAGE2_SCHEMA,
    taskId,
    barrier,
    shannonMetrics,
    facts: mergedFacts,
    execution,
    evidence,
  };
}
