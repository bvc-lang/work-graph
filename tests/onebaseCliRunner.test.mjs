import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildOnebaseProjectArgs,
  formatOnebaseCliResult,
  resolveDefaultOnebaseProjectRoot,
  runOnebaseCheck,
} from '../src/onebaseCliRunner.mjs';

describe('onebaseCliRunner (work graph)', () => {
  it('builds --project args', () => {
    assert.deepEqual(buildOnebaseProjectArgs('../onebase/examples/trade'), [
      '--project',
      '../onebase/examples/trade',
    ]);
  });

  it('resolves default trade project root from repo', () => {
    const root = resolveDefaultOnebaseProjectRoot({ repoRoot: process.cwd() });
    assert.match(root.replace(/\\/g, '/'), /onebase\/examples\/trade$/u);
  });

  it('detects unavailable check subcommand', () => {
    const result = runOnebaseCheck({
      projectRoot: '.',
      spawnSyncImpl: () => ({
        status: 1,
        stdout: '',
        stderr: 'unknown command "check" for "onebase"',
      }),
    });

    assert.equal(result.failureClass, 'cli_command_unavailable');
  });

  it('formats CLI result JSON', () => {
    const text = formatOnebaseCliResult({
      ok: true,
      exitCode: 0,
      stdout: 'ok',
      stderr: '',
      command: 'onebase check --project .',
      args: ['check', '--project', '.'],
    });
    assert.match(text, /"ok": true/u);
  });
});
