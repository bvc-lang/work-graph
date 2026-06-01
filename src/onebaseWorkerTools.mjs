import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

import {
  DEFAULT_ONEBASE_ROOT,
  verifyOnebaseGrossProfitWarehouseArtifacts,
} from './onebaseGrossProfitStaticVerify.mjs';
import { runOnebaseCheck, runOnebaseDescribeJson } from './onebaseCliRunner.mjs';
import { buildOnebaseRestEvidenceAdapterResult } from './onebaseRestEvidenceAdapter.mjs';
import { extractJsonYamlFacts } from './languageAdapters/jsonYamlAdapter.mjs';
import { extractOnebaseOsFacts } from './languageAdapters/onebaseOsAdapter.mjs';

export const ONEBASE_WORKER_TOOL_IDS = [
  'onebase.listMetadata',
  'onebase.readConfigFile',
  'onebase.staticVerify',
  'onebase.runVerificationCommand',
  'onebase.describeCli',
  'onebase.checkCli',
];

export const ONEBASE_METADATA_DIRS = [
  'catalogs',
  'documents',
  'registers',
  'inforegs',
  'reports',
  'constants',
  'widgets',
];

const YAML_EXT = /\.(yaml|yml)$/iu;
const MAX_READ_CHARS = 32_000;

export function resolveOnebaseProjectRoot(options = {}) {
  const fromEnv = String(process.env.ONEBASE_PROJECT_ROOT ?? '').trim();
  if (fromEnv !== '') {
    return path.resolve(fromEnv);
  }

  if (options.onebaseRoot) {
    return path.resolve(String(options.onebaseRoot));
  }

  return DEFAULT_ONEBASE_ROOT;
}

export function isOnebaseDomainTask(task) {
  if (!task || typeof task !== 'object') {
    return false;
  }

  const domainId = String(task.labels?.['domain.id'] ?? '').trim();
  if (domainId === 'onebase') {
    return true;
  }

  if (task.department === 'domain-onebase') {
    return true;
  }

  const haystack = [
    ...(task.checks ?? []),
    ...(task.evidence ?? []),
    task.nextAction ?? '',
    ...(task.targetFiles ?? []),
  ].join('\n').toLowerCase();

  return haystack.includes('onebase')
    || haystack.includes('verifyonebase')
    || haystack.includes('test:optional:onebase');
}

export function resolveOnebaseAllowedTools(task) {
  if (!isOnebaseDomainTask(task)) {
    return [];
  }

  return [...ONEBASE_WORKER_TOOL_IDS];
}

export function executeOnebaseListMetadata(onebaseRoot = DEFAULT_ONEBASE_ROOT, options = {}) {
  const root = path.resolve(onebaseRoot);
  const entries = [];
  const failures = [];

  if (!fs.existsSync(root)) {
    return {
      ok: false,
      toolId: 'onebase.listMetadata',
      onebaseRoot: root,
      entries: [],
      summary: { total: 0, byKind: {} },
      failures: [`onebase root not found: ${root}`],
    };
  }

  for (const dirName of ONEBASE_METADATA_DIRS) {
    const dirPath = path.join(root, dirName);
    if (!fs.existsSync(dirPath)) {
      continue;
    }

    collectMetadataEntries(dirPath, root, dirName, entries, failures, options);
  }

  entries.sort((left, right) => left.yamlPath.localeCompare(right.yamlPath, 'en'));

  const byKind = {};
  for (const entry of entries) {
    byKind[entry.kind] = (byKind[entry.kind] ?? 0) + 1;
  }

  return {
    ok: failures.length === 0,
    toolId: 'onebase.listMetadata',
    onebaseRoot: root,
    entries,
    summary: {
      total: entries.length,
      byKind,
    },
    failures,
  };
}

export function executeOnebaseReadConfigFile(onebaseRoot, relativePath, options = {}) {
  const root = path.resolve(onebaseRoot);
  const normalized = normalizeBoundedRelativePath(relativePath);

  if (!normalized.ok) {
    return {
      ok: false,
      toolId: 'onebase.readConfigFile',
      relativePath: String(relativePath ?? ''),
      text: '',
      truncated: false,
      facts: null,
      error: normalized.error,
    };
  }

  const absolutePath = path.join(root, normalized.relativePath);
  if (!absolutePath.startsWith(root)) {
    return {
      ok: false,
      toolId: 'onebase.readConfigFile',
      relativePath: normalized.relativePath,
      text: '',
      truncated: false,
      facts: null,
      error: 'path escapes onebase root',
    };
  }

  if (!fs.existsSync(absolutePath)) {
    return {
      ok: false,
      toolId: 'onebase.readConfigFile',
      relativePath: normalized.relativePath,
      text: '',
      truncated: false,
      facts: null,
      error: `file not found: ${normalized.relativePath}`,
    };
  }

  const maxChars = options.maxChars ?? MAX_READ_CHARS;
  const rawText = fs.readFileSync(absolutePath, 'utf8');
  const truncated = rawText.length > maxChars;
  const text = truncated ? rawText.slice(0, maxChars) : rawText;
  const facts = buildArtifactFacts(normalized.relativePath, text);

  return {
    ok: true,
    toolId: 'onebase.readConfigFile',
    relativePath: normalized.relativePath,
    text,
    truncated,
    facts,
    error: null,
  };
}

export function executeOnebaseStaticVerify(onebaseRoot = DEFAULT_ONEBASE_ROOT) {
  const result = verifyOnebaseGrossProfitWarehouseArtifacts(onebaseRoot);

  return {
    ok: result.ok,
    toolId: 'onebase.staticVerify',
    onebaseRoot: result.onebaseRoot,
    failures: result.failures,
    checkedFiles: result.checkedFiles.map((filePath) => path.relative(result.onebaseRoot, filePath).replace(/\\/gu, '/')),
  };
}

export function executeOnebaseVerificationCommand(options = {}) {
  const policy = options.policy ?? {};
  if (policy.allowShell !== true) {
    return {
      ok: false,
      toolId: 'onebase.runVerificationCommand',
      blocked: true,
      reason: 'allowShell=false',
      command: null,
      exitCode: null,
      stdout: '',
      stderr: '',
    };
  }

  const onebaseRoot = resolveOnebaseProjectRoot(options);
  const command = options.command ?? 'go test ./...';
  const spawnImpl = options.spawnSyncImpl ?? spawnSync;
  const preflight = spawnImpl('go', ['version'], {
    cwd: onebaseRoot,
    encoding: 'utf8',
    shell: process.platform === 'win32',
  });

  if (preflight.status !== 0) {
    return {
      ok: false,
      toolId: 'onebase.runVerificationCommand',
      blocked: false,
      reason: 'go preflight failed',
      command: 'go version',
      exitCode: preflight.status ?? 1,
      stdout: preflight.stdout ?? '',
      stderr: preflight.stderr ?? '',
    };
  }

  const result = spawnImpl(command, {
    cwd: onebaseRoot,
    encoding: 'utf8',
    shell: true,
  });

  return {
    ok: result.status === 0,
    toolId: 'onebase.runVerificationCommand',
    blocked: false,
    reason: result.status === 0 ? null : 'verification command failed',
    command,
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

export function executeOnebaseDescribeCli(options = {}) {
  const projectRoot = resolveOnebaseProjectRoot(options);
  const cliResult = runOnebaseDescribeJson({
    ...options,
    projectRoot,
    cwd: options.cwd ?? projectRoot,
  });

  const adapter = buildOnebaseRestEvidenceAdapterResult(
    'describe',
    cliResult,
    options.taskId ?? 'onebase-task',
    options.evidenceOptions,
  );

  return {
    ok: cliResult.ok === true && adapter.ok === true,
    toolId: 'onebase.describeCli',
    blocked: cliResult.failureClass === 'cli_missing' || cliResult.failureClass === 'cli_command_unavailable',
    reason: cliResult.message ?? null,
    command: cliResult.command,
    exitCode: cliResult.exitCode,
    stdout: cliResult.stdout,
    stderr: cliResult.stderr,
    failureClass: cliResult.failureClass ?? null,
    evidenceRecords: adapter.records,
    evidenceLines: adapter.legacyLines,
  };
}

export function executeOnebaseCheckCli(options = {}) {
  const projectRoot = resolveOnebaseProjectRoot(options);
  const cliResult = runOnebaseCheck({
    ...options,
    projectRoot,
    cwd: options.cwd ?? projectRoot,
  });

  const adapter = buildOnebaseRestEvidenceAdapterResult(
    'check',
    cliResult,
    options.taskId ?? 'onebase-task',
    options.evidenceOptions,
  );

  return {
    ok: cliResult.ok === true,
    toolId: 'onebase.checkCli',
    blocked: cliResult.failureClass === 'cli_missing' || cliResult.failureClass === 'cli_command_unavailable',
    reason: cliResult.message ?? null,
    command: cliResult.command,
    exitCode: cliResult.exitCode,
    stdout: cliResult.stdout,
    stderr: cliResult.stderr,
    failureClass: cliResult.failureClass ?? null,
    evidenceRecords: adapter.records,
    evidenceLines: adapter.legacyLines,
  };
}

export function buildOnebaseWorkerEvidence(toolResult) {
  if (!toolResult || typeof toolResult !== 'object') {
    return {
      kind: 'onebase_tool',
      source: 'onebase-worker-tools',
      result: 'failed',
      summary: 'invalid tool result',
    };
  }

  const toolId = toolResult.toolId ?? 'onebase.unknown';
  const ok = toolResult.ok === true && toolResult.blocked !== true;

  if (toolId === 'onebase.listMetadata') {
    return {
      kind: 'onebase_metadata',
      source: 'onebase-worker-tools',
      result: ok ? 'succeeded' : 'failed',
      summary: `metadata entries=${toolResult.summary?.total ?? 0}`,
      toolId,
      details: toolResult.summary,
    };
  }

  if (toolId === 'onebase.readConfigFile') {
    return {
      kind: 'onebase_artifact',
      source: 'onebase-worker-tools',
      result: ok ? 'succeeded' : 'failed',
      summary: ok
        ? `read ${toolResult.relativePath}${toolResult.truncated ? ' (truncated)' : ''}`
        : (toolResult.error ?? 'read failed'),
      toolId,
      relativePath: toolResult.relativePath ?? null,
    };
  }

  if (toolId === 'onebase.staticVerify') {
    return {
      kind: 'onebase_verify',
      source: 'onebase-worker-tools',
      result: ok ? 'succeeded' : 'failed',
      summary: ok
        ? `static verify passed (${toolResult.checkedFiles?.length ?? 0} files)`
        : `static verify failed: ${(toolResult.failures ?? []).slice(0, 2).join('; ')}`,
      toolId,
      failures: toolResult.failures ?? [],
    };
  }

  if (toolId === 'onebase.runVerificationCommand') {
    if (toolResult.blocked) {
      return {
        kind: 'onebase_verify',
        source: 'onebase-worker-tools',
        result: 'blocked',
        summary: `verification blocked (${toolResult.reason ?? 'policy'})`,
        toolId,
      };
    }

    return {
      kind: 'onebase_verify',
      source: 'onebase-worker-tools',
      result: ok ? 'succeeded' : 'failed',
      summary: ok
        ? `verification command succeeded (${toolResult.command ?? 'go test'})`
        : `verification command failed (${toolResult.command ?? 'go test'})`,
      toolId,
      exitCode: toolResult.exitCode ?? null,
    };
  }

  if (toolId === 'onebase.describeCli' || toolId === 'onebase.checkCli') {
    const summary = Array.isArray(toolResult.evidenceLines) && toolResult.evidenceLines.length > 0
      ? toolResult.evidenceLines[0]
      : `${toolId} ${ok ? 'ok' : 'failed'}`;

    return {
      kind: 'onebase_rest_evidence',
      source: 'onebase-rest-evidence-adapter',
      result: toolResult.blocked ? 'blocked' : (ok ? 'succeeded' : 'failed'),
      summary,
      toolId,
      evidenceRecordIds: (toolResult.evidenceRecords ?? []).map((record) => record.id),
      recordCount: toolResult.evidenceRecords?.length ?? 0,
    };
  }

  return {
    kind: 'onebase_tool',
    source: 'onebase-worker-tools',
    result: ok ? 'succeeded' : 'failed',
    summary: `${toolId} ${ok ? 'ok' : 'failed'}`,
    toolId,
  };
}

export function executeOnebaseWorkerTool(toolId, args = {}, context = {}) {
  const onebaseRoot = resolveOnebaseProjectRoot(context);

  switch (toolId) {
    case 'onebase.listMetadata':
      return executeOnebaseListMetadata(onebaseRoot, context);
    case 'onebase.readConfigFile':
      return executeOnebaseReadConfigFile(onebaseRoot, args.relativePath, context);
    case 'onebase.staticVerify':
      return executeOnebaseStaticVerify(onebaseRoot);
    case 'onebase.runVerificationCommand':
      return executeOnebaseVerificationCommand({ ...context, policy: context.policy ?? {} });
    case 'onebase.describeCli':
      return executeOnebaseDescribeCli({ ...context, taskId: context.task?.id ?? context.taskId });
    case 'onebase.checkCli':
      return executeOnebaseCheckCli({ ...context, taskId: context.task?.id ?? context.taskId });
    default:
      return {
        ok: false,
        toolId,
        error: `unknown onebase worker tool: ${toolId}`,
      };
  }
}

export function runOnebaseWorkerPreflight(task, options = {}) {
  if (!isOnebaseDomainTask(task)) {
    return { ok: true, skipped: true, evidence: [], toolResults: [] };
  }

  const onebaseRoot = resolveOnebaseProjectRoot(options);
  const toolResults = [
    executeOnebaseListMetadata(onebaseRoot, options),
    executeOnebaseStaticVerify(onebaseRoot),
    executeOnebaseDescribeCli({ ...options, taskId: task.id }),
    executeOnebaseCheckCli({ ...options, taskId: task.id }),
    executeOnebaseVerificationCommand({ ...options, policy: options.policy ?? { allowShell: false } }),
  ];

  const firstReadable = pickReadableOnebaseTarget(task, onebaseRoot);
  if (firstReadable) {
    toolResults.push(executeOnebaseReadConfigFile(onebaseRoot, firstReadable, options));
  }

  const evidence = toolResults.map((result) => buildOnebaseWorkerEvidence(result));
  const ok = toolResults.every((result) => result.ok === true || result.blocked === true);

  return {
    ok,
    skipped: false,
    onebaseRoot,
    evidence,
    toolResults,
    summary: {
      metadataTotal: toolResults.find((result) => result.toolId === 'onebase.listMetadata')?.summary?.total ?? 0,
      staticVerifyOk: toolResults.find((result) => result.toolId === 'onebase.staticVerify')?.ok === true,
      verificationBlocked: toolResults.find((result) => result.toolId === 'onebase.runVerificationCommand')?.blocked === true,
    },
  };
}

function collectMetadataEntries(dirPath, root, dirName, entries, failures, options) {
  let dirEntries;
  try {
    dirEntries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch (error) {
    failures.push(`failed to read directory ${path.relative(root, dirPath)}: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  for (const entry of dirEntries) {
    const absolutePath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      collectMetadataEntries(absolutePath, root, dirName, entries, failures, options);
      continue;
    }

    if (!YAML_EXT.test(entry.name)) {
      continue;
    }

    const relativePath = path.relative(root, absolutePath).replace(/\\/gu, '/');
    try {
      const text = fs.readFileSync(absolutePath, 'utf8');
      const facts = extractJsonYamlFacts(text, { filePath: relativePath, extension: path.extname(entry.name) });
      const metadata = facts.domainMetadata ?? {};
      entries.push({
        yamlPath: relativePath,
        kind: metadata.artifactKind === 'yaml' || !metadata.artifactKind
          ? dirName.replace(/s$/u, '')
          : metadata.artifactKind,
        name: metadata.name ?? path.basename(entry.name, path.extname(entry.name)),
        posting: metadata.posting ?? null,
        fieldCount: metadata.fields?.length ?? 0,
      });
    } catch (error) {
      failures.push(`failed to read ${relativePath}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

function normalizeBoundedRelativePath(relativePath) {
  const raw = String(relativePath ?? '').trim().replace(/\\/gu, '/');
  if (raw === '') {
    return { ok: false, error: 'relativePath is required' };
  }

  if (path.isAbsolute(raw) || raw.includes('..')) {
    return { ok: false, error: 'relativePath must stay inside onebase root' };
  }

  const normalized = raw.replace(/^\/+/u, '');
  const lower = normalized.toLowerCase();

  const inMetadataDir = ONEBASE_METADATA_DIRS.some((dirName) =>
    lower === dirName || lower.startsWith(`${dirName}/`));
  const inSrcOs = lower.startsWith('src/') && lower.endsWith('.os');
  const inExamples = lower.startsWith('examples/');

  if (!inMetadataDir && !inSrcOs && !inExamples) {
    return { ok: false, error: 'relativePath must be under metadata dirs, src/*.os or examples/' };
  }

  return { ok: true, relativePath: normalized };
}

function buildArtifactFacts(relativePath, text) {
  const lower = relativePath.toLowerCase();
  if (lower.endsWith('.os')) {
    return extractOnebaseOsFacts(text, { filePath: relativePath });
  }

  return extractJsonYamlFacts(text, {
    filePath: relativePath,
    extension: path.extname(relativePath),
  });
}

function pickReadableOnebaseTarget(task, onebaseRoot) {
  for (const target of task.targetFiles ?? []) {
    const normalized = String(target).replace(/\\/gu, '/');
    if (!normalized.includes('onebase')) {
      continue;
    }

    const marker = 'onebase/';
    const index = normalized.toLowerCase().indexOf(marker);
    if (index === -1) {
      continue;
    }

    const relativePath = normalized.slice(index + marker.length);
    const bounded = normalizeBoundedRelativePath(relativePath);
    if (!bounded.ok) {
      continue;
    }

    const absolutePath = path.join(onebaseRoot, bounded.relativePath);
    if (fs.existsSync(absolutePath)) {
      return bounded.relativePath;
    }
  }

  const defaultCandidates = [
    'examples/trade/registers/валовая_прибыль.yaml',
    'examples/trade/src/реализациятоваров.posting.os',
  ];

  for (const candidate of defaultCandidates) {
    if (fs.existsSync(path.join(onebaseRoot, candidate))) {
      return candidate;
    }
  }

  return null;
}
