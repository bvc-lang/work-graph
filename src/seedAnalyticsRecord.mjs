import { readFile } from 'node:fs/promises';
import { basename, relative, resolve } from 'node:path';

import {
  DEFAULT_ANALYTICS_RECORD_JOURNAL_PATH,
  appendAnalyticsRecordJournal,
  buildAnalyticsRecord,
  readAnalyticsRecordJournal,
} from './analyticsRecordStore.mjs';

export const SEED_ANALYTICS_RECORD_SCHEMA = 'workgraph.seed-analytics-record.v1';

const H1_PATTERN = /^#\s+(AN-\d+(?:-[A-Z0-9]+)?)\s*:\s*(.+)$/mu;
const QUERY_PATTERN = /^\*\*Запрос:\*\*\s*(.+)$/mu;

function splitCsv(value) {
  return String(value ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizeBodyPath(bodyPath, cwd) {
  const absolutePath = resolve(cwd, bodyPath);
  return relative(cwd, absolutePath).replace(/\\/gu, '/');
}

function slugFromBodyPath(bodyPath) {
  return basename(bodyPath, '.md')
    .toLowerCase()
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')
    .slice(0, 48);
}

export function parseAnalyticsMarkdownMetadata(body) {
  const h1Match = body.match(H1_PATTERN);
  const queryMatch = body.match(QUERY_PATTERN);

  return {
    key: h1Match?.[1]?.trim() ?? '',
    title: h1Match?.[2]?.trim() ?? '',
    query: queryMatch?.[1]?.trim() ?? '',
  };
}

export function parseSeedAnalyticsRecordArgs(argv, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const parsed = {
    cwd,
    body: '',
    key: '',
    title: '',
    query: '',
    topic: 'general',
    tags: [],
    relatedFiles: [],
    journalPath: DEFAULT_ANALYTICS_RECORD_JOURNAL_PATH,
    dryRun: false,
    force: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const next = argv[index + 1];

    if (arg === '--body' && next) {
      parsed.body = next;
      index += 1;
      continue;
    }
    if (arg === '--key' && next) {
      parsed.key = next.trim();
      index += 1;
      continue;
    }
    if (arg === '--title' && next) {
      parsed.title = next.trim();
      index += 1;
      continue;
    }
    if (arg === '--query' && next) {
      parsed.query = next.trim();
      index += 1;
      continue;
    }
    if (arg === '--topic' && next) {
      parsed.topic = next.trim();
      index += 1;
      continue;
    }
    if (arg === '--tags' && next) {
      parsed.tags = splitCsv(next);
      index += 1;
      continue;
    }
    if (arg === '--related-files' && next) {
      parsed.relatedFiles = splitCsv(next);
      index += 1;
      continue;
    }
    if (arg === '--journal' && next) {
      parsed.journalPath = next;
      index += 1;
      continue;
    }
    if (arg === '--cwd' && next) {
      parsed.cwd = resolve(next);
      index += 1;
      continue;
    }
    if (arg === '--dry-run') {
      parsed.dryRun = true;
      continue;
    }
    if (arg === '--force') {
      parsed.force = true;
    }
  }

  if (!parsed.body) {
    throw new TypeError('--body is required (path to work/analytics/*.md)');
  }

  parsed.bodyPath = normalizeBodyPath(parsed.body, parsed.cwd);
  return parsed;
}

function pickNonEmpty(explicit, fallback) {
  const value = String(explicit ?? '').trim();
  return value || String(fallback ?? '').trim();
}

export async function buildAnalyticsRecordInputFromMarkdown(options) {
  const bodyPath = normalizeBodyPath(options.body ?? options.bodyPath, options.cwd ?? process.cwd());
  const absolutePath = resolve(options.cwd ?? process.cwd(), bodyPath);
  const body = await readFile(absolutePath, 'utf8');
  const metadata = parseAnalyticsMarkdownMetadata(body);

  const key = pickNonEmpty(options.key, metadata.key);
  const title = pickNonEmpty(options.title, metadata.title);
  const query = pickNonEmpty(options.query, metadata.query);

  if (!title) {
    throw new TypeError(`title is required (--title or H1 "# AN-XX: title" in ${bodyPath})`);
  }
  if (!query) {
    throw new TypeError(`query is required (--query or "**Запрос:**" in ${bodyPath})`);
  }

  const slug = slugFromBodyPath(bodyPath);
  const tags = [...(options.tags ?? [])];
  if (key && !tags.includes(key)) {
    tags.push(key);
  }

  const relatedFiles = [...(options.relatedFiles ?? [])];
  if (!relatedFiles.includes(bodyPath)) {
    relatedFiles.unshift(bodyPath);
  }

  return {
    title: key ? `${key}: ${title}` : title,
    query,
    slug,
    topic: options.topic ?? 'general',
    status: options.status ?? 'published',
    tags,
    relatedFiles,
    bodyPath,
    author: options.author ?? 'agent',
    ...(key ? { key } : {}),
  };
}

export async function seedAnalyticsRecord(options) {
  const cwd = options.cwd ?? process.cwd();
  const journalPath = options.journalPath ?? DEFAULT_ANALYTICS_RECORD_JOURNAL_PATH;
  const recordInput = await buildAnalyticsRecordInputFromMarkdown({ ...options, cwd });
  const record = buildAnalyticsRecord(recordInput);

  const journal = await readAnalyticsRecordJournal({ cwd, journalPath });
  const existingById = journal.records.find((entry) => entry.id === record.id);
  const existingByKey = record.key
    ? journal.records.find((entry) => entry.key === record.key)
    : null;
  const existingByBodyPath = journal.records.find((entry) => entry.bodyPath === record.bodyPath);

  if (!options.force && (existingById || existingByKey || existingByBodyPath)) {
    return {
      schema: SEED_ANALYTICS_RECORD_SCHEMA,
      skipped: true,
      reason: 'record_exists',
      id: existingById?.id ?? existingByKey?.id ?? existingByBodyPath?.id ?? record.id,
      key: existingById?.key ?? existingByKey?.key ?? existingByBodyPath?.key ?? record.key ?? null,
      bodyPath: record.bodyPath,
      journalPath: resolve(cwd, journalPath),
    };
  }

  const appendResult = await appendAnalyticsRecordJournal([record], journalPath, {
    cwd,
    dryRun: options.dryRun === true,
  });

  return {
    schema: SEED_ANALYTICS_RECORD_SCHEMA,
    skipped: false,
    appended: appendResult.appended,
    dryRun: options.dryRun === true,
    id: record.id,
    key: record.key ?? null,
    title: record.title,
    bodyPath: record.bodyPath,
    journalPath: resolve(cwd, journalPath),
  };
}
