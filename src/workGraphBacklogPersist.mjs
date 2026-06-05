import { readFile, rename, writeFile } from 'node:fs/promises';

import { buildWorkGraphWriteAuditLabels } from './workGraphWriteAudit.mjs';

const STEP_ATOM_PATTERN = /^#([^\n<]+)<\[\n([\s\S]*?)\n\]>/gmu;

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function findWorkItemAtomSpan(backlogText, workId) {
  if (typeof backlogText !== 'string') {
    throw new TypeError('backlogText must be a string');
  }

  const normalizedWorkId = String(workId ?? '').trim();
  if (normalizedWorkId === '') {
    throw new TypeError('workId must be a non-empty string');
  }

  for (const match of backlogText.matchAll(STEP_ATOM_PATTERN)) {
    const body = match[2];
    const idMatch = body.match(/^\s*work\.id:\s*(.+)$/m);
    if (idMatch?.[1]?.trim() === normalizedWorkId) {
      return {
        start: match.index,
        end: match.index + match[0].length,
        atomName: match[1],
        body,
        fullMatch: match[0],
      };
    }
  }

  return null;
}

function upsertLabelLine(body, key, value) {
  const pattern = new RegExp(`^(\\s*)${escapeRegex(key)}:\\s*.+$`, 'm');
  const line = `  ${key}: ${value}`;

  if (pattern.test(body)) {
    return body.replace(pattern, line);
  }

  const labelsMatch = body.match(/^(\s*)Метки:\s*$/m);
  if (labelsMatch) {
    const insertAt = labelsMatch.index + labelsMatch[0].length;
    return `${body.slice(0, insertAt)}\n${line}${body.slice(insertAt)}`;
  }

  return `${body.trimEnd()}\n\nМетки:\n${line}`;
}

function removeLabelLine(body, key) {
  const pattern = new RegExp(`^\\s*${escapeRegex(key)}:\\s*.+\\n?`, 'm');
  return body.replace(pattern, '');
}

function parseEvidenceLinesFromBody(body) {
  const lines = [];
  let inEvidence = false;

  for (const rawLine of body.split(/\r?\n/u)) {
    const trimmed = rawLine.trim();

    if (trimmed === 'Свидетельства:') {
      inEvidence = true;
      continue;
    }

    if (!inEvidence) {
      continue;
    }

    if (trimmed === '') {
      continue;
    }

    if (/^[A-Za-zА-Яа-яЁё_]+:$/u.test(trimmed) && trimmed !== 'критерии_готовности:') {
      inEvidence = false;
      continue;
    }

    if (/^-\s*/u.test(trimmed) || rawLine.startsWith('  ')) {
      lines.push(trimmed.replace(/^-\s*/u, '').trim());
      continue;
    }

    inEvidence = false;
  }

  return lines;
}

function appendEvidenceLines(body, newLines) {
  const existing = new Set(parseEvidenceLinesFromBody(body));
  const toAdd = newLines
    .map((line) => String(line ?? '').trim())
    .filter((line) => line !== '' && !existing.has(line));

  if (toAdd.length === 0) {
    return body;
  }

  const formatted = toAdd.map((line) => `  - ${line}`);
  const evidenceHeader = body.match(/^(\s*)Свидетельства:\s*$/m);

  if (!evidenceHeader) {
    return `${body.trimEnd()}\n\nСвидетельства:\n${formatted.join('\n')}`;
  }

  const bodyLines = body.split(/\r?\n/u);
  let evidenceStartIdx = -1;
  let insertIdx = -1;

  for (let index = 0; index < bodyLines.length; index += 1) {
    if (bodyLines[index].trim() === 'Свидетельства:') {
      evidenceStartIdx = index;
      insertIdx = index + 1;
      continue;
    }

    if (evidenceStartIdx < 0 || index <= evidenceStartIdx) {
      continue;
    }

    const trimmed = bodyLines[index].trim();
    if (trimmed === '') {
      continue;
    }

    if (/^[A-Za-zА-Яа-яЁё_]+:$/u.test(trimmed) && trimmed !== 'критерии_готовности:') {
      break;
    }

    if (/^-\s*/u.test(trimmed) || bodyLines[index].startsWith('  ')) {
      insertIdx = index + 1;
      continue;
    }

    break;
  }

  bodyLines.splice(insertIdx, 0, ...formatted);
  return bodyLines.join('\n');
}

function applyWriteAuditLabels(body, writeAudit) {
  let next = body;
  for (const [key, value] of Object.entries(writeAudit)) {
    next = upsertLabelLine(next, key, String(value).trim());
  }
  return next;
}

export function patchWorkItemAtomBody(body, item, options = {}) {
  if (!item || typeof item !== 'object') {
    throw new TypeError('item must be an object');
  }

  let next = upsertLabelLine(body, 'work.status', item.status);

  const closedAt = String(item.labels?.['work.closed_at'] ?? item.closedAt ?? '').trim();
  if (closedAt !== '') {
    next = upsertLabelLine(next, 'work.closed_at', closedAt);
  }

  if (item.status === 'blocked' && item.blocker) {
    next = upsertLabelLine(next, 'work.blocker', item.blocker);
  } else {
    next = removeLabelLine(next, 'work.blocker');
    next = removeLabelLine(next, 'work.blocked_reason');
  }

  if (Array.isArray(item.evidence) && item.evidence.length > 0) {
    next = appendEvidenceLines(next, item.evidence);
  }

  const activeClaimStatuses = new Set(['claimed', 'doing', 'in_progress']);
  if (activeClaimStatuses.has(item.status)) {
    const claimedBy = String(item.labels?.['work.claimed_by'] ?? '').trim();
    const leaseUntil = String(item.labels?.['work.claim_lease_until'] ?? '').trim();
    if (claimedBy !== '') {
      next = upsertLabelLine(next, 'work.claimed_by', claimedBy);
    }
    if (leaseUntil !== '') {
      next = upsertLabelLine(next, 'work.claim_lease_until', leaseUntil);
    }
  } else {
    next = removeLabelLine(next, 'work.claimed_by');
    next = removeLabelLine(next, 'work.claim_lease_until');
  }

  const writeAudit = options.writeAudit
    ?? (options.audit ? buildWorkGraphWriteAuditLabels(options.audit) : null);
  if (writeAudit) {
    next = applyWriteAuditLabels(next, writeAudit);
  }

  return next;
}

export function patchWorkItemInBacklogText(backlogText, item, options = {}) {
  const span = findWorkItemAtomSpan(backlogText, item.id);
  if (!span) {
    throw new Error(`work item atom not found: ${item.id}`);
  }

  const patchedBody = patchWorkItemAtomBody(span.body, item, options);
  const patchedAtom = `#${span.atomName}<[\n${patchedBody}\n]>`;
  return `${backlogText.slice(0, span.start)}${patchedAtom}${backlogText.slice(span.end)}`;
}

export async function writeBacklogTextAtomically(backlogPath, backlogText) {
  const tempPath = `${backlogPath}.tmp`;
  await writeFile(tempPath, backlogText, 'utf8');
  await rename(tempPath, backlogPath);
}

export function appendWorkItemAtomToBacklogText(backlogText, atomText) {
  if (typeof backlogText !== 'string') {
    throw new TypeError('backlogText must be a string');
  }

  const atom = String(atomText ?? '').trim();
  if (atom === '') {
    throw new TypeError('atomText must be a non-empty string');
  }

  const trimmedBacklog = backlogText.trimEnd();
  return `${trimmedBacklog}\n\n${atom}\n`;
}

export async function persistWorkItemUpdateToBacklogFile(options = {}) {
  const backlogPath = options.backlogPath;
  if (!backlogPath) {
    throw new TypeError('backlogPath is required');
  }

  const item = options.item;
  if (!item?.id) {
    throw new TypeError('item.id is required');
  }

  const sourceText = options.backlogText ?? await readFile(backlogPath, 'utf8');
  const newText = patchWorkItemInBacklogText(sourceText, item);
  await writeBacklogTextAtomically(backlogPath, newText);

  return {
    path: backlogPath,
    workId: item.id,
    status: item.status,
  };
}
