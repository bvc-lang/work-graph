import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const DEFAULT_TIMEOUT_MS = 120_000;

export function resolveOnebaseCliBinary(env = process.env, options = {}) {
  const fromEnv = String(env.ONEBASE_CLI ?? '').trim();
  if (fromEnv !== '') {
    return fromEnv;
  }

  const repoRoot = options.repoRoot ?? process.cwd();
  const portableWin = resolve(repoRoot, '../onebase/onebase.exe');
  const portableUnix = resolve(repoRoot, '../onebase/onebase');
  if (process.platform === 'win32' && existsSync(portableWin)) {
    return portableWin;
  }
  if (existsSync(portableUnix)) {
    return portableUnix;
  }

  return 'onebase';
}

export function resolveDefaultOnebaseProjectRoot(options = {}) {
  const fromEnv = String(options.env?.ONEBASE_PROJECT_ROOT ?? process.env.ONEBASE_PROJECT_ROOT ?? '').trim();
  if (fromEnv !== '') {
    return resolve(fromEnv);
  }

  if (options.projectRoot) {
    return resolve(String(options.projectRoot));
  }

  return resolve(options.repoRoot ?? process.cwd(), '../onebase/examples/trade');
}

export function buildOnebaseProjectArgs(projectRoot) {
  const root = String(projectRoot ?? '').trim();
  return root === '' ? [] : ['--project', root];
}

export function runOnebaseCli(subcommand, extraArgs = [], options = {}) {
  const spawnImpl = options.spawnSyncImpl ?? spawnSync;
  const binary = resolveOnebaseCliBinary(options.env, { repoRoot: options.repoRoot });
  const projectRoot = options.projectRoot ?? options.cwd;
  const args = [
    subcommand,
    ...extraArgs,
    ...buildOnebaseProjectArgs(projectRoot),
  ];
  const command = `${binary} ${args.join(' ')}`;

  let spawnResult;
  try {
    spawnResult = spawnImpl(binary, args, {
      cwd: options.cwd ?? projectRoot,
      env: options.env ?? process.env,
      encoding: 'utf8',
      shell: false,
      timeout: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      exitCode: 1,
      stdout: '',
      stderr: message,
      command,
      args,
      failureClass: message.includes('ENOENT') ? 'cli_missing' : 'cli_error',
      message,
    };
  }

  const exitCode = spawnResult.status ?? 1;
  const stdout = String(spawnResult.stdout ?? '');
  const stderr = String(spawnResult.stderr ?? '');
  const combined = `${stdout}\n${stderr}`.toLowerCase();

  if (spawnResult.error) {
    const message = spawnResult.error.message;
    return {
      ok: false,
      exitCode,
      stdout,
      stderr,
      command,
      args,
      failureClass: message.includes('ENOENT') ? 'cli_missing' : 'cli_error',
      message,
    };
  }

  if (
    exitCode !== 0
    && (combined.includes('unknown command')
      || combined.includes('not found')
      || combined.includes('no such command'))
  ) {
    return {
      ok: false,
      exitCode,
      stdout,
      stderr,
      command,
      args,
      failureClass: 'cli_command_unavailable',
      message: `OneBase CLI subcommand "${subcommand}" is not available in this onebase build`,
    };
  }

  return {
    ok: exitCode === 0,
    exitCode,
    stdout,
    stderr,
    command,
    args,
    failureClass: exitCode === 0 ? undefined : 'cli_error',
    message: exitCode === 0 ? undefined : stderr.trim() || stdout.trim() || `exit ${exitCode}`,
  };
}

export function runOnebaseCheck(options = {}) {
  return runOnebaseCli('check', [], options);
}

export function runOnebaseDescribeJson(options = {}) {
  return runOnebaseCli('describe', ['--json'], options);
}

export function formatOnebaseCliResult(result) {
  return JSON.stringify({
    ok: result.ok,
    exitCode: result.exitCode,
    command: result.command,
    failureClass: result.failureClass ?? null,
    message: result.message ?? null,
    stdout: result.stdout,
    stderr: result.stderr,
  }, null, 2);
}
