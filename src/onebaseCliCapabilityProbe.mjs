import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { resolveOnebaseCliBinary } from './onebaseCliRunner.mjs';

export const ONEBASE_AI_CLI_COMMANDS = ['init', 'check', 'describe', 'ai-guide'];

const HELP_COMMAND_PATTERN = /^\s{2,}([a-z][a-z0-9-]*)\s+/gmu;

export function parseOnebaseHelpCommands(helpText) {
  const text = String(helpText ?? '');
  const commands = new Set();
  const availableSection = text.split(/Available Commands:/iu)[1] ?? text;

  for (const match of availableSection.matchAll(HELP_COMMAND_PATTERN)) {
    commands.add(match[1]);
  }

  return [...commands].sort();
}

export function probeOnebaseCliCapabilities(options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  const binary = resolveOnebaseCliBinary(options.env, { repoRoot });
  const probedAt = options.probedAt ?? new Date().toISOString();

  let helpResult;
  try {
    helpResult = (options.spawnSyncImpl ?? spawnSync)(binary, ['--help'], {
      cwd: options.cwd ?? repoRoot,
      env: options.env ?? process.env,
      encoding: 'utf8',
      shell: false,
      timeout: options.timeoutMs ?? 30_000,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      schema: 'onebase.cli-capabilities.v1',
      probedAt,
      binary,
      ok: false,
      failureClass: message.includes('ENOENT') ? 'cli_missing' : 'cli_error',
      message,
      commands: Object.fromEntries(ONEBASE_AI_CLI_COMMANDS.map((name) => [name, false])),
      availableCommands: [],
    };
  }

  const stdout = String(helpResult.stdout ?? '');
  const stderr = String(helpResult.stderr ?? '');
  const combined = `${stdout}\n${stderr}`;
  const availableCommands = parseOnebaseHelpCommands(combined);
  const commands = Object.fromEntries(
    ONEBASE_AI_CLI_COMMANDS.map((name) => [name, availableCommands.includes(name)]),
  );

  return {
    schema: 'onebase.cli-capabilities.v1',
    probedAt,
    binary,
    ok: (helpResult.status ?? 1) === 0 || availableCommands.length > 0,
    failureClass: null,
    message: null,
    commands,
    availableCommands,
    helpExitCode: helpResult.status ?? 1,
  };
}

export function resolveDefaultCapabilitiesPath(options = {}) {
  return resolve(options.repoRoot ?? process.cwd(), options.path ?? 'work/onebase-cli-capabilities.v1.json');
}

export const ONEBASE_PVRG_METADATA_SCAN_CANDIDATES = [
  'tests/fixtures/onebase',
  '../onebase/examples/trade',
  'domains/onebase/examples/trade',
];

export function resolveOnebaseMetadataScanRoot(options = {}) {
  const repoRoot = resolve(options.repoRoot ?? process.cwd());
  const candidates = [
    options.relativeRoot,
    ...ONEBASE_PVRG_METADATA_SCAN_CANDIDATES,
  ].filter(Boolean);

  for (const relativeRoot of candidates) {
    const candidate = resolve(repoRoot, relativeRoot);
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function binaryExistsForProbe(options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  const binary = resolveOnebaseCliBinary(options.env, { repoRoot });
  if (binary.includes('/') || binary.includes('\\')) {
    return existsSync(binary);
  }

  return true;
}
