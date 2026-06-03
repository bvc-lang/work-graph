import { evaluateParentCloseGate } from './workItemHierarchy.mjs';
import {
  buildWorkItemContractV1,
  resolveMatrixRowsForWorkId,
} from './workItemContractProjection.mjs';
import { VERIFICATION_MATRIX } from './verificationLoop.mjs';

export const WORK_ITEM_READY_FOR_DONE_SCHEMA = 'work-item-ready-for-done.v1';

function normalizeEvidenceLines(item, pendingEvidence) {
  const lines = [...(item?.evidence ?? [])].map((line) => String(line).trim()).filter(Boolean);
  const pending = String(pendingEvidence ?? '').trim();
  if (pending !== '') {
    lines.push(pending);
  }

  return lines;
}

function parseStructuredEvidenceLine(line) {
  const trimmed = String(line ?? '').trim();
  if (!trimmed.startsWith('{')) {
    return null;
  }

  try {
    const parsed = JSON.parse(trimmed);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

function commandEvidenceLooksValid(record) {
  if (!record || typeof record !== 'object') {
    return false;
  }

  const type = String(record.type ?? '').trim();
  if (type !== 'command' && type !== 'test') {
    return false;
  }

  const command = String(record.command ?? record.cmd ?? '').trim();
  if (command === '') {
    return false;
  }

  const exitCode = record.exitCode ?? record.exit_code;
  if (exitCode === undefined || exitCode === null) {
    return false;
  }

  return Number(exitCode) === 0 && String(record.status ?? 'succeeded').trim() !== 'failed';
}

export function legacyEvidenceMatchesTierA(lines, contract) {
  const haystack = lines.join('\n').toLowerCase();
  if (haystack === '') {
    return false;
  }

  if (/exit[_ ]?code\s*=\s*0/u.test(haystack) || /exitcode["']?\s*:\s*0/u.test(haystack)) {
    return true;
  }

  if (/npm test|test:deterministic|go test|passed|green|зелён/u.test(haystack)) {
    return true;
  }

  const rows = resolveMatrixRowsForWorkId(contract.workId);
  const hints = rows.flatMap((row) => row.evidenceHints ?? []);
  if (hints.some((hint) => haystack.includes(String(hint).toLowerCase()))) {
    return true;
  }

  for (const required of contract.output?.evidenceRequired ?? []) {
    const cmd = String(required.cmd ?? '').trim().toLowerCase();
    if (cmd !== '' && haystack.includes(cmd)) {
      return true;
    }
  }

  return false;
}

export function hasTierACommandEvidence(item, contract, pendingEvidence) {
  const lines = normalizeEvidenceLines(item, pendingEvidence);

  for (const line of lines) {
    const structured = parseStructuredEvidenceLine(line);
    if (structured && commandEvidenceLooksValid(structured)) {
      return true;
    }
  }

  return legacyEvidenceMatchesTierA(lines, contract);
}

export function validateEvidenceForContract(evidenceJson, contract, workId) {
  const violations = [];

  if (!evidenceJson || typeof evidenceJson !== 'object') {
    return {
      ok: false,
      violations: [{
        code: 'invalid_evidence_json',
        severity: 'error',
        message: 'evidenceJson must be an object',
        fix: 'pass evidence-record.v1 shaped JSON',
      }],
    };
  }

  const type = String(evidenceJson.type ?? '').trim();
  const status = String(evidenceJson.status ?? '').trim();
  const taskId = String(evidenceJson.taskId ?? workId ?? '').trim();

  if (type === '') {
    violations.push({
      code: 'missing_evidence_type',
      severity: 'error',
      message: 'evidence type is required',
      fix: 'set type to command or test',
    });
  }

  if (status === '') {
    violations.push({
      code: 'missing_evidence_status',
      severity: 'error',
      message: 'evidence status is required',
      fix: 'set status to succeeded',
    });
  } else if (status === 'failed' || status === 'blocked') {
    violations.push({
      code: 'evidence_status_failed',
      severity: 'error',
      message: `evidence status is ${status}`,
      fix: 'provide succeeded evidence',
    });
  }

  if (taskId === '') {
    violations.push({
      code: 'missing_task_id',
      severity: 'error',
      message: 'evidence taskId is required',
      fix: `set taskId to ${workId}`,
    });
  } else if (workId && taskId !== workId) {
    violations.push({
      code: 'task_id_mismatch',
      severity: 'error',
      message: `evidence taskId ${taskId} does not match workId ${workId}`,
      fix: `set taskId to ${workId}`,
    });
  }

  if (type === 'command' || type === 'test') {
    const command = String(evidenceJson.command ?? evidenceJson.cmd ?? '').trim();
    const exitCode = evidenceJson.exitCode ?? evidenceJson.exit_code;

    if (command === '') {
      violations.push({
        code: 'missing_command',
        severity: 'error',
        message: 'command/test evidence requires command',
        fix: 'set command to npm run test:deterministic',
      });
    }

    if (exitCode === undefined || exitCode === null) {
      violations.push({
        code: 'missing_exit_code',
        severity: 'error',
        message: 'command/test evidence requires exitCode',
        fix: 'set exitCode to 0',
      });
    } else if (Number(exitCode) !== 0) {
      violations.push({
        code: 'non_zero_exit_code',
        severity: 'error',
        message: `exitCode must be 0, got ${exitCode}`,
        fix: 'rerun command until exitCode=0',
      });
    }
  }

  if (contract?.verification?.tier === 'A' && (type === 'command' || type === 'test')) {
    const requiredCommands = (contract.output?.evidenceRequired ?? [])
      .filter((entry) => entry.type === 'command')
      .map((entry) => String(entry.cmd ?? '').trim())
      .filter(Boolean);

    const command = String(evidenceJson.command ?? evidenceJson.cmd ?? '').trim();
    if (requiredCommands.length > 0 && command !== '' && !requiredCommands.includes(command)) {
      violations.push({
        code: 'command_not_in_contract',
        severity: 'warn',
        message: `command ${command} is not listed in contract evidenceRequired`,
        fix: `prefer one of: ${requiredCommands.join(', ')}`,
      });
    }
  }

  return {
    ok: violations.every((violation) => violation.severity !== 'error'),
    violations,
  };
}

/**
 * @param {object} workItem
 * @param {object} [options]
 */
export function evaluateWorkItemReadyForDone(workItem, options = {}) {
  if (!workItem || typeof workItem !== 'object') {
    throw new TypeError('workItem is required');
  }

  const allItems = options.allItems ?? [];
  const pendingEvidence = options.pendingEvidence;
  const targetStatus = options.targetStatus ?? 'done';
  const contract = options.contract ?? buildWorkItemContractV1(workItem, options);
  const evidenceLines = normalizeEvidenceLines(workItem, pendingEvidence);
  const violations = [];
  const suggestedCommands = (contract.output?.evidenceRequired ?? [])
    .map((entry) => String(entry.cmd ?? '').trim())
    .filter((cmd) => cmd !== '' && !/вручную/u.test(cmd));

  if (evidenceLines.length === 0) {
    violations.push({
      code: 'missing_evidence',
      severity: 'error',
      message: 'done requires non-empty evidence',
      fix: 'add_work_item_evidence with command output',
    });
  }

  if (contract.verification?.tier === 'A' && !hasTierACommandEvidence(workItem, contract, pendingEvidence)) {
    violations.push({
      code: 'structured_evidence_required',
      severity: 'error',
      message: 'Tier A gate task requires command evidence with exitCode=0 or matching verification hints',
      fix: 'validate_evidence then add structured payload or npm test passed line',
    });
  }

  if (allItems.length > 0 && (targetStatus === 'done' || targetStatus === 'verified')) {
    const parentGate = evaluateParentCloseGate(allItems, workItem, targetStatus);
    if (!parentGate.ok) {
      violations.push({
        code: 'parent_close_blocked',
        severity: 'error',
        message: parentGate.message,
        fix: 'close or block open child WorkItems first',
      });
    }
  }

  const ok = violations.every((violation) => violation.severity !== 'error');

  return {
    schema: WORK_ITEM_READY_FOR_DONE_SCHEMA,
    workId: workItem.id,
    ok,
    violations,
    suggestedCommands: [...new Set(suggestedCommands)],
    contract,
  };
}

export function buildContractHealthSummary(items) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  const gateItems = items.filter((item) => resolveMatrixRowsForWorkId(item.id).length > 0);
  const tierAItems = gateItems.filter((item) => {
    const contract = buildWorkItemContractV1(item);
    return contract.verification?.tier === 'A';
  });

  const structuredCount = tierAItems.filter((item) => hasTierACommandEvidence(item, buildWorkItemContractV1(item))).length;
  const readyCount = gateItems.filter((item) => evaluateWorkItemReadyForDone(item, { allItems: items }).ok).length;

  return {
    schema: 'contract-health.v1',
    gateTaskCount: gateItems.length,
    tierAGateTaskCount: tierAItems.length,
    structuredEvidencePct: tierAItems.length === 0 ? 100 : Math.round((structuredCount / tierAItems.length) * 100),
    contractReadyPct: gateItems.length === 0 ? 100 : Math.round((readyCount / gateItems.length) * 100),
    matrixRowCount: VERIFICATION_MATRIX.length,
  };
}
