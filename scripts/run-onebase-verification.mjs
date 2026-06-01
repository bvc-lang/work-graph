import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const repoRoot = resolve(scriptDir, '..');
const onebaseRoot = resolve(repoRoot, '../onebase');
const timeoutMs = 300_000;

/** @returns {string[]} */
function goCommandCandidates() {
  const portableGo =
    process.platform === 'win32'
      ? resolve(repoRoot, '../.tools/go/bin/go.exe')
      : resolve(repoRoot, '../.tools/go/bin/go');
  const programFilesGo =
    process.platform === 'win32' ? 'C:\\Program Files\\Go\\bin\\go.exe' : '/usr/local/go/bin/go';

  const candidates = ['go'];
  if (existsSync(portableGo)) candidates.push(portableGo);
  if (existsSync(programFilesGo)) candidates.push(programFilesGo);
  return candidates;
}

function runCommand(command, args, cwd) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: 'utf8',
    timeout: timeoutMs,
    shell: process.platform === 'win32',
  });
  return {
    command: [command, ...args].join(' '),
    cwd,
    exitCode: result.status ?? 1,
    stdout: (result.stdout || '').trim(),
    stderr: (result.stderr || '').trim(),
    timedOut: result.error?.code === 'ETIMEDOUT',
  };
}

function printBlockedEvidence(preflight) {
  const output = [preflight.stdout, preflight.stderr].filter(Boolean).join('\n');
  console.error('BLOCKED OneBase verification: Go toolchain unavailable.');
  console.error(`preflight: ${preflight.command}`);
  console.error(`cwd: ${onebaseRoot}`);
  console.error(`exit_code: ${preflight.exitCode}`);
  if (output) console.error(output);
  console.error(
    'Hint: install Go via winget or extract portable go to ../.tools/go (see docs/plan-rebuild-post-mvp.md).',
  );
  console.error('Record as WorkItem Свидетельства blocked evidence; primary go test was not run.');
  process.exit(2);
}

/** @returns {{ goCommand: string, preflight: ReturnType<typeof runCommand> } | null} */
function resolveGoToolchain() {
  for (const goCommand of goCommandCandidates()) {
    const preflight = runCommand(goCommand, ['version'], onebaseRoot);
    if (preflight.exitCode === 0) {
      return { goCommand, preflight };
    }
  }
  return null;
}

const resolved = resolveGoToolchain();
if (!resolved) {
  printBlockedEvidence({
    command: 'go version',
    cwd: onebaseRoot,
    exitCode: 1,
    stdout: '',
    stderr: 'go not found in PATH, ../.tools/go, or default install location',
    timedOut: false,
  });
}

console.log(`go_toolchain: ${resolved.goCommand}`);
console.log(resolved.preflight.stdout || resolved.preflight.stderr);

const testRun = runCommand(resolved.goCommand, ['test', './...'], onebaseRoot);
const combined = [testRun.stdout, testRun.stderr].filter(Boolean).join('\n');
console.log(`command: ${testRun.command}`);
console.log(`cwd: ${onebaseRoot}`);
console.log(`exit_code: ${testRun.exitCode}`);
if (combined) console.log(combined);

if (testRun.timedOut) {
  console.error(`timeout: ${timeoutMs}ms`);
  process.exit(124);
}

process.exit(testRun.exitCode === 0 ? 0 : 1);
