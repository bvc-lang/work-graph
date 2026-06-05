import { createHash } from 'node:crypto';

import { buildEvidenceRecordFromLegacyLine } from './evidenceReadModel.mjs';

export const ONEBASE_REST_EVIDENCE_SOURCE_CHECK = 'onebase.cli.check';
export const ONEBASE_REST_EVIDENCE_SOURCE_DESCRIBE = 'onebase.cli.describe';
export const ONEBASE_REST_EVIDENCE_SOURCE_GET = 'onebase.rest.get';
export const ONEBASE_REST_EVIDENCE_SOURCE_WRITE = 'onebase.rest.write';

const DEFAULT_REST_READ_TIMEOUT_MS = 15_000;
const REST_READ_ALLOWLIST = [
  /^\/?catalogs(?:\/|$)/iu,
  /^\/?documents(?:\/|$)/iu,
  /^\/?registers(?:\/|$)/iu,
  /^\/?inforegs(?:\/|$)/iu,
  /^\/?reports(?:\/|$)/iu,
  /^\/?widgets(?:\/|$)/iu,
  /^\/?constants(?:\/|$)/iu,
  /^\/?health(?:\/|$)/iu,
  /^\/?status(?:\/|$)/iu,
];
const REST_WRITE_ALLOWLIST = [
  /^\/?documents\/[^/]+\/[^/]+\/post$/iu,
  /^\/?documents\/[^/]+\/post$/iu,
];

function normalizeCliResult(cliResult) {
  if (!cliResult || typeof cliResult !== 'object') {
    return {
      ok: false,
      exitCode: 1,
      command: 'onebase',
      stdout: '',
      stderr: '',
      failureClass: 'cli_error',
      message: 'invalid cli result',
    };
  }

  return cliResult;
}

function normalizeRestPath(path) {
  const raw = String(path ?? '').trim();
  if (raw === '') {
    return { ok: false, error: 'path is required', path: '' };
  }
  if (/^https?:\/\//iu.test(raw)) {
    return { ok: false, error: 'path must be relative to ONEBASE_API_BASE_URL', path: raw };
  }

  const prefixed = raw.startsWith('/') ? raw : `/${raw}`;
  if (prefixed.includes('..')) {
    return { ok: false, error: 'path traversal is not allowed', path: prefixed };
  }
  if (!REST_READ_ALLOWLIST.some((pattern) => pattern.test(prefixed))) {
    return { ok: false, error: 'path is outside OneBase REST read allowlist', path: prefixed };
  }

  return { ok: true, error: null, path: prefixed };
}

function normalizeRestWritePath(path) {
  const normalized = normalizeRestPathForWrite(path);
  if (!normalized.ok) {
    return normalized;
  }
  if (!REST_WRITE_ALLOWLIST.some((pattern) => pattern.test(normalized.path))) {
    return { ok: false, error: 'path is outside OneBase REST write allowlist', path: normalized.path };
  }
  return normalized;
}

function normalizeRestPathForWrite(path) {
  const raw = String(path ?? '').trim();
  if (raw === '') {
    return { ok: false, error: 'path is required', path: '' };
  }
  if (/^https?:\/\//iu.test(raw)) {
    return { ok: false, error: 'path must be relative to ONEBASE_API_BASE_URL', path: raw };
  }
  const prefixed = raw.startsWith('/') ? raw : `/${raw}`;
  if (prefixed.includes('..')) {
    return { ok: false, error: 'path traversal is not allowed', path: prefixed };
  }
  return { ok: true, error: null, path: prefixed };
}

function canonicalJson(value) {
  if (value === undefined || value === null || value === '') {
    return '';
  }
  if (typeof value === 'string') {
    return value;
  }
  return JSON.stringify(value, Object.keys(value).sort());
}

function buildConfirmToken({ method, path, body }) {
  return createHash('sha256')
    .update(`${method.toUpperCase()}\n${path}\n${canonicalJson(body)}`)
    .digest('hex')
    .slice(0, 16);
}

function buildOnebaseRestGetEvidenceRecord(taskId, request, response, options = {}) {
  const sequence = Number.isInteger(options.sequence) ? options.sequence : 1;
  const ok = response.ok === true;
  return {
    schema: 'evidence-record.v1',
    id: `${taskId}:onebase-rest-get:${sequence}`,
    time: options.time ?? null,
    source: ONEBASE_REST_EVIDENCE_SOURCE_GET,
    taskId,
    type: 'command',
    summary: ok
      ? `onebase REST GET ${request.path} succeeded (${response.status})`
      : `onebase REST GET ${request.path} failed: ${response.error ?? response.status ?? 'unknown error'}`,
    status: ok ? 'succeeded' : (response.blocked ? 'blocked' : 'failed'),
    details: {
      method: 'GET',
      path: request.path,
      url: request.url,
      status: response.status ?? null,
      blocked: response.blocked === true,
      error: response.error ?? null,
    },
    artifacts: [{
      kind: 'onebase-rest',
      method: 'GET',
      path: request.path,
      responseSnippet: String(response.body ?? '').slice(0, 500),
    }],
  };
}

function buildOnebaseRestWriteEvidenceRecord(taskId, request, response, options = {}) {
  const sequence = Number.isInteger(options.sequence) ? options.sequence : 1;
  const ok = response.ok === true;
  return {
    schema: 'evidence-record.v1',
    id: `${taskId}:onebase-rest-write:${sequence}`,
    time: options.time ?? null,
    source: ONEBASE_REST_EVIDENCE_SOURCE_WRITE,
    taskId,
    type: 'command',
    summary: ok
      ? `onebase REST ${request.method} ${request.path} succeeded (${response.status})`
      : `onebase REST ${request.method} ${request.path} blocked/failed: ${response.error ?? response.status ?? 'unknown error'}`,
    status: ok ? 'succeeded' : (response.blocked ? 'blocked' : 'failed'),
    details: {
      method: request.method,
      path: request.path,
      url: request.url ?? null,
      status: response.status ?? null,
      blocked: response.blocked === true,
      error: response.error ?? null,
      confirmToken: request.confirmToken ?? null,
      bodyHash: request.bodyHash ?? null,
      confirmedBy: options.confirmedBy ?? null,
    },
    artifacts: [{
      kind: 'onebase-rest-write',
      method: request.method,
      path: request.path,
      requestSnippet: String(request.bodySnippet ?? '').slice(0, 500),
      responseSnippet: String(response.body ?? '').slice(0, 500),
    }],
  };
}

export function parseOnebaseDescribePayload(stdout) {
  const text = String(stdout ?? '').trim();
  if (text === '') {
    return { ok: false, error: 'empty describe stdout', payload: null };
  }

  try {
    const payload = JSON.parse(text);
    return { ok: true, error: null, payload };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message, payload: null };
  }
}

export function summarizeOnebaseDescribePayload(payload) {
  if (!payload || typeof payload !== 'object') {
    return {
      documents: 0,
      catalogs: 0,
      registers: 0,
      reports: 0,
      widgets: 0,
      totalArtifacts: 0,
    };
  }

  const counts = {
    documents: Array.isArray(payload.documents) ? payload.documents.length : 0,
    catalogs: Array.isArray(payload.catalogs) ? payload.catalogs.length : 0,
    registers: Array.isArray(payload.registers) ? payload.registers.length : 0,
    reports: Array.isArray(payload.reports) ? payload.reports.length : 0,
    widgets: Array.isArray(payload.widgets) ? payload.widgets.length : 0,
  };

  return {
    ...counts,
    totalArtifacts: Object.values(counts).reduce((sum, value) => sum + value, 0),
  };
}

export function buildEvidenceRecordsFromOnebaseCheck(taskId, cliResult, options = {}) {
  const result = normalizeCliResult(cliResult);
  const sequence = Number.isInteger(options.sequence) ? options.sequence : 1;

  return [{
    schema: 'evidence-record.v1',
    id: `${taskId}:onebase-check:${sequence}`,
    time: options.time ?? null,
    source: ONEBASE_REST_EVIDENCE_SOURCE_CHECK,
    taskId,
    type: 'command',
    summary: result.ok
      ? `onebase check passed (${result.command ?? 'onebase check'})`
      : `onebase check failed: ${result.message ?? result.stderr ?? result.stdout ?? 'unknown error'}`,
    status: result.ok ? 'succeeded' : 'failed',
    details: {
      exitCode: result.exitCode ?? null,
      failureClass: result.failureClass ?? null,
      command: result.command ?? null,
    },
    artifacts: [{
      kind: 'cli',
      command: result.command ?? 'onebase check',
      stdoutSnippet: String(result.stdout ?? '').slice(0, 500),
      stderrSnippet: String(result.stderr ?? '').slice(0, 500),
    }],
  }];
}

export function buildEvidenceRecordsFromOnebaseDescribe(taskId, cliResult, options = {}) {
  const result = normalizeCliResult(cliResult);
  const parsed = parseOnebaseDescribePayload(result.stdout);
  const sequence = Number.isInteger(options.sequence) ? options.sequence : 1;
  const summaryCounts = summarizeOnebaseDescribePayload(parsed.payload);

  const records = [{
    schema: 'evidence-record.v1',
    id: `${taskId}:onebase-describe:${sequence}`,
    time: options.time ?? null,
    source: ONEBASE_REST_EVIDENCE_SOURCE_DESCRIBE,
    taskId,
    type: 'command',
    summary: parsed.ok
      ? `onebase describe: ${summaryCounts.totalArtifacts} artifacts (documents=${summaryCounts.documents}, catalogs=${summaryCounts.catalogs})`
      : `onebase describe failed: ${parsed.error ?? result.message ?? 'invalid JSON'}`,
    status: result.ok && parsed.ok ? 'succeeded' : 'failed',
    details: {
      exitCode: result.exitCode ?? null,
      failureClass: result.failureClass ?? null,
      command: result.command ?? null,
      counts: summaryCounts,
      parseError: parsed.ok ? null : parsed.error,
    },
    artifacts: [{
      kind: 'cli',
      command: result.command ?? 'onebase describe --json',
      stdoutSnippet: String(result.stdout ?? '').slice(0, 500),
    }],
  }];

  if (parsed.ok && Array.isArray(parsed.payload?.documents)) {
    for (const [index, document] of parsed.payload.documents.entries()) {
      if (!document?.name) {
        continue;
      }

      records.push({
        schema: 'evidence-record.v1',
        id: `${taskId}:onebase-describe:document:${index + 1}`,
        time: options.time ?? null,
        source: ONEBASE_REST_EVIDENCE_SOURCE_DESCRIBE,
        taskId,
        type: 'change',
        summary: `document ${document.name}${document.posting ? ' (posting)' : ''}`,
        status: 'succeeded',
        details: {
          onebaseKind: 'document',
          name: document.name,
          posting: document.posting ?? false,
        },
        artifacts: [{
          kind: 'onebase-metadata',
          name: document.name,
          restPath: `/documents/${encodeURIComponent(document.name)}`,
        }],
      });
    }
  }

  return records;
}

export function buildEvidenceRecordsFromOnebaseCli(subcommand, cliResult, taskId, options = {}) {
  const normalized = String(subcommand ?? '').trim().toLowerCase();
  if (normalized === 'check') {
    return buildEvidenceRecordsFromOnebaseCheck(taskId, cliResult, options);
  }

  if (normalized === 'describe') {
    return buildEvidenceRecordsFromOnebaseDescribe(taskId, cliResult, options);
  }

  return [];
}

export function buildOnebaseRestEvidenceAdapterResult(subcommand, cliResult, taskId, options = {}) {
  const records = buildEvidenceRecordsFromOnebaseCli(subcommand, cliResult, taskId, options);
  const ok = records.length > 0 && records.every((record) => record.status !== 'failed');

  return {
    schema: 'onebase.rest-evidence.adapter.v1',
    subcommand,
    taskId,
    ok,
    recordCount: records.length,
    records,
    workerEvidence: records.map((record) => ({
      kind: 'onebase_rest_evidence',
      source: record.source,
      result: record.status === 'succeeded' ? 'succeeded' : 'failed',
      summary: record.summary,
      evidenceRecordId: record.id,
    })),
    legacyLines: records.map((record) => record.summary),
  };
}

export async function executeOnebaseRestGet(path, options = {}) {
  const taskId = options.taskId ?? 'onebase-rest-get';
  const normalizedPath = normalizeRestPath(path);
  const baseUrl = String(options.baseUrl ?? options.env?.ONEBASE_API_BASE_URL ?? process.env.ONEBASE_API_BASE_URL ?? '').trim();

  if (!normalizedPath.ok) {
    const response = { ok: false, blocked: true, error: normalizedPath.error, status: null, body: '' };
    const record = buildOnebaseRestGetEvidenceRecord(taskId, {
      path: normalizedPath.path || String(path ?? ''),
      url: null,
    }, response, options);
    return buildOnebaseRestGetResult(taskId, false, true, record, response);
  }

  if (baseUrl === '') {
    const response = { ok: false, blocked: true, error: 'ONEBASE_API_BASE_URL is not configured', status: null, body: '' };
    const record = buildOnebaseRestGetEvidenceRecord(taskId, {
      path: normalizedPath.path,
      url: null,
    }, response, options);
    return buildOnebaseRestGetResult(taskId, false, true, record, response);
  }

  const url = new URL(normalizedPath.path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    const response = { ok: false, blocked: true, error: 'fetch is not available', status: null, body: '' };
    const record = buildOnebaseRestGetEvidenceRecord(taskId, { path: normalizedPath.path, url }, response, options);
    return buildOnebaseRestGetResult(taskId, false, true, record, response);
  }

  let timeout;
  let controller;
  if (typeof AbortController === 'function') {
    controller = new AbortController();
    timeout = setTimeout(() => controller.abort(), options.timeoutMs ?? DEFAULT_REST_READ_TIMEOUT_MS);
  }

  try {
    const httpResponse = await fetchImpl(url, {
      method: 'GET',
      headers: { accept: 'application/json, text/plain;q=0.9, */*;q=0.1' },
      ...(controller ? { signal: controller.signal } : {}),
    });
    const body = await httpResponse.text();
    const response = {
      ok: httpResponse.ok,
      blocked: false,
      status: httpResponse.status,
      body,
      error: httpResponse.ok ? null : `HTTP ${httpResponse.status}`,
    };
    const record = buildOnebaseRestGetEvidenceRecord(taskId, { path: normalizedPath.path, url }, response, options);
    return buildOnebaseRestGetResult(taskId, httpResponse.ok, false, record, response);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const response = { ok: false, blocked: false, status: null, body: '', error: message };
    const record = buildOnebaseRestGetEvidenceRecord(taskId, { path: normalizedPath.path, url }, response, options);
    return buildOnebaseRestGetResult(taskId, false, false, record, response);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export function prepareOnebaseRestWrite(path, body = {}, options = {}) {
  const taskId = options.taskId ?? 'onebase-rest-write';
  const method = String(options.method ?? 'POST').trim().toUpperCase();
  const normalizedPath = normalizeRestWritePath(path);
  if (method !== 'POST') {
    const response = { ok: false, blocked: true, error: 'only POST write operations are allowed', status: null, body: '' };
    const record = buildOnebaseRestWriteEvidenceRecord(taskId, {
      method,
      path: normalizedPath.path || String(path ?? ''),
      bodySnippet: canonicalJson(body),
    }, response, options);
    return buildOnebaseRestWriteResult(taskId, false, true, record, response, null);
  }
  if (!normalizedPath.ok) {
    const response = { ok: false, blocked: true, error: normalizedPath.error, status: null, body: '' };
    const record = buildOnebaseRestWriteEvidenceRecord(taskId, {
      method,
      path: normalizedPath.path || String(path ?? ''),
      bodySnippet: canonicalJson(body),
    }, response, options);
    return buildOnebaseRestWriteResult(taskId, false, true, record, response, null);
  }

  const bodyText = canonicalJson(body);
  const bodyHash = createHash('sha256').update(bodyText).digest('hex');
  const confirmToken = buildConfirmToken({ method, path: normalizedPath.path, body });
  const response = {
    ok: true,
    blocked: false,
    status: null,
    body: '',
    error: null,
  };
  const record = buildOnebaseRestWriteEvidenceRecord(taskId, {
    method,
    path: normalizedPath.path,
    bodyHash,
    bodySnippet: bodyText,
    confirmToken,
  }, {
    ...response,
    ok: false,
    blocked: true,
    error: 'prepared; execute requires confirmToken',
  }, options);

  return {
    schema: 'onebase.rest-write.prepare.v1',
    ok: true,
    blocked: false,
    taskId,
    method,
    path: normalizedPath.path,
    confirmToken,
    bodyHash,
    evidenceRecords: [record],
    evidenceLines: [`onebase REST write prepared ${method} ${normalizedPath.path}; confirmToken=${confirmToken}`],
  };
}

export async function executeOnebaseRestWrite(path, body = {}, options = {}) {
  const taskId = options.taskId ?? 'onebase-rest-write';
  const prepared = prepareOnebaseRestWrite(path, body, options);
  if (prepared.ok !== true) {
    return prepared;
  }
  const confirmToken = String(options.confirmToken ?? '').trim();
  if (confirmToken === '' || confirmToken !== prepared.confirmToken) {
    const response = { ok: false, blocked: true, error: 'confirmToken is required and must match prepared write', status: null, body: '' };
    const record = buildOnebaseRestWriteEvidenceRecord(taskId, {
      method: prepared.method,
      path: prepared.path,
      confirmToken,
      bodyHash: prepared.bodyHash,
      bodySnippet: canonicalJson(body),
    }, response, options);
    return buildOnebaseRestWriteResult(taskId, false, true, record, response, prepared.confirmToken);
  }

  const baseUrl = String(options.baseUrl ?? options.env?.ONEBASE_API_BASE_URL ?? process.env.ONEBASE_API_BASE_URL ?? '').trim();
  if (baseUrl === '') {
    const response = { ok: false, blocked: true, error: 'ONEBASE_API_BASE_URL is not configured', status: null, body: '' };
    const record = buildOnebaseRestWriteEvidenceRecord(taskId, {
      method: prepared.method,
      path: prepared.path,
      confirmToken,
      bodyHash: prepared.bodyHash,
      bodySnippet: canonicalJson(body),
    }, response, options);
    return buildOnebaseRestWriteResult(taskId, false, true, record, response, prepared.confirmToken);
  }

  const url = new URL(prepared.path, baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`).toString();
  const fetchImpl = options.fetchImpl ?? globalThis.fetch;
  if (typeof fetchImpl !== 'function') {
    const response = { ok: false, blocked: true, error: 'fetch is not available', status: null, body: '' };
    const record = buildOnebaseRestWriteEvidenceRecord(taskId, {
      method: prepared.method,
      path: prepared.path,
      url,
      confirmToken,
      bodyHash: prepared.bodyHash,
      bodySnippet: canonicalJson(body),
    }, response, options);
    return buildOnebaseRestWriteResult(taskId, false, true, record, response, prepared.confirmToken);
  }

  try {
    const httpResponse = await fetchImpl(url, {
      method: prepared.method,
      headers: {
        accept: 'application/json, text/plain;q=0.9, */*;q=0.1',
        'content-type': 'application/json',
      },
      body: canonicalJson(body),
    });
    const responseBody = await httpResponse.text();
    const response = {
      ok: httpResponse.ok,
      blocked: false,
      status: httpResponse.status,
      body: responseBody,
      error: httpResponse.ok ? null : `HTTP ${httpResponse.status}`,
    };
    const record = buildOnebaseRestWriteEvidenceRecord(taskId, {
      method: prepared.method,
      path: prepared.path,
      url,
      confirmToken,
      bodyHash: prepared.bodyHash,
      bodySnippet: canonicalJson(body),
    }, response, options);
    return buildOnebaseRestWriteResult(taskId, httpResponse.ok, false, record, response, prepared.confirmToken);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const response = { ok: false, blocked: false, status: null, body: '', error: message };
    const record = buildOnebaseRestWriteEvidenceRecord(taskId, {
      method: prepared.method,
      path: prepared.path,
      url,
      confirmToken,
      bodyHash: prepared.bodyHash,
      bodySnippet: canonicalJson(body),
    }, response, options);
    return buildOnebaseRestWriteResult(taskId, false, false, record, response, prepared.confirmToken);
  }
}

function buildOnebaseRestGetResult(taskId, ok, blocked, record, response) {
  return {
    schema: 'onebase.rest-get.result.v1',
    ok,
    blocked,
    taskId,
    method: 'GET',
    path: record.details.path,
    url: record.details.url,
    status: response.status ?? null,
    body: response.body ?? '',
    evidenceRecords: [record],
    evidenceLines: [record.summary],
    workerEvidence: [{
      kind: 'onebase_rest_evidence',
      source: record.source,
      result: blocked ? 'blocked' : (ok ? 'succeeded' : 'failed'),
      summary: record.summary,
      evidenceRecordId: record.id,
    }],
  };
}

function buildOnebaseRestWriteResult(taskId, ok, blocked, record, response, expectedConfirmToken) {
  return {
    schema: 'onebase.rest-write.result.v1',
    ok,
    blocked,
    taskId,
    method: record.details.method,
    path: record.details.path,
    url: record.details.url,
    status: response.status ?? null,
    body: response.body ?? '',
    confirmToken: expectedConfirmToken ?? record.details.confirmToken ?? null,
    evidenceRecords: [record],
    evidenceLines: [record.summary],
    workerEvidence: [{
      kind: 'onebase_rest_evidence',
      source: record.source,
      result: blocked ? 'blocked' : (ok ? 'succeeded' : 'failed'),
      summary: record.summary,
      evidenceRecordId: record.id,
    }],
  };
}

export function mergeOnebaseRestEvidenceIntoWorkerOutput(output, adapterResult) {
  if (!output || !adapterResult || adapterResult.recordCount === 0) {
    return output;
  }

  const evidence = [
    ...(Array.isArray(output.evidence) ? output.evidence : []),
    ...adapterResult.workerEvidence,
  ];

  return {
    ...output,
    evidence,
  };
}

export function buildLegacyEvidenceLinesFromRecords(records) {
  return (records ?? []).map((record) => record.summary).filter(Boolean);
}

export function coerceOnebaseRestEvidenceRecord(record, taskId, index) {
  if (record?.schema === 'evidence-record.v1') {
    return record;
  }

  return buildEvidenceRecordFromLegacyLine(taskId, String(record ?? ''), index);
}
