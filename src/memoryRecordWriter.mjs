import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

export const MEMORY_RECORD_JOURNAL_SCHEMA = 'memory-record.journal.v1';
export const MEMORY_RECORD_JOURNAL_APPEND_SCHEMA = 'memory-record.journal.append.v1';
export const MEMORY_RECORD_JOURNAL_READ_SCHEMA = 'memory-record.journal.read.v1';
export const DEFAULT_MEMORY_RECORD_JOURNAL_PATH = 'work/memory-records.jsonl';

const POLICY_ALLOWED_TRANSITION_STATUSES = new Set(['done', 'verified']);

function stableMemoryId(sourceWorkItem, type, summary) {
  const slug = String(summary ?? '').toLowerCase().replace(/[^a-z0-9]+/gu, '-').slice(0, 32);
  return `mem:${sourceWorkItem}:${type}:${slug || 'record'}`;
}

function inferMemoryType(item) {
  const searchable = `${item.title} ${item.goal} ${item.vector}`.toLowerCase();
  if (/risk|риск/u.test(searchable)) {
    return 'risk';
  }

  if (/invariant|инвариант/u.test(searchable)) {
    return 'invariant';
  }

  if (/decision|решени/u.test(searchable)) {
    return 'decision';
  }

  if (/architecture|архитектур/u.test(searchable)) {
    return 'architecture-fact';
  }

  return 'evidence-summary';
}

export function buildMemoryRecordFromWorkItem(item, options = {}) {
  if (item === undefined || item === null) {
    throw new TypeError('item is required');
  }

  const type = options.type ?? inferMemoryType(item);
  const summary = options.summary ?? (item.goal || item.title || item.id);
  const status = options.status ?? (options.reviewRequired === false ? 'active' : 'draft');
  const evidenceIds = (item.evidence ?? []).map((_, index) => `${item.id}:legacy-evidence:${index + 1}`);

  return {
    schema: 'memory-record.v1',
    id: options.id ?? stableMemoryId(item.id, type, summary),
    type,
    summary: String(summary).trim(),
    sourceWorkItem: item.id,
    confidence: options.confidence ?? 'medium',
    status,
    updatedAt: options.updatedAt ?? null,
    basisLink: item.basis ? `work:${item.id}:basis` : '',
    vectorLink: item.vector ? `work:${item.id}:vector` : '',
    goalLink: item.goal ? `work:${item.id}:goal` : '',
    evidenceIds: [...evidenceIds].sort(compareText),
    relatedFiles: [...(item.targetFiles ?? [])].sort(compareText),
    relatedTasks: [...(item.dependsOn ?? [])].sort(compareText),
    reviewRequired: status === 'draft' || status === 'needs-review',
    dedupKey: `${item.id}\0${type}\0${summary}`,
  };
}

export function buildMemoryRecordCandidatesFromItems(items, options = {}) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  const doneStatuses = new Set(['done', 'verified']);
  const candidates = items
    .filter((item) => doneStatuses.has(item.status))
    .map((item) => buildMemoryRecordFromWorkItem(item, options))
    .sort((left, right) => compareText(left.id, right.id));

  const seen = new Set();
  const deduped = [];
  for (const record of candidates) {
    if (seen.has(record.dedupKey)) {
      continue;
    }

    seen.add(record.dedupKey);
    deduped.push(record);
  }

  return {
    schema: 'memory-record.candidates.v1',
    count: deduped.length,
    reviewRequired: true,
    records: deduped,
  };
}

export function validateMemoryJournalTransition(transition) {
  if (!transition || typeof transition !== 'object') {
    throw new TypeError('transition is required for memory journal append');
  }

  const { kind, sourceWorkItem, toStatus } = transition;
  if (kind !== 'work-item-status') {
    throw new Error(`unsupported memory journal transition kind: ${String(kind)}`);
  }

  if (!sourceWorkItem) {
    throw new TypeError('transition.sourceWorkItem is required');
  }

  if (!POLICY_ALLOWED_TRANSITION_STATUSES.has(toStatus)) {
    throw new Error(`memory journal append blocked: transition toStatus must be done or verified, got ${String(toStatus)}`);
  }

  return true;
}

function normalizeJournalRecord(record, transition, options = {}) {
  if (!record || record.schema !== 'memory-record.v1') {
    throw new TypeError('each journal record must use schema memory-record.v1');
  }

  if (record.sourceWorkItem !== transition.sourceWorkItem) {
    throw new Error(`memory journal record ${record.id} sourceWorkItem must match transition.sourceWorkItem`);
  }

  const updatedAt = options.appendedAt ?? new Date().toISOString();
  return {
    ...record,
    updatedAt: record.updatedAt ?? updatedAt,
  };
}

export function buildMemoryJournalEntry(record, transition, options = {}) {
  validateMemoryJournalTransition(transition);
  const appendedAt = options.appendedAt ?? new Date().toISOString();

  return {
    schema: MEMORY_RECORD_JOURNAL_SCHEMA,
    appendedAt,
    transition: {
      kind: transition.kind,
      sourceWorkItem: transition.sourceWorkItem,
      fromStatus: transition.fromStatus ?? null,
      toStatus: transition.toStatus,
    },
    record: normalizeJournalRecord(record, transition, { appendedAt }),
  };
}

export async function readMemoryRecordJournal(options = {}) {
  const journalPath = resolve(options.cwd ?? process.cwd(), options.journalPath ?? DEFAULT_MEMORY_RECORD_JOURNAL_PATH);

  let text = '';
  try {
    text = await readFile(journalPath, 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return {
        schema: MEMORY_RECORD_JOURNAL_READ_SCHEMA,
        journalPath,
        entryCount: 0,
        entries: [],
        records: [],
      };
    }

    throw error;
  }

  const entries = text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const parsed = JSON.parse(line);
      if (parsed.schema !== MEMORY_RECORD_JOURNAL_SCHEMA) {
        throw new Error(`invalid memory journal entry at line ${index + 1}: expected ${MEMORY_RECORD_JOURNAL_SCHEMA}`);
      }

      return parsed;
    });

  const latestById = new Map();
  for (const entry of entries) {
    latestById.set(entry.record.id, entry.record);
  }

  const records = [...latestById.values()].sort((left, right) => compareText(left.id, right.id));

  return {
    schema: MEMORY_RECORD_JOURNAL_READ_SCHEMA,
    journalPath,
    entryCount: entries.length,
    entries,
    records,
  };
}

export function mergeMemoryJournalWithCandidates(candidates, journalRecords) {
  const candidateList = Array.isArray(candidates) ? candidates : [];
  const journalList = Array.isArray(journalRecords) ? journalRecords : [];
  const merged = new Map();

  for (const record of candidateList) {
    merged.set(record.id, record);
  }

  for (const record of journalList) {
    merged.set(record.id, record);
  }

  return [...merged.values()].sort((left, right) => compareText(left.id, right.id));
}

export async function appendMemoryRecordJournal(records, journalPath, options = {}) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new TypeError('records must be a non-empty array');
  }

  validateMemoryJournalTransition(options.transition);

  const resolvedPath = resolve(options.cwd ?? process.cwd(), journalPath ?? DEFAULT_MEMORY_RECORD_JOURNAL_PATH);
  const appendedAt = options.appendedAt ?? new Date().toISOString();
  const entries = records.map((record) => buildMemoryJournalEntry(record, options.transition, { appendedAt }));

  if (options.dryRun !== true) {
    await mkdir(dirname(resolvedPath), { recursive: true });
    for (const entry of entries) {
      await appendFile(resolvedPath, `${JSON.stringify(entry)}\n`, 'utf8');
    }
  }

  return {
    schema: MEMORY_RECORD_JOURNAL_APPEND_SCHEMA,
    journalPath: resolvedPath,
    appended: entries.length,
    entries,
    records: entries.map((entry) => entry.record),
  };
}
