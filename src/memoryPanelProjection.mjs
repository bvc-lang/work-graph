import { readWorkItemsFromRepo } from './intentTreeWorkItems.mjs';
import {
  buildMemoryRecordCandidatesFromItems,
  mergeMemoryJournalWithCandidates,
  readMemoryRecordJournal,
} from './memoryRecordWriter.mjs';

export const MEMORY_PANEL_PROJECTION_SCHEMA = 'memory-panel.projection.v1';
export const MEMORY_RECORDS_API_SCHEMA = 'memory-records.api.v1';
export const DEFAULT_MEMORY_RECORDS_LIMIT = 50;

function summarizeRecords(records) {
  const byType = {};
  const byStatus = {};

  for (const record of records) {
    byType[record.type] = (byType[record.type] ?? 0) + 1;
    byStatus[record.status] = (byStatus[record.status] ?? 0) + 1;
  }

  return {
    total: records.length,
    byType,
    byStatus,
    reviewRequired: records.filter((record) => record.reviewRequired).length,
  };
}

export async function loadMergedMemoryRecords(options = {}) {
  const items = options.items ?? await readWorkItemsFromRepo(options);
  const candidates = buildMemoryRecordCandidatesFromItems(items, options).records;
  let journalRecords = options.journalRecords;

  if (journalRecords === undefined && options.includeJournal !== false) {
    const journal = await readMemoryRecordJournal(options);
    journalRecords = journal.records;
  }

  return mergeMemoryJournalWithCandidates(candidates, journalRecords ?? []);
}

export function filterMemoryRecords(records, options = {}) {
  if (!Array.isArray(records)) {
    throw new TypeError('records must be an array');
  }

  let filtered = records;
  const workId = String(options.workId ?? '').trim();
  if (workId !== '') {
    filtered = filtered.filter((record) => record.sourceWorkItem === workId);
  }

  const limit = Number.isInteger(options.limit) && options.limit > 0 ? options.limit : null;
  const truncated = limit !== null && filtered.length > limit;
  if (limit !== null) {
    filtered = filtered.slice(0, limit);
  }

  return {
    records: filtered,
    truncated,
    limit: limit ?? filtered.length,
    workId: workId || null,
  };
}

export function buildMemoryPanelProjectionFromRecords(records, options = {}) {
  const summary = summarizeRecords(records);

  return {
    schema: MEMORY_PANEL_PROJECTION_SCHEMA,
    readOnly: true,
    reviewActionsEnabled: false,
    source: options.source ?? 'merged-memory-records',
    summary,
    records,
    filters: {
      types: Object.keys(summary.byType).sort(),
      statuses: Object.keys(summary.byStatus).sort(),
    },
  };
}

export function buildMemoryPanelProjectionFromItems(items, options = {}) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  const candidates = buildMemoryRecordCandidatesFromItems(items, options);
  return buildMemoryPanelProjectionFromRecords(candidates.records, {
    ...options,
    source: 'done-work-items',
  });
}

export async function buildMemoryRecordsApiResponse(options = {}) {
  const records = await loadMergedMemoryRecords(options);
  const filtered = filterMemoryRecords(records, {
    workId: options.workId,
    limit: options.limit ?? DEFAULT_MEMORY_RECORDS_LIMIT,
  });

  return {
    schema: MEMORY_RECORDS_API_SCHEMA,
    count: filtered.records.length,
    truncated: filtered.truncated,
    workId: filtered.workId,
    limit: filtered.limit,
    records: filtered.records,
  };
}

export async function buildMemoryPanelProjection(options = {}) {
  const records = await loadMergedMemoryRecords(options);
  return buildMemoryPanelProjectionFromRecords(records, options);
}
