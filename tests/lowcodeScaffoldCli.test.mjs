import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  DEFAULT_ARCH_RULES_PATH,
  parseArchRulesStepText,
  parseMetadataTags,
  runLowcodeVerify,
  writeArchRulesScaffold,
} from '../src/lowcodeScaffoldCli.mjs';

const SAMPLE_RULE = `#ArchRule_TestRule<[
Базис: basis text.
Вектор: vector text.
Цель: goal text.
Метаданные: /*domain: architecture*/, /*severity: blocker*/
]>
`;

describe('parseArchRulesStepText', () => {
  it('parses arch rule blocks and skips ioHascSync', () => {
    const parsed = parseArchRulesStepText(`${SAMPLE_RULE}\n#ioHascSync<[{"v":1}]>`);

    assert.equal(parsed.ok, true);
    assert.equal(parsed.rules.length, 1);
    assert.equal(parsed.rules[0].id, 'ArchRule_TestRule');
    assert.equal(parsed.rules[0].metadata.domain, 'architecture');
    assert.equal(parsed.rules[0].metadata.severity, 'blocker');
  });

  it('reports missing sections', () => {
    const parsed = parseArchRulesStepText(`#ArchRule_Broken<[
Базис: only basis.
]>`);

    assert.equal(parsed.ok, false);
    assert.match(parsed.errors.join('; '), /missing basis\/vector\/goal/);
  });
});

describe('parseMetadataTags', () => {
  it('extracts domain and severity tags', () => {
    const metadata = parseMetadataTags('/*domain: security*/, /*severity: blocker*/, /*pattern: repository*/');

    assert.deepEqual(metadata, {
      domain: 'security',
      severity: 'blocker',
      pattern: 'repository',
    });
  });
});

describe('writeArchRulesScaffold', () => {
  it('writes stub scaffold from repository fixture charter', async () => {
    const outputDir = await mkdtemp(join(tmpdir(), 'wg-lowcode-scaffold-'));

    try {
      const result = await writeArchRulesScaffold({
        cwd: process.cwd(),
        charterPath: DEFAULT_ARCH_RULES_PATH,
        outputDir,
      });

      assert.equal(result.ok, true);
      assert.equal(result.summary.ruleCount, 4);
      assert.ok(result.filesWritten.some((filePath) => filePath.endsWith('manifest.json')));
      assert.ok(result.filesWritten.some((filePath) => filePath.includes('ArchRule_NoDirectDbInController.guard.stub.mjs')));

      const manifestText = await readFile(join(outputDir, 'manifest.json'), 'utf8');
      const manifest = JSON.parse(manifestText);
      assert.equal(manifest.schema, 'workgraph.lowcode.scaffold.manifest.v1');
      assert.equal(manifest.ruleCount, 4);
    } finally {
      await rm(outputDir, { recursive: true, force: true });
    }
  });

  it('supports dry-run without writing manifest file', async () => {
    const result = await writeArchRulesScaffold({
      cwd: process.cwd(),
      charterPath: DEFAULT_ARCH_RULES_PATH,
      dryRun: true,
    });

    assert.equal(result.ok, true);
    assert.equal(result.dryRun, true);
    assert.equal(result.filesWritten.length, 5);
    assert.equal(result.manifest?.schema, 'workgraph.lowcode.scaffold.manifest.v1');
  });
});

describe('runLowcodeVerify', () => {
  it('passes charter validation and scaffold dry-run on fixture', async () => {
    const result = await runLowcodeVerify({
      cwd: process.cwd(),
      charterPath: DEFAULT_ARCH_RULES_PATH,
    });

    assert.equal(result.ok, true);
    assert.equal(result.charter.ruleCount, 4);
    assert.equal(result.scaffoldDryRun.ruleCount, 4);
    assert.ok(result.scaffoldDryRun.filesPlanned.length >= 5);
  });
});
