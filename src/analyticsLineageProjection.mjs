export const ANALYTICS_LINEAGE_PROJECTION_SCHEMA = 'analytics-lineage.projection.v1';

export const ANALYTICS_LINEAGE_RELATIONS = new Set([
  'deepens',
  'related',
  'supersedes',
  'closes',
]);

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

export function normalizeAnalyticsLineage(lineage) {
  if (!lineage || typeof lineage !== 'object' || Array.isArray(lineage)) {
    return null;
  }

  const parentKey = String(lineage.parentKey ?? '').trim();
  const parentId = String(lineage.parentId ?? '').trim();
  const relation = String(lineage.relation ?? '').trim() || (parentKey || parentId ? 'deepens' : '');
  const relatedKeys = [...new Set(
    (Array.isArray(lineage.relatedKeys) ? lineage.relatedKeys : [])
      .map((entry) => String(entry).trim())
      .filter(Boolean),
  )].sort(compareText);

  if (parentKey === '' && parentId === '' && relatedKeys.length === 0) {
    return null;
  }

  const normalized = {};
  if (parentKey !== '') {
    normalized.parentKey = parentKey;
  }
  if (parentId !== '') {
    normalized.parentId = parentId;
  }
  if (relation !== '') {
    normalized.relation = ANALYTICS_LINEAGE_RELATIONS.has(relation) ? relation : 'deepens';
  }
  if (relatedKeys.length > 0) {
    normalized.relatedKeys = relatedKeys;
  }

  return normalized;
}

export function validateAnalyticsLineage(lineage) {
  if (lineage === undefined || lineage === null) {
    return [];
  }

  const errors = [];
  if (typeof lineage !== 'object' || Array.isArray(lineage)) {
    return ['lineage must be an object when provided'];
  }

  const parentKey = String(lineage.parentKey ?? '').trim();
  const parentId = String(lineage.parentId ?? '').trim();
  const relation = String(lineage.relation ?? '').trim();

  if (relation !== '' && !ANALYTICS_LINEAGE_RELATIONS.has(relation)) {
    errors.push(`lineage.relation must be one of: ${[...ANALYTICS_LINEAGE_RELATIONS].join(', ')}`);
  }

  if ((lineage.relatedKeys !== undefined) && !Array.isArray(lineage.relatedKeys)) {
    errors.push('lineage.relatedKeys must be an array when provided');
  }

  if (parentKey === '' && parentId === '' && relation !== '' && relation !== 'related') {
    errors.push('lineage.parentKey or lineage.parentId required when relation implies a parent edge');
  }

  return errors;
}

export function summarizeAnalyticsLineageRecord(record, relation = null) {
  return {
    key: record.key ?? null,
    id: record.id,
    title: record.title ?? record.id,
    ...(relation ? { relation } : {}),
  };
}

export function buildAnalyticsLineageIndexes(records) {
  const byKey = new Map();
  const byId = new Map();
  const childrenByParentKey = new Map();
  const childrenByParentId = new Map();

  for (const record of records) {
    if (record.key) {
      byKey.set(record.key, record);
    }
    if (record.id) {
      byId.set(record.id, record);
    }
  }

  for (const record of records) {
    const lineage = normalizeAnalyticsLineage(record.lineage);
    if (!lineage) {
      continue;
    }

    if (lineage.parentKey) {
      const bucket = childrenByParentKey.get(lineage.parentKey) ?? [];
      bucket.push(record);
      childrenByParentKey.set(lineage.parentKey, bucket);
    }

    if (lineage.parentId) {
      const bucket = childrenByParentId.get(lineage.parentId) ?? [];
      bucket.push(record);
      childrenByParentId.set(lineage.parentId, bucket);
    }
  }

  return {
    byKey,
    byId,
    childrenByParentKey,
    childrenByParentId,
  };
}

function resolveParentRecord(lineage, indexes) {
  if (lineage.parentId && indexes.byId.has(lineage.parentId)) {
    return indexes.byId.get(lineage.parentId);
  }

  if (lineage.parentKey && indexes.byKey.has(lineage.parentKey)) {
    return indexes.byKey.get(lineage.parentKey);
  }

  return null;
}

function resolveContinuations(record, indexes) {
  const seen = new Set();
  const children = [];

  const byKey = indexes.childrenByParentKey.get(record.key ?? '') ?? [];
  const byId = indexes.childrenByParentId.get(record.id ?? '') ?? [];

  for (const child of [...byKey, ...byId]) {
    if (seen.has(child.id)) {
      continue;
    }

    seen.add(child.id);
    const relation = normalizeAnalyticsLineage(child.lineage)?.relation ?? 'deepens';
    children.push(summarizeAnalyticsLineageRecord(child, relation));
  }

  return children.sort((left, right) => compareText(left.key ?? left.id, right.key ?? right.id));
}

function resolveRelatedRecords(lineage, indexes) {
  return (lineage.relatedKeys ?? [])
    .map((key) => indexes.byKey.get(key))
    .filter(Boolean)
    .map((record) => summarizeAnalyticsLineageRecord(record, 'related'));
}

export function buildAnalyticsLineageProjection(record, indexes, options = {}) {
  const lineage = normalizeAnalyticsLineage(record.lineage);
  const relatedWorkItems = options.relatedWorkItems ?? record.relatedWorkItems ?? [];

  let parent = null;
  if (lineage) {
    const parentRecord = resolveParentRecord(lineage, indexes);
    if (parentRecord) {
      parent = summarizeAnalyticsLineageRecord(
        parentRecord,
        lineage.relation ?? 'deepens',
      );
    }
  }

  const continuations = resolveContinuations(record, indexes);
  const related = lineage ? resolveRelatedRecords(lineage, indexes) : [];

  return {
    schema: ANALYTICS_LINEAGE_PROJECTION_SCHEMA,
    recordId: record.id,
    key: record.key ?? null,
    parent,
    continuations,
    related,
    feedsWorkItems: relatedWorkItems.map((entry) => entry.id).sort(compareText),
  };
}

export function attachAnalyticsLineageToRecords(records) {
  if (!Array.isArray(records)) {
    throw new TypeError('records must be an array');
  }

  const indexes = buildAnalyticsLineageIndexes(records);

  return records.map((record) => ({
    ...record,
    analyticsLineage: buildAnalyticsLineageProjection(record, indexes),
  }));
}

export function findAnalyticsRecordByKeyOrId(records, { recordKey, recordId } = {}) {
  const key = String(recordKey ?? '').trim();
  const id = String(recordId ?? '').trim();

  if (id !== '') {
    return records.find((record) => record.id === id) ?? null;
  }

  if (key !== '') {
    return records.find((record) => record.key === key) ?? null;
  }

  return null;
}
