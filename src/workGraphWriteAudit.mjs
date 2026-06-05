export const WORKGRAPH_MCP_CHANNEL = 'workgraph-mcp';
export const WORKGRAPH_CLI_CHANNEL = 'workgraph-cli';

export const AUTHORIZED_WRITE_CHANNELS = new Set([
  WORKGRAPH_MCP_CHANNEL,
  WORKGRAPH_CLI_CHANNEL,
]);

export const WRITE_AUDIT_LABELS = {
  updatedBy: 'work.updated_by',
  operation: 'work.write.operation',
  at: 'work.write.at',
  runId: 'work.write.run_id',
  migration: 'work.write.migration',
};

export const WRITE_AUDIT_OPERATIONS = new Set([
  'create',
  'status',
  'claim',
  'evidence',
  'complete',
]);

const CANON_WRITE_DIFF_PATTERN = /work\.(status|id|claimed_by|claim_lease_until|closed_at|blocker)|^\+.*Свидетельства:/mu;
const AUDIT_DIFF_PATTERN = /work\.(updated_by|write\.(at|operation|run_id|migration))/u;

export const CANON_WRITE_BOUNDARY_FIX_HINT = [
  'Do not edit .work.bvc files directly.',
  'Use MCP: create_work_item, claim_work_item, update_work_item_status, add_work_item_evidence, complete_work_item.',
  'See docs/workgraph-mcp-clients.md and prompt create_work_item_from_analytics.',
].join(' ');

export function buildCanonWriteViolation(path, code, message) {
  return {
    ok: false,
    path,
    code,
    message,
    fix: CANON_WRITE_BOUNDARY_FIX_HINT,
  };
}

export function buildWorkGraphWriteAuditLabels({
  channel,
  operation,
  runId,
  at,
  migration,
} = {}) {
  if (migration) {
    return {
      [WRITE_AUDIT_LABELS.migration]: String(migration).trim(),
      [WRITE_AUDIT_LABELS.at]: at ?? new Date().toISOString(),
    };
  }

  const normalizedChannel = String(channel ?? '').trim();
  const normalizedOperation = String(operation ?? '').trim();
  if (normalizedChannel === '' || normalizedOperation === '') {
    throw new TypeError('channel and operation are required for write audit labels');
  }

  return {
    [WRITE_AUDIT_LABELS.updatedBy]: normalizedChannel,
    [WRITE_AUDIT_LABELS.operation]: normalizedOperation,
    [WRITE_AUDIT_LABELS.at]: at ?? new Date().toISOString(),
    ...(runId ? { [WRITE_AUDIT_LABELS.runId]: String(runId).trim() } : {}),
  };
}

export function isAuthorizedCanonWrite(labels = {}) {
  const migration = String(labels[WRITE_AUDIT_LABELS.migration] ?? '').trim();
  if (migration !== '') {
    return true;
  }

  const updatedBy = String(labels[WRITE_AUDIT_LABELS.updatedBy] ?? '').trim();
  const operation = String(labels[WRITE_AUDIT_LABELS.operation] ?? '').trim();
  const at = String(labels[WRITE_AUDIT_LABELS.at] ?? '').trim();

  return AUTHORIZED_WRITE_CHANNELS.has(updatedBy)
    && WRITE_AUDIT_OPERATIONS.has(operation)
    && at !== '';
}

export function diffTouchesCanonWrite(patchText) {
  return CANON_WRITE_DIFF_PATTERN.test(String(patchText ?? ''));
}

export function diffIncludesWriteAudit(patchText) {
  return AUDIT_DIFF_PATTERN.test(String(patchText ?? ''));
}

export function evaluateCanonWriteDiff({ path, patchText, fileText, isNewFile = false } = {}) {
  const normalizedPath = String(path ?? '').replace(/\\/g, '/');
  const patch = String(patchText ?? '');

  if (isNewFile) {
    const labels = extractLabelsFromAtomText(String(fileText ?? ''));
    if (!isAuthorizedCanonWrite(labels)) {
      return buildCanonWriteViolation(
        normalizedPath,
        'missing_write_audit',
        'New canon work item file must include work.updated_by/work.write.* or work.write.migration',
      );
    }
    return { ok: true, path: normalizedPath };
  }

  if (!diffTouchesCanonWrite(patch)) {
    return { ok: true, path: normalizedPath, skipped: true };
  }

  if (diffIncludesWriteAudit(patch)) {
    return { ok: true, path: normalizedPath };
  }

  return buildCanonWriteViolation(
    normalizedPath,
    'unauthorized_canon_write',
    'Canon write diff must include Work Graph audit marker (work.updated_by / work.write.*) or migration label',
  );
}

function extractLabelsFromAtomText(text) {
  const labels = {};
  let inLabels = false;

  for (const rawLine of String(text).split(/\r?\n/u)) {
    const trimmed = rawLine.trim();
    if (trimmed === 'Метки:') {
      inLabels = true;
      continue;
    }

    if (!inLabels) {
      continue;
    }

    if (trimmed === '') {
      continue;
    }

    if (/^[A-Za-zА-Яа-яЁё_]+:$/u.test(trimmed)) {
      break;
    }

    const match = trimmed.match(/^([A-Za-z0-9_.]+):\s*(.+)$/u);
    if (match) {
      labels[match[1]] = match[2].trim();
    }
  }

  return labels;
}
