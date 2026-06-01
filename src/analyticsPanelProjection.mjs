import { readAnalyticsRecordJournal } from './analyticsRecordStore.mjs';
import { attachRelatedWorkItemsToAnalyticsRecords } from './analyticsRecordWorkItems.mjs';
import { readWorkItemsFromRepo } from './intentTreeWorkItems.mjs';
import { buildIntentGraphProjection, attachIntentGraphToAnalyticsRecords } from './intentGraphProjection.mjs';
import { readIntentNodesFromRepo } from './intentNodeRuntime.mjs';

export const ANALYTICS_PANEL_PROJECTION_SCHEMA = 'analytics-panel.projection.v1';
export const ANALYTICS_RECORDS_API_SCHEMA = 'analytics-records.api.v1';
export const DEFAULT_ANALYTICS_RECORDS_LIMIT = 50;
export const ANALYTICS_RECORD_KIND_INTAKE = 'intake';
export const ANALYTICS_RECORD_KIND_CLOSING = 'closing';

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

/**
 * Intake AN (prospective analysis) vs closing AN (epic post-mortem).
 * Do not use feeds_epics or closing-analysis tag alone — intake may discuss or feed epics (AN-22, AN-25).
 */
export function inferAnalyticsRecordKind(record) {
  if (!record || typeof record !== 'object') {
    return ANALYTICS_RECORD_KIND_INTAKE;
  }

  const id = String(record.id ?? '').trim().toLowerCase();
  const bodyPath = String(record.bodyPath ?? '').trim().toLowerCase();
  const title = String(record.title ?? '').trim().toLowerCase();

  if (
    id.includes('closing-')
    || bodyPath.includes('/closing-')
    || bodyPath.includes('closing-epic')
  ) {
    return ANALYTICS_RECORD_KIND_CLOSING;
  }

  if (/^an-\d+:\s*closing\b/iu.test(title)) {
    return ANALYTICS_RECORD_KIND_CLOSING;
  }

  return ANALYTICS_RECORD_KIND_INTAKE;
}

export function attachAnalyticsRecordKind(record) {
  return {
    ...record,
    recordKind: inferAnalyticsRecordKind(record),
  };
}

export function filterAnalyticsRecordsByKind(records, kind) {
  if (!Array.isArray(records)) {
    throw new TypeError('records must be an array');
  }

  const normalizedKind = String(kind ?? '').trim();
  if (normalizedKind === '') {
    return records;
  }

  return records.filter((record) => inferAnalyticsRecordKind(record) === normalizedKind);
}

function summarizeRecords(records) {
  const byTopic = {};
  const byStatus = {};
  const byKind = {
    [ANALYTICS_RECORD_KIND_INTAKE]: 0,
    [ANALYTICS_RECORD_KIND_CLOSING]: 0,
  };

  for (const record of records) {
    byTopic[record.topic] = (byTopic[record.topic] ?? 0) + 1;
    byStatus[record.status] = (byStatus[record.status] ?? 0) + 1;
    const kind = inferAnalyticsRecordKind(record);
    byKind[kind] = (byKind[kind] ?? 0) + 1;
  }

  return {
    total: records.length,
    byTopic,
    byStatus,
    byKind,
  };
}

export function assignAnalyticsRecordKeys(records) {
  if (!Array.isArray(records)) {
    throw new TypeError('records must be an array');
  }

  if (records.length === 0) {
    return [];
  }

  const sorted = [...records].sort((left, right) => {
    const createdCmp = String(left.createdAt ?? '').localeCompare(
      String(right.createdAt ?? ''),
      'en',
      { sensitivity: 'variant' },
    );
    if (createdCmp !== 0) {
      return createdCmp;
    }

    return compareText(left.id, right.id);
  });

  const ordinalById = new Map();
  sorted.forEach((record, index) => {
    ordinalById.set(record.id, index + 1);
  });

  return records.map((record) => ({
    ...record,
    key: String(record.key ?? '').trim() || `AN-${ordinalById.get(record.id)}`,
  }));
}

export function sortAnalyticsRecordsByRecencyDesc(records) {
  if (!Array.isArray(records)) {
    throw new TypeError('records must be an array');
  }

  return [...records].sort((left, right) => {
    const createdCmp = String(right.createdAt ?? '').localeCompare(
      String(left.createdAt ?? ''),
      'en',
      { sensitivity: 'variant' },
    );
    if (createdCmp !== 0) {
      return createdCmp;
    }

    return compareText(right.id, left.id);
  });
}

export function filterAnalyticsRecords(records, options = {}) {
  if (!Array.isArray(records)) {
    throw new TypeError('records must be an array');
  }

  let filtered = records;
  const topic = String(options.topic ?? '').trim();
  if (topic !== '') {
    filtered = filtered.filter((record) => record.topic === topic);
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
    topic: topic || null,
  };
}

export function buildAnalyticsPanelProjectionFromRecords(records, options = {}) {
  const keyedRecords = assignAnalyticsRecordKeys(records).map((record) => attachAnalyticsRecordKind(record));
  const summary = summarizeRecords(keyedRecords);
  const orderedRecords = sortAnalyticsRecordsByRecencyDesc(keyedRecords);

  return {
    schema: ANALYTICS_PANEL_PROJECTION_SCHEMA,
    readOnly: true,
    source: options.source ?? 'analytics-records-journal',
    summary,
    records: orderedRecords,
    filters: {
      topics: Object.keys(summary.byTopic).sort(),
      statuses: Object.keys(summary.byStatus).sort(),
    },
  };
}

export async function buildAnalyticsRecordsApiResponse(options = {}) {
  const journal = await readAnalyticsRecordJournal(options);
  const keyedRecords = assignAnalyticsRecordKeys(journal.records).map((record) => attachAnalyticsRecordKind(record));
  const orderedRecords = sortAnalyticsRecordsByRecencyDesc(keyedRecords);
  const filtered = filterAnalyticsRecords(orderedRecords, {
    topic: options.topic,
    limit: options.limit ?? DEFAULT_ANALYTICS_RECORDS_LIMIT,
  });

  return {
    schema: ANALYTICS_RECORDS_API_SCHEMA,
    count: filtered.records.length,
    truncated: filtered.truncated,
    topic: filtered.topic,
    limit: filtered.limit,
    records: filtered.records,
  };
}

export async function buildAnalyticsPanelProjection(options = {}) {
  const journal = await readAnalyticsRecordJournal(options);
  const projection = buildAnalyticsPanelProjectionFromRecords(journal.records, options);
  const workItems = await readWorkItemsFromRepo(options);
  const intentNodes = await readIntentNodesFromRepo(options);
  const intentGraph = buildIntentGraphProjection(intentNodes, workItems, options);
  const withWorkItems = attachRelatedWorkItemsToAnalyticsRecords(projection.records, workItems);
  return {
    ...projection,
    intentGraphSchema: intentGraph.schema,
    records: attachIntentGraphToAnalyticsRecords(withWorkItems, intentGraph),
  };
}
