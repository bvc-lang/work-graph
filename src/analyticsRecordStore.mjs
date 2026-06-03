import { appendFile, mkdir, readFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

import { normalizeAnalyticsLineage, validateAnalyticsLineage } from './analyticsLineageProjection.mjs';

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

export const ANALYTICS_RECORD_SCHEMA = 'analytics-record.v1';
export const ANALYTICS_RECORD_JOURNAL_SCHEMA = 'analytics-record.journal.v1';
export const ANALYTICS_RECORD_JOURNAL_READ_SCHEMA = 'analytics-record.journal.read.v1';
export const ANALYTICS_RECORD_JOURNAL_APPEND_SCHEMA = 'analytics-record.journal.append.v1';
export const DEFAULT_ANALYTICS_RECORD_JOURNAL_PATH = 'work/analytics-records.jsonl';

function stableAnalyticsId(slug) {
  const normalized = String(slug ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 48);
  return `analytics:${normalized || 'record'}`;
}

export function buildAnalyticsRecord(input, options = {}) {
  if (!input || typeof input !== 'object') {
    throw new TypeError('input is required');
  }

  const title = String(input.title ?? '').trim();
  const query = String(input.query ?? '').trim();
  if (!title) {
    throw new TypeError('title is required');
  }
  if (!query) {
    throw new TypeError('query is required');
  }

  const slug = input.slug ?? title;
  const createdAt = input.createdAt ?? options.appendedAt ?? new Date().toISOString();
  const lineage = normalizeAnalyticsLineage(input.lineage);
  const lineageErrors = validateAnalyticsLineage(input.lineage);
  if (lineageErrors.length > 0) {
    throw new TypeError(lineageErrors.join('; '));
  }

  return {
    schema: ANALYTICS_RECORD_SCHEMA,
    id: input.id ?? stableAnalyticsId(slug),
    title,
    query,
    topic: String(input.topic ?? 'general').trim(),
    status: input.status ?? 'published',
    tags: [...(input.tags ?? [])].map(String).sort(compareText),
    relatedFiles: [...(input.relatedFiles ?? [])].map(String).sort(compareText),
    body: input.body ?? '',
    bodyPath: input.bodyPath ?? null,
    createdAt,
    updatedAt: input.updatedAt ?? createdAt,
    author: input.author ?? 'operator',
    ...(String(input.key ?? '').trim() !== '' ? { key: String(input.key).trim() } : {}),
    ...(lineage ? { lineage } : {}),
  };
}

async function resolveRecordBody(record, options = {}) {
  const bodyPath = String(record.bodyPath ?? '').trim();
  if (!bodyPath) {
    return String(record.body ?? '');
  }

  const absolutePath = resolve(options.cwd ?? process.cwd(), bodyPath);
  try {
    return await readFile(absolutePath, 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return String(record.body ?? '');
    }

    throw error;
  }
}

export async function hydrateAnalyticsRecords(records, options = {}) {
  return Promise.all(records.map(async (record) => ({
    ...record,
    body: await resolveRecordBody(record, options),
  })));
}

export function buildAnalyticsJournalEntry(record, options = {}) {
  const appendedAt = options.appendedAt ?? new Date().toISOString();
  const normalized = buildAnalyticsRecord(record, { appendedAt });

  return {
    schema: ANALYTICS_RECORD_JOURNAL_SCHEMA,
    appendedAt,
    record: normalized,
  };
}

export async function readAnalyticsRecordJournal(options = {}) {
  const journalPath = resolve(options.cwd ?? process.cwd(), options.journalPath ?? DEFAULT_ANALYTICS_RECORD_JOURNAL_PATH);

  let text = '';
  try {
    text = await readFile(journalPath, 'utf8');
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return {
        schema: ANALYTICS_RECORD_JOURNAL_READ_SCHEMA,
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
      if (parsed.schema !== ANALYTICS_RECORD_JOURNAL_SCHEMA) {
        throw new Error(`invalid analytics journal entry at line ${index + 1}: expected ${ANALYTICS_RECORD_JOURNAL_SCHEMA}`);
      }

      return parsed;
    });

  const latestById = new Map();
  for (const entry of entries) {
    latestById.set(entry.record.id, entry.record);
  }

  const records = [...latestById.values()].sort((left, right) => compareText(left.id, right.id));
  const hydrated = await hydrateAnalyticsRecords(records, options);

  return {
    schema: ANALYTICS_RECORD_JOURNAL_READ_SCHEMA,
    journalPath,
    entryCount: entries.length,
    entries,
    records: hydrated,
  };
}

export async function appendAnalyticsRecordJournal(records, journalPath, options = {}) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new TypeError('records must be a non-empty array');
  }

  const resolvedPath = resolve(options.cwd ?? process.cwd(), journalPath ?? DEFAULT_ANALYTICS_RECORD_JOURNAL_PATH);
  const appendedAt = options.appendedAt ?? new Date().toISOString();
  const entries = records.map((record) => buildAnalyticsJournalEntry(record, { appendedAt }));

  if (options.dryRun !== true) {
    await mkdir(dirname(resolvedPath), { recursive: true });
    for (const entry of entries) {
      await appendFile(resolvedPath, `${JSON.stringify(entry)}\n`, 'utf8');
    }
  }

  return {
    schema: ANALYTICS_RECORD_JOURNAL_APPEND_SCHEMA,
    journalPath: resolvedPath,
    appended: entries.length,
    entries,
    records: await hydrateAnalyticsRecords(entries.map((entry) => entry.record), options),
  };
}
