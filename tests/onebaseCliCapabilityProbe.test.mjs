import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  ONEBASE_AI_CLI_COMMANDS,
  parseOnebaseHelpCommands,
  probeOnebaseCliCapabilities,
} from '../src/onebaseCliCapabilityProbe.mjs';
import {
  attachCliAvailabilityToParityRows,
  buildOnebaseParityEvidencePayload,
  formatParityEvidenceLine,
} from '../src/onebaseParityEvidenceSync.mjs';

const SAMPLE_HELP = `
Usage:
  onebase [command]

Available Commands:
  dev         Run development server
  init        Initialize project
  migrate     Run migrations
  help        Help about any command
`;

const FULL_HELP = `
Available Commands:
  dev         Run development server
  init        Initialize project
  check       Validate configuration
  describe    Describe configuration
  ai-guide    AI guide output
`;

describe('parseOnebaseHelpCommands', () => {
  it('parses command names from help text', () => {
    const commands = parseOnebaseHelpCommands(SAMPLE_HELP);
    assert.deepEqual(commands, ['dev', 'help', 'init', 'migrate']);
  });

  it('includes ai-guide and check when present', () => {
    const commands = parseOnebaseHelpCommands(FULL_HELP);
    assert.equal(commands.includes('check'), true);
    assert.equal(commands.includes('describe'), true);
    assert.equal(commands.includes('ai-guide'), true);
  });
});

describe('probeOnebaseCliCapabilities', () => {
  it('maps AI commands from mocked help output', () => {
    const probe = probeOnebaseCliCapabilities({
      repoRoot: process.cwd(),
      spawnSyncImpl: () => ({
        status: 0,
        stdout: FULL_HELP,
        stderr: '',
      }),
    });

    assert.equal(probe.schema, 'onebase.cli-capabilities.v1');
    assert.equal(probe.commands.check, true);
    assert.equal(probe.commands.describe, true);
    assert.equal(probe.commands['ai-guide'], true);
    assert.equal(probe.commands.init, true);
    assert.equal(probe.ok, true);
    assert.equal(ONEBASE_AI_CLI_COMMANDS.length, 4);
  });

  it('marks commands missing when help lacks them', () => {
    const probe = probeOnebaseCliCapabilities({
      repoRoot: process.cwd(),
      spawnSyncImpl: () => ({
        status: 0,
        stdout: SAMPLE_HELP,
        stderr: '',
      }),
    });

    assert.equal(probe.commands.check, false);
    assert.equal(probe.commands.describe, false);
    assert.equal(probe.commands['ai-guide'], false);
    assert.equal(probe.commands.init, true);
  });
});

describe('onebaseParityEvidenceSync', () => {
  it('attaches cliAvailable to parity rows', () => {
    const probe = {
      probedAt: '2026-05-29T00:00:00.000Z',
      binary: 'onebase',
      commands: { check: false, describe: true, 'ai-guide': false, init: true },
    };

    const rows = attachCliAvailabilityToParityRows([
      { capability: 'check_config' },
      { capability: 'describe_config' },
      { capability: 'metadata_scan' },
    ], probe);

    assert.equal(rows[0].cliAvailable, false);
    assert.equal(rows[0].cliCommand, 'check');
    assert.equal(rows[1].cliAvailable, true);
    assert.equal(rows[2].cliAvailable, null);
  });

  it('builds evidence payload with formatted line', () => {
    const probe = {
      probedAt: '2026-05-29T00:00:00.000Z',
      binary: 'D:/onebase/onebase.exe',
      commands: { check: false, describe: false, 'ai-guide': false, init: true },
    };

    const payload = buildOnebaseParityEvidencePayload(probe);
    assert.equal(payload.schema, 'onebase.parity-evidence.v1');
    assert.match(payload.evidenceLine, /check=missing/u);
    assert.ok(payload.parity.rows.some((row) => row.capability === 'check_config'));
    assert.equal(formatParityEvidenceLine(probe), payload.evidenceLine);
  });
});
