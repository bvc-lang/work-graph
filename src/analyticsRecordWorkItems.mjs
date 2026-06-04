function normalizeLines(value) {
  if (Array.isArray(value)) {
    return value.map((line) => String(line).trim()).filter(Boolean);
  }

  return String(value ?? '')
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean);
}

function workItemTextHaystack(item) {
  return [
    ...normalizeLines(item.basis),
    ...normalizeLines(item.vector),
    ...normalizeLines(item.goal),
    ...normalizeLines(item.analysis),
    ...normalizeLines(item.decision),
    ...normalizeLines(item.checks),
    ...(item.targetFiles ?? []),
    item.title,
    item.id,
  ].join('\n');
}

export function summarizeWorkItemForAnalyticsRecord(item) {
  return {
    id: item.id,
    title: item.title ?? item.id,
    status: item.status ?? '',
    department: item.department ?? '',
    ownerRole: item.ownerRole ?? '',
  };
}

const ANALYTICS_RELATED_TASK_DONE_STATUSES = new Set(['done', 'verified']);

export function summarizeAnalyticsRelatedWorkItems(relatedWorkItems) {
  const related = Array.isArray(relatedWorkItems) ? relatedWorkItems : [];
  const done = related.filter((entry) => (
    ANALYTICS_RELATED_TASK_DONE_STATUSES.has(String(entry?.status ?? '').trim())
  )).length;

  return {
    total: related.length,
    done,
  };
}

export function formatAnalyticsRelatedTasksCountLabel(relatedWorkItems) {
  const { total, done } = summarizeAnalyticsRelatedWorkItems(relatedWorkItems);
  if (total === 0) {
    return '';
  }

  return `${done}/${total} ЗАДАЧ`;
}

export function resolveAnalyticsRelatedTasksBadgeTone(relatedWorkItems) {
  const { total, done } = summarizeAnalyticsRelatedWorkItems(relatedWorkItems);
  if (total === 0) {
    return 'default';
  }
  if (done === total) {
    return 'ok';
  }
  if (done === 0) {
    return 'default';
  }
  return 'accent';
}

/** @deprecated use formatAnalyticsRelatedTasksCountLabel — card UI renders wg-badge client-side */
export function formatAnalyticsRelatedTasksCardNote(relatedWorkItems) {
  const label = formatAnalyticsRelatedTasksCountLabel(relatedWorkItems);
  return label === '' ? '' : ` · ${label}`;
}

export function workItemMatchesAnalyticsRecord(record, item) {
  if (!record || !item) {
    return false;
  }

  const recordId = String(record.id ?? '').trim();
  const recordKey = String(record.key ?? '').trim();
  const bodyPath = String(record.bodyPath ?? '').trim();
  const slug = recordId.startsWith('analytics:') ? recordId.slice('analytics:'.length) : '';
  const labels = item.labels ?? {};

  if (recordId !== '' && String(labels['intake.source_ref'] ?? '').trim() === recordId) {
    return true;
  }

  if (recordKey !== '' && String(labels['intake.analytics_key'] ?? '').trim() === recordKey) {
    return true;
  }

  const intakeSourceRef = String(labels['intake.source_ref'] ?? '').trim();
  if (bodyPath !== '' && intakeSourceRef === bodyPath) {
    return true;
  }

  const feedsEpics = Array.isArray(record.feeds_epics) ? record.feeds_epics : [];
  if (feedsEpics.length > 0) {
    const itemId = String(item.id ?? '').trim();
    if (itemId !== '' && feedsEpics.includes(itemId)) {
      return true;
    }

    const parentId = String(labels['work.parent_id'] ?? '').trim();
    if (parentId !== '' && feedsEpics.includes(parentId)) {
      return true;
    }
  }

  const haystack = workItemTextHaystack(item);
  if (recordId !== '' && haystack.includes(recordId)) {
    return true;
  }

  if (recordKey !== '') {
    if (haystack.includes(`(${recordKey})`) || haystack.includes(`${recordKey},`)) {
      return true;
    }
    if (haystack.includes(`${recordKey}:`) || haystack.includes(`${recordKey} §`)) {
      return true;
    }
    const keyPattern = new RegExp(`\\b${recordKey.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')}\\b`, 'u');
    if (keyPattern.test(haystack)) {
      return true;
    }
  }

  if (bodyPath !== '' && haystack.includes(bodyPath)) {
    return true;
  }

  if (slug !== '' && haystack.includes(`analytics:${slug}`)) {
    return true;
  }

  const questionId = String(labels['intent.question_id'] ?? '').trim();
  const decisionId = String(labels['intent.decision_id'] ?? '').trim();
  if (recordKey === 'AN-3' && questionId === 'iq:intent-graph-storage') {
    return true;
  }
  if (recordId !== '' && decisionId !== '' && recordId.includes('intent-graph-storage')) {
    return true;
  }

  return false;
}

export function findWorkItemsForAnalyticsRecord(record, workItems) {
  if (!Array.isArray(workItems)) {
    return [];
  }

  return workItems
    .filter((item) => workItemMatchesAnalyticsRecord(record, item))
    .map((item) => summarizeWorkItemForAnalyticsRecord(item))
    .sort((left, right) => left.id.localeCompare(right.id, 'en', { sensitivity: 'variant' }));
}

export function attachRelatedWorkItemsToAnalyticsRecords(records, workItems) {
  if (!Array.isArray(records)) {
    throw new TypeError('records must be an array');
  }

  return records.map((record) => ({
    ...record,
    relatedWorkItems: findWorkItemsForAnalyticsRecord(record, workItems),
  }));
}
