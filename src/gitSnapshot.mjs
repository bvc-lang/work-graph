import { execFile } from 'node:child_process';
import { access, readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, normalize, relative, resolve } from 'node:path';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

export const GIT_SNAPSHOT_PROTOCOL_ID = 'workgraph-git-snapshot-v1';
export const GIT_SNAPSHOT_SETTINGS_REL = '.work-graph/git-snapshot.json';

export const GIT_SNAPSHOT_EVENTS = {
  WORK_ITEM_DONE: 'work_item.done',
  WORK_ITEM_STATUS: 'work_item.status',
  WORK_ITEM_CREATED: 'work_item.created',
  ANALYTICS_CREATED: 'analytics.created',
  ANALYTICS_CLOSING: 'analytics.closing',
};

const EVENT_ALIASES = new Map([
  ['done', GIT_SNAPSHOT_EVENTS.WORK_ITEM_DONE],
  ['status', GIT_SNAPSHOT_EVENTS.WORK_ITEM_STATUS],
  ['created', GIT_SNAPSHOT_EVENTS.WORK_ITEM_CREATED],
  ['analytics', GIT_SNAPSHOT_EVENTS.ANALYTICS_CREATED],
  ['closing', GIT_SNAPSHOT_EVENTS.ANALYTICS_CLOSING],
  [GIT_SNAPSHOT_EVENTS.WORK_ITEM_DONE, GIT_SNAPSHOT_EVENTS.WORK_ITEM_DONE],
  [GIT_SNAPSHOT_EVENTS.WORK_ITEM_STATUS, GIT_SNAPSHOT_EVENTS.WORK_ITEM_STATUS],
  [GIT_SNAPSHOT_EVENTS.WORK_ITEM_CREATED, GIT_SNAPSHOT_EVENTS.WORK_ITEM_CREATED],
  [GIT_SNAPSHOT_EVENTS.ANALYTICS_CREATED, GIT_SNAPSHOT_EVENTS.ANALYTICS_CREATED],
  [GIT_SNAPSHOT_EVENTS.ANALYTICS_CLOSING, GIT_SNAPSHOT_EVENTS.ANALYTICS_CLOSING],
]);

export const DEFAULT_GIT_SNAPSHOT_POLICY = {
  enabled: false,
  events: [
    GIT_SNAPSHOT_EVENTS.WORK_ITEM_DONE,
    GIT_SNAPSHOT_EVENTS.ANALYTICS_CREATED,
  ],
  recordShaInEvidence: true,
  debounceSeconds: 0,
  push: 'never',
  allowEmpty: 'skip',
  requireCleanSubset: true,
};

const debounceByRepoRoot = new Map();

function compareText(left, right) {
  return String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });
}

function parseTruthy(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on';
}

export function normalizeGitSnapshotEvent(value) {
  const raw = String(value ?? '').trim();
  if (raw === '') {
    return '';
  }
  return EVENT_ALIASES.get(raw) ?? EVENT_ALIASES.get(raw.toLowerCase()) ?? raw;
}

export function normalizeGitSnapshotEvents(values) {
  if (!Array.isArray(values)) {
    return [];
  }
  const normalized = values
    .map((entry) => normalizeGitSnapshotEvent(entry))
    .filter(Boolean);
  return [...new Set(normalized)].sort(compareText);
}

export function parseGitSnapshotEventsEnv(raw) {
  const text = String(raw ?? '').trim();
  if (text === '') {
    return null;
  }
  return normalizeGitSnapshotEvents(text.split(/[,;\s]+/u).map((entry) => entry.trim()).filter(Boolean));
}

export function mergeGitSnapshotPolicy(base = {}, overrides = {}) {
  const events = overrides.events !== undefined
    ? normalizeGitSnapshotEvents(overrides.events)
    : normalizeGitSnapshotEvents(base.events ?? DEFAULT_GIT_SNAPSHOT_POLICY.events);

  return {
    enabled: overrides.enabled ?? base.enabled ?? DEFAULT_GIT_SNAPSHOT_POLICY.enabled,
    events: events.length > 0 ? events : [...DEFAULT_GIT_SNAPSHOT_POLICY.events],
    recordShaInEvidence: overrides.recordShaInEvidence ?? base.recordShaInEvidence ?? DEFAULT_GIT_SNAPSHOT_POLICY.recordShaInEvidence,
    debounceSeconds: Number(overrides.debounceSeconds ?? base.debounceSeconds ?? DEFAULT_GIT_SNAPSHOT_POLICY.debounceSeconds) || 0,
    push: 'never',
    allowEmpty: overrides.allowEmpty ?? base.allowEmpty ?? DEFAULT_GIT_SNAPSHOT_POLICY.allowEmpty,
    requireCleanSubset: overrides.requireCleanSubset ?? base.requireCleanSubset ?? DEFAULT_GIT_SNAPSHOT_POLICY.requireCleanSubset,
  };
}

export async function readGitSnapshotSettingsFile(repoRoot, options = {}) {
  const cwd = resolve(options.cwd ?? repoRoot ?? process.cwd());
  const settingsPath = join(cwd, GIT_SNAPSHOT_SETTINGS_REL);
  try {
    const text = await readFile(settingsPath, 'utf8');
    const parsed = JSON.parse(text);
    return {
      path: settingsPath,
      settings: parsed && typeof parsed === 'object' ? parsed : {},
    };
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return { path: settingsPath, settings: {} };
    }
    throw error;
  }
}

export async function writeGitSnapshotSettingsFile(repoRoot, settings, options = {}) {
  const cwd = resolve(options.cwd ?? repoRoot ?? process.cwd());
  const settingsPath = join(cwd, GIT_SNAPSHOT_SETTINGS_REL);
  const normalized = mergeGitSnapshotPolicy({}, settings ?? {});
  await mkdir(dirname(settingsPath), { recursive: true });
  await writeFile(settingsPath, `${JSON.stringify(normalized, null, 2)}\n`, 'utf8');
  return { path: settingsPath, settings: normalized };
}

export function resolveGitSnapshotPolicy(options = {}) {
  const env = options.env ?? process.env;
  const filePolicy = options.filePolicy ?? options.settings ?? {};
  const envEnabled = env.WORKGRAPH_GIT_SNAPSHOT !== undefined
    ? parseTruthy(env.WORKGRAPH_GIT_SNAPSHOT)
    : undefined;
  const envEvents = parseGitSnapshotEventsEnv(env.WORKGRAPH_GIT_SNAPSHOT_EVENTS);

  const merged = mergeGitSnapshotPolicy(DEFAULT_GIT_SNAPSHOT_POLICY, {
    ...filePolicy,
    ...(envEnabled !== undefined ? { enabled: envEnabled } : {}),
    ...(envEvents ? { events: envEvents } : {}),
    ...(options.overrides ?? {}),
  });

  return merged;
}

export async function loadGitSnapshotPolicy(options = {}) {
  const cwd = resolve(options.cwd ?? options.repoRoot ?? process.cwd());
  const { settings } = await readGitSnapshotSettingsFile(cwd, { cwd });
  return resolveGitSnapshotPolicy({
    env: options.env,
    filePolicy: settings,
    overrides: options.overrides,
  });
}

export function isGitSnapshotPathAllowed(relativePath) {
  const normalized = String(relativePath ?? '').replace(/\\/g, '/').trim();
  if (normalized === '' || normalized.startsWith('/')) {
    return false;
  }
  if (/[*?[\]]/u.test(normalized)) {
    return false;
  }
  if (normalized.split('/').includes('..')) {
    return false;
  }
  return normalized.startsWith('intent/')
    || normalized.startsWith('work/')
    || normalized.startsWith('.work-graph/canon/');
}

export function normalizeGitSnapshotPaths(paths, cwd = process.cwd()) {
  if (!Array.isArray(paths)) {
    throw new TypeError('paths must be an array');
  }

  const repoRoot = resolve(cwd);
  const normalized = [];

  for (const entry of paths) {
    const raw = String(entry ?? '').trim();
    if (raw === '') {
      continue;
    }
    if (/[*?[\]]/u.test(raw)) {
      throw new Error(`git snapshot path rejects wildcards: ${raw}`);
    }

    const absolute = resolve(repoRoot, raw);
    const relativePath = relative(repoRoot, absolute).replace(/\\/g, '/');
    if (relativePath.startsWith('..') || relativePath === '') {
      throw new Error(`git snapshot path must stay inside repo: ${raw}`);
    }
    if (!isGitSnapshotPathAllowed(relativePath)) {
      throw new Error(`git snapshot path not allowed by policy: ${relativePath}`);
    }
    normalized.push(normalize(relativePath).replace(/\\/g, '/'));
  }

  return [...new Set(normalized)].sort(compareText);
}

export function buildGitSnapshotMessage({
  event,
  workId = '',
  analyticsKey = '',
  title = '',
  template,
} = {}) {
  const eventShort = String(event ?? '')
    .replace(/^work_item\./u, '')
    .replace(/^analytics\./u, 'analytics:');
  const subject = String(workId || analyticsKey || 'snapshot').trim();
  const headline = String(title || subject).trim();
  const resolvedTemplate = String(template ?? 'wg({eventShort}): {subject} — {title}').trim();
  return resolvedTemplate
    .replaceAll('{event}', String(event ?? ''))
    .replaceAll('{eventShort}', eventShort)
    .replaceAll('{workId}', String(workId ?? ''))
    .replaceAll('{analyticsKey}', String(analyticsKey ?? ''))
    .replaceAll('{subject}', subject)
    .replaceAll('{title}', headline);
}

export function formatGitSnapshotEvidenceLine(result) {
  if (!result || result.skipped) {
    return result?.evidence ?? '';
  }
  if (!result.ok || !result.sha) {
    return result?.evidence ?? `git snapshot: skipped reason=${result?.reason ?? 'failed'}`;
  }
  const pathCount = Array.isArray(result.stagedPaths) ? result.stagedPaths.length : 0;
  return `git snapshot: sha=${result.sha} event=${result.event ?? 'manual'} paths=${pathCount}`;
}

function shouldDebounce(repoRoot, debounceSeconds) {
  const seconds = Number(debounceSeconds) || 0;
  if (seconds <= 0) {
    return false;
  }
  const lastAt = debounceByRepoRoot.get(repoRoot) ?? 0;
  const now = Date.now();
  if (now - lastAt < seconds * 1000) {
    return true;
  }
  debounceByRepoRoot.set(repoRoot, now);
  return false;
}

async function pathExists(path) {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

async function runGitCommand(cwd, args) {
  try {
    const { stdout, stderr } = await execFileAsync('git', args, {
      cwd,
      maxBuffer: 16 * 1024 * 1024,
      windowsHide: true,
    });
    return { ok: true, stdout: String(stdout ?? '').trim(), stderr: String(stderr ?? '').trim() };
  } catch (error) {
    return {
      ok: false,
      stdout: String(error?.stdout ?? '').trim(),
      stderr: String(error?.stderr ?? error?.message ?? '').trim(),
      code: error?.code,
    };
  }
}

export async function runGitSnapshot(options = {}) {
  const cwd = resolve(options.cwd ?? options.repoRoot ?? process.cwd());
  const event = normalizeGitSnapshotEvent(options.event);
  const policy = options.policy ?? await loadGitSnapshotPolicy({ cwd, env: options.env, overrides: options.policyOverrides });

  if (!policy.enabled) {
    return {
      ok: true,
      skipped: true,
      reason: 'disabled',
      event,
      evidence: 'git snapshot: skipped reason=disabled',
    };
  }

  if (event && !policy.events.includes(event)) {
    return {
      ok: true,
      skipped: true,
      reason: 'event_disabled',
      event,
      evidence: `git snapshot: skipped reason=event_disabled event=${event}`,
    };
  }

  if (shouldDebounce(cwd, policy.debounceSeconds)) {
    return {
      ok: true,
      skipped: true,
      reason: 'debounced',
      event,
      evidence: 'git snapshot: skipped reason=debounced',
    };
  }

  let stagedPaths;
  try {
    stagedPaths = normalizeGitSnapshotPaths(options.paths ?? [], cwd);
  } catch (error) {
    return {
      ok: false,
      skipped: true,
      reason: 'invalid_paths',
      event,
      error: error.message,
      evidence: `git snapshot: skipped reason=invalid_paths`,
    };
  }

  if (stagedPaths.length === 0) {
    return {
      ok: true,
      skipped: true,
      reason: 'no_paths',
      event,
      evidence: 'git snapshot: skipped reason=no_paths',
    };
  }

  const repoCheck = await runGitCommand(cwd, ['rev-parse', '--show-toplevel']);
  if (!repoCheck.ok) {
    return {
      ok: false,
      skipped: true,
      reason: 'not_a_git_repo',
      event,
      error: repoCheck.stderr,
      evidence: 'git snapshot: skipped reason=not_a_git_repo',
    };
  }

  const existingPaths = [];
  for (const relativePath of stagedPaths) {
    if (await pathExists(join(cwd, relativePath))) {
      existingPaths.push(relativePath);
    }
  }

  if (existingPaths.length === 0) {
    return {
      ok: true,
      skipped: true,
      reason: 'missing_paths',
      event,
      stagedPaths,
      evidence: 'git snapshot: skipped reason=missing_paths',
    };
  }

  for (const relativePath of existingPaths) {
    const stageResult = await runGitCommand(cwd, ['add', '--', relativePath]);
    if (!stageResult.ok) {
      return {
        ok: false,
        skipped: true,
        reason: 'stage_failed',
        event,
        stagedPaths: existingPaths,
        error: stageResult.stderr,
        evidence: `git snapshot: skipped reason=stage_failed`,
      };
    }
  }

  const diffResult = await runGitCommand(cwd, ['diff', '--cached', '--quiet']);
  const hasStagedChanges = !diffResult.ok;
  if (!hasStagedChanges) {
    if (policy.allowEmpty === 'skip') {
      return {
        ok: true,
        skipped: true,
        reason: 'empty',
        event,
        stagedPaths: existingPaths,
        evidence: 'git snapshot: skipped reason=empty',
      };
    }
  }

  const message = buildGitSnapshotMessage({
    event,
    workId: options.workId,
    analyticsKey: options.analyticsKey,
    title: options.title,
    template: options.messageTemplate,
  });

  const commitResult = await runGitCommand(cwd, ['commit', '-m', message]);
  if (!commitResult.ok) {
    return {
      ok: false,
      skipped: true,
      reason: 'commit_failed',
      event,
      stagedPaths: existingPaths,
      error: commitResult.stderr,
      evidence: `git snapshot: skipped reason=commit_failed`,
    };
  }

  const shaResult = await runGitCommand(cwd, ['rev-parse', 'HEAD']);
  const sha = shaResult.ok ? shaResult.stdout : '';
  debounceByRepoRoot.set(cwd, Date.now());

  const result = {
    ok: true,
    skipped: false,
    sha,
    event,
    stagedPaths: existingPaths,
    message,
    evidence: formatGitSnapshotEvidenceLine({ ok: true, sha, event, stagedPaths: existingPaths }),
  };
  result.evidence = formatGitSnapshotEvidenceLine(result);
  return result;
}

export function inferGitSnapshotEventFromPersistOptions(options = {}) {
  if (options.gitSnapshot?.event) {
    return normalizeGitSnapshotEvent(options.gitSnapshot.event);
  }
  const operation = String(options.writeAudit?.operation ?? options.gitSnapshotOperation ?? '').trim();
  if (operation === 'create') {
    return GIT_SNAPSHOT_EVENTS.WORK_ITEM_CREATED;
  }
  if (operation === 'complete') {
    return GIT_SNAPSHOT_EVENTS.WORK_ITEM_DONE;
  }
  if (operation === 'status' || operation === 'claim' || operation === 'evidence') {
    return GIT_SNAPSHOT_EVENTS.WORK_ITEM_STATUS;
  }
  return '';
}

export async function maybeRunGitSnapshotAfterPersist(options = {}) {
  if (options.skipGitSnapshot === true) {
    return { ok: true, skipped: true, reason: 'explicit_skip' };
  }

  const gitSnapshot = options.gitSnapshot ?? {};
  const event = normalizeGitSnapshotEvent(gitSnapshot.event ?? inferGitSnapshotEventFromPersistOptions(options));
  const paths = gitSnapshot.paths ?? options.paths ?? [];
  if (Array.isArray(options.persistedResults)) {
    for (const entry of options.persistedResults) {
      if (entry?.path) {
        paths.push(entry.path);
      }
    }
  }

  try {
    return await runGitSnapshot({
      cwd: options.cwd ?? options.repoRoot ?? process.cwd(),
      env: options.env,
      event,
      paths,
      workId: gitSnapshot.workId ?? options.workId,
      analyticsKey: gitSnapshot.analyticsKey ?? options.analyticsKey,
      title: gitSnapshot.title ?? options.title,
      policy: options.policy,
      policyOverrides: options.policyOverrides,
    });
  } catch (error) {
    return {
      ok: false,
      skipped: true,
      reason: 'unexpected_error',
      error: error.message,
      evidence: 'git snapshot: skipped reason=unexpected_error',
    };
  }
}

export async function appendGitSnapshotEvidenceToWorkItem(item, snapshotResult, options = {}) {
  const policy = options.policy ?? await loadGitSnapshotPolicy({ cwd: options.cwd, env: options.env });
  if (!policy.recordShaInEvidence) {
    return { item, appended: false, snapshotResult };
  }
  const line = formatGitSnapshotEvidenceLine(snapshotResult);
  if (!line || !snapshotResult?.sha) {
    return { item, appended: false, snapshotResult };
  }
  const evidence = Array.isArray(item.evidence) ? item.evidence : [];
  if (evidence.some((entry) => String(entry).includes(snapshotResult.sha))) {
    return { item, appended: false, snapshotResult };
  }
  const { recordEvidence } = await import('./workGraphRuntime.mjs');
  return {
    item: recordEvidence(item, line),
    appended: true,
    snapshotResult,
    evidenceLine: line,
  };
}
