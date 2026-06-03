import { VERIFICATION_MATRIX } from './verificationLoop.mjs';

export const WORK_ITEM_CONTRACT_SCHEMA = 'work-item-contract.v1';

const TIER_RANK = { A: 3, B: 2, C: 1 };

const TIER_LETTER = {
  deterministic: 'A',
  'optional-env': 'B',
  'optional-llm': 'C',
};

function normalizeLines(value) {
  if (Array.isArray(value)) {
    return value.map((line) => String(line).trim()).filter(Boolean);
  }

  return String(value ?? '')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function contextHintFromWorkItem(workItem) {
  const basis = normalizeLines(workItem?.basis);
  if (basis.length > 0) {
    return basis[0].slice(0, 240);
  }

  const vector = normalizeLines(workItem?.vector);
  if (vector.length > 0) {
    return vector[0].slice(0, 240);
  }

  return workItem?.title ?? workItem?.id ?? '';
}

export function hasCodegenGateLabels(workItem) {
  const labels = workItem?.labels ?? {};
  return Boolean(
    labels['trace.codegen_source_step']
    || labels['trace.codegen_integrity_hash']
    || labels['trace.codegen'],
  );
}

/** @param {string} workId */
export function resolveMatrixRowsForWorkId(workId) {
  const normalizedWorkId = String(workId ?? '').trim();
  if (normalizedWorkId === '') {
    return [];
  }

  return VERIFICATION_MATRIX.filter((row) => row.gateTaskIds.includes(normalizedWorkId));
}

/** @param {Array<typeof VERIFICATION_MATRIX[number]>} rows */
export function pickPrimaryMatrixRow(rows) {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }

  const indexById = new Map(VERIFICATION_MATRIX.map((row, index) => [row.id, index]));

  const sorted = [...rows].sort((left, right) => {
    const leftRank = TIER_RANK[TIER_LETTER[left.tier] ?? ''] ?? 0;
    const rightRank = TIER_RANK[TIER_LETTER[right.tier] ?? ''] ?? 0;
    if (rightRank !== leftRank) {
      return rightRank - leftRank;
    }

    const leftIndex = indexById.get(left.id) ?? Number.MAX_SAFE_INTEGER;
    const rightIndex = indexById.get(right.id) ?? Number.MAX_SAFE_INTEGER;
    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return String(left.id).localeCompare(String(right.id), 'en', { sensitivity: 'variant' });
  });

  return sorted[0] ?? null;
}

export function tierLetterFromMatrixRow(row) {
  if (!row) {
    return null;
  }

  return TIER_LETTER[row.tier] ?? null;
}

function buildEvidenceRequired(primaryRow, workItem) {
  const required = [];

  if (primaryRow && primaryRow.command && !/вручную/u.test(primaryRow.command)) {
    required.push({
      type: 'command',
      cmd: primaryRow.command,
      mustPass: true,
    });
  }

  for (const targetFile of workItem?.targetFiles ?? []) {
    required.push({
      type: 'file',
      files: [targetFile],
    });
  }

  return required;
}

/**
 * Pure projection: WorkItem atom + VERIFICATION_MATRIX → work-item-contract.v1
 * @param {object} workItem
 * @param {object} [options]
 */
export function buildWorkItemContractV1(workItem, options = {}) {
  if (!workItem || typeof workItem !== 'object') {
    throw new TypeError('workItem is required');
  }

  const rows = resolveMatrixRowsForWorkId(workItem.id);
  const primaryRow = pickPrimaryMatrixRow(rows);
  const tier = tierLetterFromMatrixRow(primaryRow);
  const checksProse = Array.isArray(workItem.checks)
    ? workItem.checks.map((line) => String(line).trim()).filter(Boolean)
    : [];

  return {
    schema: WORK_ITEM_CONTRACT_SCHEMA,
    workId: workItem.id,
    input: {
      targetFiles: [...(workItem.targetFiles ?? [])],
      dependsOn: [...(workItem.dependsOn ?? [])],
      contextHint: contextHintFromWorkItem(workItem),
    },
    output: {
      evidenceRequired: buildEvidenceRequired(primaryRow, workItem),
      checksProse,
    },
    verification: {
      tier,
      matrixRowId: primaryRow?.id ?? null,
      matrixRowIds: rows.map((row) => row.id),
      codegenGate: hasCodegenGateLabels(workItem),
    },
    meta: {
      readOnly: true,
      source: options.source ?? 'work-item-contract-projection',
    },
  };
}

/** @param {Array<object>} items */
export function buildWorkItemContractsForItems(items, options = {}) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  return items
    .filter((item) => resolveMatrixRowsForWorkId(item.id).length > 0)
    .map((item) => buildWorkItemContractV1(item, options));
}
