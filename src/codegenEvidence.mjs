import { createHash } from 'node:crypto';

import { evaluateBracketIrDrift } from './bracketIrTraceSignal.mjs';

const CODEGEN_KINDS = new Set(['integrity', 'roundtrip', 'generated_test']);
const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

function createStableId(value) {
  return createHash('sha256').update(String(value), 'utf8').digest('hex').slice(0, 16);
}

export function isCodegenFacingWorkItem(item) {
  const labels = item.labels ?? {};
  return Boolean(
    labels['trace.codegen_source_step']
    || labels['trace.codegen_integrity_hash']
    || labels['compiler.mode']
    || labels['trace.bracket_ir_hash'],
  );
}

export function buildCodegenEvidenceRecord({ kind, taskId, summary, status = 'succeeded', artifacts = [], command = '', exitCode = 0, details = {} }) {
  if (!CODEGEN_KINDS.has(kind)) {
    throw new Error(`unsupported codegen evidence kind: ${kind}`);
  }

  const idSuffix = [taskId, kind, summary, ...artifacts].join('\0');

  return {
    schema: 'codegen.evidence.record.v1',
    id: `codegen:${kind}:${createStableId(idSuffix)}`,
    kind,
    taskId,
    summary,
    status,
    artifacts: [...artifacts].sort(compareText),
    command,
    exitCode,
    details: { ...details, codegenKind: kind },
    evidenceV1: {
      type: kind === 'generated_test' || command ? 'test' : 'command',
      summary,
      status: status === 'succeeded' ? 'succeeded' : 'failed',
      artifacts,
      command: command || undefined,
      exitCode: command ? exitCode : undefined,
      details: { codegenKind: kind, ...details },
    },
  };
}

export function buildCodegenRoundtripEvidence(result) {
  const status = result.status === 'passed' ? 'succeeded' : result.status === 'skipped' ? 'skipped' : 'failed';
  return buildCodegenEvidenceRecord({
    kind: 'roundtrip',
    taskId: result.taskId ?? 'unknown',
    summary: result.diffSummary ?? `Compiler round-trip ${result.status} for ${result.stepPath}`,
    status,
    artifacts: [result.stepPath, ...(result.generatedPaths ?? [])].filter(Boolean),
    command: result.command ?? '',
    exitCode: result.exitCode ?? (status === 'succeeded' ? 0 : 1),
    details: {
      stepPath: result.stepPath,
      engineVersion: result.engineVersion ?? '',
      roundtripStatus: result.status,
    },
  });
}

export function buildCodegenIntegrityEvidence({ taskId, integrityHash, artifacts, summary }) {
  return buildCodegenEvidenceRecord({
    kind: 'integrity',
    taskId,
    summary: summary ?? `Codegen integrity hash ${integrityHash}`,
    artifacts,
    details: { integrityHash },
  });
}

export function parseLegacyEvidenceForCodegen(evidenceLines = []) {
  const records = [];
  for (const line of evidenceLines) {
    const text = String(line);
    if (/round[- ]?trip/iu.test(text)) {
      records.push({ kind: 'roundtrip', summary: text });
    } else if (/integrity|hash|drift/iu.test(text)) {
      records.push({ kind: 'integrity', summary: text });
    } else if (/generated test|codegen test/iu.test(text)) {
      records.push({ kind: 'generated_test', summary: text });
    }
  }

  return records;
}

export function evaluateCodegenVerifyGate(item, options = {}) {
  const diagnostics = [];
  const targetStatus = options.targetStatus ?? item.status;

  if (!isCodegenFacingWorkItem(item)) {
    return { ok: true, diagnostics, codegenFacing: false };
  }

  const legacyRecords = parseLegacyEvidenceForCodegen(item.evidence ?? []);
  const structuredRecords = options.codegenEvidence ?? [];
  const allKinds = new Set([
    ...legacyRecords.map((record) => record.kind),
    ...structuredRecords.map((record) => record.kind),
  ]);

  const bracketDrift = evaluateBracketIrDrift(item, options);
  diagnostics.push(...bracketDrift.diagnostics);

  if (targetStatus === 'done' || targetStatus === 'verify') {
    if (!allKinds.has('integrity') && item.labels?.['trace.codegen_integrity_hash']) {
      diagnostics.push({
        severity: 'error',
        code: 'codegen.integrity_missing',
        message: `WorkItem ${item.id} expects integrity evidence for codegen hash label.`,
        actionable: 'Record integrity evidence after reviewing generated output.',
      });
    }

    if (!allKinds.has('roundtrip') && item.labels?.['trace.codegen_source_step']) {
      diagnostics.push({
        severity: 'warning',
        code: 'codegen.roundtrip_missing',
        message: `WorkItem ${item.id} has codegen source step but no roundtrip evidence.`,
        actionable: 'Run compiler round-trip and attach evidence before done.',
      });
    }
  }

  if (item.labels?.['trace.codegen_integrity_hash'] && legacyRecords.some((record) => /drift|mismatch/iu.test(record.summary))) {
    diagnostics.push({
      severity: 'error',
      code: 'codegen.integrity_drift',
      message: `WorkItem ${item.id} reports generated code drift.`,
      actionable: 'Re-run round-trip or update integrity hash after review.',
    });
  }

  const ok = diagnostics.every((diagnostic) => diagnostic.severity !== 'error');
  return { ok, diagnostics, codegenFacing: true, bracketSignal: bracketDrift.signal };
}

export function buildCodegenVerificationGate(items, options = {}) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : 24;
  const evaluations = items
    .map((item) => {
      const gate = evaluateCodegenVerifyGate(item, { targetStatus: item.status });
      if (!gate.codegenFacing) {
        return null;
      }

      return {
        workId: item.id,
        title: item.title ?? item.id,
        status: item.status,
        ok: gate.ok,
        diagnostics: gate.diagnostics,
      };
    })
    .filter(Boolean)
    .sort((left, right) => compareText(left.workId, right.workId));

  const failedCount = evaluations.filter((entry) => !entry.ok).length;
  const passedCount = evaluations.length - failedCount;
  let status = 'not_run';
  if (evaluations.length > 0) {
    status = failedCount === 0 ? 'passed' : 'failed';
  }

  return {
    schema: 'verification.codegen-gate.v1',
    status,
    codegenFacingCount: evaluations.length,
    passedCount,
    failedCount,
    truncated: evaluations.length > limit,
    items: evaluations.slice(0, limit),
  };
}
