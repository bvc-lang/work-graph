import { buildEvidenceRecordFromLegacyLine } from './evidenceReadModel.mjs';

export const ONEBASE_REST_EVIDENCE_SOURCE_CHECK = 'onebase.cli.check';
export const ONEBASE_REST_EVIDENCE_SOURCE_DESCRIBE = 'onebase.cli.describe';

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
