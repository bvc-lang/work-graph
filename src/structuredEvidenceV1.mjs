import { buildWorkItemContractV1 } from './workItemContractProjection.mjs';
import { legacyEvidenceMatchesTierA, validateEvidenceForContract } from './workItemReadyForDone.mjs';

export const STRUCTURED_EVIDENCE_TYPES = new Set([
  'command',
  'test',
  'file',
  'change',
  'decision',
  'worker-run',
  'manual-review',
  'blocker',
]);

export const STRUCTURED_EVIDENCE_STATUSES = new Set([
  'succeeded',
  'failed',
  'pending',
  'skipped',
  'blocked',
]);

export function isStructuredEvidenceRecord(value) {
  return value && typeof value === 'object' && !Array.isArray(value);
}

export function parseStructuredEvidenceJson(input) {
  if (isStructuredEvidenceRecord(input)) {
    return input;
  }

  const text = String(input ?? '').trim();
  if (text === '') {
    throw new TypeError('structured evidence JSON is required');
  }

  const parsed = JSON.parse(text);
  if (!isStructuredEvidenceRecord(parsed)) {
    throw new TypeError('structured evidence must be a JSON object');
  }

  return parsed;
}

export function validateStructuredEvidenceShape(record) {
  const violations = [];

  if (!isStructuredEvidenceRecord(record)) {
    return [{
      code: 'invalid_structured_evidence',
      severity: 'error',
      message: 'structured evidence must be an object',
      fix: 'pass evidence-record.v1 shaped JSON',
    }];
  }

  const type = String(record.type ?? '').trim();
  if (type === '' || !STRUCTURED_EVIDENCE_TYPES.has(type)) {
    violations.push({
      code: 'invalid_evidence_type',
      severity: 'error',
      message: `type must be one of: ${[...STRUCTURED_EVIDENCE_TYPES].join(', ')}`,
      fix: 'set type to command or test for Tier A gates',
    });
  }

  const status = String(record.status ?? '').trim();
  if (status === '' || !STRUCTURED_EVIDENCE_STATUSES.has(status)) {
    violations.push({
      code: 'invalid_evidence_status',
      severity: 'error',
      message: `status must be one of: ${[...STRUCTURED_EVIDENCE_STATUSES].join(', ')}`,
      fix: 'set status to succeeded',
    });
  }

  if (type === 'command' || type === 'test') {
    const command = String(record.command ?? record.cmd ?? '').trim();
    if (command === '') {
      violations.push({
        code: 'missing_command',
        severity: 'error',
        message: 'command/test evidence requires command',
        fix: 'set command field',
      });
    }

    const exitCode = record.exitCode ?? record.exit_code;
    if (exitCode === undefined || exitCode === null || Number.isNaN(Number(exitCode))) {
      violations.push({
        code: 'missing_exit_code',
        severity: 'error',
        message: 'command/test evidence requires exitCode',
        fix: 'set exitCode to 0',
      });
    }
  }

  return violations;
}

export function normalizeStructuredEvidenceRecord(record, workId) {
  const normalized = { ...record };
  normalized.type = String(normalized.type ?? '').trim();
  normalized.status = String(normalized.status ?? 'succeeded').trim();
  normalized.taskId = String(normalized.taskId ?? workId ?? '').trim();
  normalized.command = String(normalized.command ?? normalized.cmd ?? '').trim();
  if (normalized.command !== '') {
    normalized.cmd = normalized.command;
  }
  if (normalized.exitCode === undefined && normalized.exit_code !== undefined) {
    normalized.exitCode = normalized.exit_code;
  }
  if (normalized.summary === undefined || String(normalized.summary).trim() === '') {
    normalized.summary = normalized.command !== ''
      ? `${normalized.command} exitCode=${normalized.exitCode ?? 0}`
      : `${normalized.type} evidence`;
  }
  return normalized;
}

export function formatStructuredEvidenceStorageLine(record, workId) {
  const normalized = normalizeStructuredEvidenceRecord(record, workId);
  return JSON.stringify(normalized);
}

export function extractStructuredEvidenceRecords(item) {
  const records = [];

  for (const line of item?.evidence ?? []) {
    const trimmed = String(line).trim();
    if (!trimmed.startsWith('{')) {
      continue;
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (isStructuredEvidenceRecord(parsed)) {
        records.push(parsed);
      }
    } catch {
      // ignore malformed JSON evidence lines
    }
  }

  return records;
}

/**
 * Prepare evidence lines to append with optional Tier A strict validation.
 */
export function prepareWorkItemEvidenceAppend(item, args = {}, options = {}) {
  const workId = item.id;
  const allItems = options.allItems ?? [item];
  const contract = options.contract ?? buildWorkItemContractV1(item, { allItems });
  const strictTierA = contract.verification?.tier === 'A';
  const prose = String(args.evidence ?? args.summary ?? '').trim();
  const hasStructuredInput = args.structuredEvidence !== undefined
    || args.structured_evidence !== undefined
    || args.evidenceJson !== undefined;

  let structuredRecord = null;
  if (hasStructuredInput) {
    try {
      structuredRecord = normalizeStructuredEvidenceRecord(
        parseStructuredEvidenceJson(args.structuredEvidence ?? args.structured_evidence ?? args.evidenceJson),
        workId,
      );
    } catch (error) {
      return {
        ok: false,
        schema: 'work-item-evidence-append.v1',
        workId,
        violations: [{
          code: 'invalid_structured_evidence',
          severity: 'error',
          message: error instanceof Error ? error.message : String(error),
          fix: 'pass valid evidence-record.v1 JSON',
        }],
      };
    }

    const shapeViolations = validateStructuredEvidenceShape(structuredRecord);
    const contractValidation = validateEvidenceForContract(structuredRecord, contract, workId);
    const violations = [...shapeViolations, ...contractValidation.violations];
    if (violations.some((violation) => violation.severity === 'error')) {
      return {
        ok: false,
        schema: 'work-item-evidence-append.v1',
        workId,
        violations,
      };
    }

    const jsonLine = formatStructuredEvidenceStorageLine(structuredRecord, workId);
    const lines = [];
    if (prose !== '') {
      lines.push(prose);
    } else if (structuredRecord.summary) {
      lines.push(String(structuredRecord.summary));
    }
    if (!lines.includes(jsonLine)) {
      lines.push(jsonLine);
    }

    return {
      ok: true,
      schema: 'work-item-evidence-append.v1',
      workId,
      lines,
      structured: true,
    };
  }

  if (prose === '') {
    return {
      ok: false,
      schema: 'work-item-evidence-append.v1',
      workId,
      violations: [{
        code: 'missing_evidence',
        severity: 'error',
        message: 'evidence or structuredEvidence is required',
        fix: 'add_work_item_evidence with summary or structuredEvidence',
      }],
    };
  }

  if (strictTierA && !legacyEvidenceMatchesTierA([...(item.evidence ?? []), prose], contract)) {
    return {
      ok: false,
      schema: 'work-item-evidence-append.v1',
      workId,
      violations: [{
        code: 'structured_evidence_required',
        severity: 'error',
        message: 'Tier A gate task requires structuredEvidence or command-compatible prose',
        fix: 'pass structuredEvidence { type, command, exitCode, status, taskId }',
      }],
      contract,
    };
  }

  return {
    ok: true,
    schema: 'work-item-evidence-append.v1',
    workId,
    lines: [prose],
    structured: false,
  };
}

export function validateStructuredEvidenceDraftArray(records) {
  if (records === undefined) {
    return [];
  }

  if (!Array.isArray(records)) {
    return ['structuredEvidence must be an array when provided'];
  }

  const errors = [];
  records.forEach((record, index) => {
    const violations = validateStructuredEvidenceShape(record);
    for (const violation of violations) {
      errors.push(`structuredEvidence[${index}].${violation.code}: ${violation.message}`);
    }
  });

  return errors;
}
