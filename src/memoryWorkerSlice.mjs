import {
  buildMemoryRecordCandidatesFromItems,
  mergeMemoryJournalWithCandidates,
  readMemoryRecordJournal,
} from './memoryRecordWriter.mjs';

export const MEMORY_WORKER_SLICE_SCHEMA = 'memory-record.worker-slice.v1';

const TYPE_PRIORITY = [
  'invariant',
  'decision',
  'architecture-fact',
  'domain-fact',
  'evidence-summary',
  'risk',
  'open-question',
  'provider-capability',
  'user-preference',
];

const DEFAULT_MAX_RECORDS = 12;
const DEFAULT_MAX_CHARS = 4000;
const DEFAULT_MAX_RELATED_FILES = 8;

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

function typePriorityIndex(type) {
  const index = TYPE_PRIORITY.indexOf(type);
  return index === -1 ? TYPE_PRIORITY.length : index;
}

function statusPriority(status) {
  if (status === 'active') {
    return 0;
  }

  if (status === 'needs-review') {
    return 1;
  }

  if (status === 'draft') {
    return 2;
  }

  return 3;
}

function isRecordRelevant(record, task, itemById) {
  if (record.sourceWorkItem === task.id) {
    return true;
  }

  if (record.relatedTasks?.includes(task.id)) {
    return true;
  }

  const targetFiles = new Set(task.targetFiles ?? []);
  if (record.relatedFiles?.some((path) => targetFiles.has(path))) {
    return true;
  }

  for (const dependencyId of task.dependsOn ?? []) {
    if (record.sourceWorkItem === dependencyId) {
      return true;
    }

    const dependency = itemById.get(dependencyId);
    if (dependency?.dependsOn?.includes(record.sourceWorkItem)) {
      return true;
    }
  }

  return false;
}

function sortRecords(records) {
  return [...records].sort((left, right) => {
    const byType = typePriorityIndex(left.type) - typePriorityIndex(right.type);
    if (byType !== 0) {
      return byType;
    }

    const byStatus = statusPriority(left.status) - statusPriority(right.status);
    if (byStatus !== 0) {
      return byStatus;
    }

    return compareText(left.id, right.id);
  });
}

function applyBudget(records, options = {}) {
  const maxRecords = Number.isInteger(options.maxRecords) && options.maxRecords > 0
    ? options.maxRecords
    : DEFAULT_MAX_RECORDS;
  const maxChars = Number.isInteger(options.maxChars) && options.maxChars > 0
    ? options.maxChars
    : DEFAULT_MAX_CHARS;
  const maxRelatedFiles = Number.isInteger(options.maxRelatedFiles) && options.maxRelatedFiles > 0
    ? options.maxRelatedFiles
    : DEFAULT_MAX_RELATED_FILES;

  const selected = [];
  let summaryChars = 0;
  const relatedFiles = new Set();

  for (const record of sortRecords(records)) {
    if (selected.length >= maxRecords) {
      break;
    }

    const nextSummaryChars = summaryChars + String(record.summary ?? '').length;
    if (nextSummaryChars > maxChars && selected.length > 0) {
      continue;
    }

    const nextRelatedFiles = [...relatedFiles];
    for (const path of record.relatedFiles ?? []) {
      if (!nextRelatedFiles.includes(path)) {
        nextRelatedFiles.push(path);
      }
    }

    if (nextRelatedFiles.length > maxRelatedFiles && selected.length > 0) {
      continue;
    }

    selected.push(record);
    summaryChars = nextSummaryChars;
    for (const path of record.relatedFiles ?? []) {
      relatedFiles.add(path);
    }
  }

  return {
    records: selected,
    truncated: selected.length < records.length,
    summaryChars,
    relatedFileCount: relatedFiles.size,
  };
}

export function selectMemoryRecordsForTask(items, taskId, options = {}) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  const task = items.find((item) => item.id === taskId);
  if (task === undefined) {
    throw new Error(`unknown task id: ${taskId}`);
  }

  const itemById = new Map(items.map((item) => [item.id, item]));
  const derivedCandidates = buildMemoryRecordCandidatesFromItems(items, options.memoryOptions).records;
  const candidates = options.memoryRecords
    ?? mergeMemoryJournalWithCandidates(derivedCandidates, options.journalRecords ?? []);

  const relevant = candidates.filter((record) => {
    if (record.status === 'retired') {
      return false;
    }

    return isRecordRelevant(record, task, itemById);
  });

  return applyBudget(relevant, options);
}

export function buildMemoryWorkerSliceForTask(items, taskId, options = {}) {
  const selection = selectMemoryRecordsForTask(items, taskId, options);

  return {
    schema: MEMORY_WORKER_SLICE_SCHEMA,
    taskId,
    truncated: selection.truncated,
    recordCount: selection.records.length,
    summaryChars: selection.summaryChars,
    relatedFileCount: selection.relatedFileCount,
    budget: {
      maxRecords: options.maxRecords ?? DEFAULT_MAX_RECORDS,
      maxChars: options.maxChars ?? DEFAULT_MAX_CHARS,
      maxRelatedFiles: options.maxRelatedFiles ?? DEFAULT_MAX_RELATED_FILES,
    },
    records: selection.records.map((record) => ({
      id: record.id,
      type: record.type,
      summary: record.summary,
      status: record.status,
      confidence: record.confidence,
      sourceWorkItem: record.sourceWorkItem,
      relatedFiles: [...(record.relatedFiles ?? [])].sort(compareText),
      relatedTasks: [...(record.relatedTasks ?? [])].sort(compareText),
      reviewRequired: Boolean(record.reviewRequired),
    })),
    sourceInputs: [
      'memory-record.candidates.v1',
      'memory-contract-v1',
      ...(options.journalRecords?.length ? ['memory-record.journal.v1'] : []),
    ],
  };
}

export async function buildMemoryWorkerSliceForTaskWithJournal(items, taskId, options = {}) {
  let journalRecords = options.journalRecords;

  if (journalRecords === undefined && options.journalPath) {
    const journal = await readMemoryRecordJournal({
      cwd: options.cwd,
      journalPath: options.journalPath,
    });
    journalRecords = journal.records;
  }

  return buildMemoryWorkerSliceForTask(items, taskId, {
    ...options,
    journalRecords,
  });
}

export function formatMemoryWorkerSliceForPrompt(slice) {
  if (!slice || slice.schema !== MEMORY_WORKER_SLICE_SCHEMA) {
    return '';
  }

  if (!Array.isArray(slice.records) || slice.records.length === 0) {
    return '';
  }

  const lines = [
    'Project memory slice (bounded, memory-contract-v1):',
    `task=${slice.taskId} records=${slice.recordCount}${slice.truncated ? ' truncated=true' : ''}`,
    ...slice.records.map((record) =>
      `- [${record.type}/${record.status}] ${record.summary} (from ${record.sourceWorkItem}, confidence=${record.confidence})`,
    ),
  ];

  return lines.join('\n');
}
