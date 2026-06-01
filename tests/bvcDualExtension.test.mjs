import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  bvcParseResultsEquivalent,
  isBvcReadablePath,
  lintBvcFilePath,
  parseBvcFileContent,
  readBvcTextFile,
  resetLegacyStepReadWarningsForTests,
  resolveBvcReadablePath,
  swapBvcExtension,
} from '../src/bvcFileFormat.mjs';

const CONFORMANCE_DIR = join(process.cwd(), 'tests/conformance');

describe('bvcFileFormat dual extension', () => {
  it('recognizes .bvc and .step as readable', () => {
    assert.equal(isBvcReadablePath('work/item.bvc'), true);
    assert.equal(isBvcReadablePath('work/item.step'), true);
    assert.equal(isBvcReadablePath('work/item.md'), false);
  });

  it('swaps extension for canon preference', () => {
    assert.equal(swapBvcExtension('a/step/file.step'), 'a/step/file.bvc');
    assert.equal(swapBvcExtension('a/step/file.bvc', { preferCanon: false }), 'a/step/file.step');
  });

  it('warns on legacy .step path', () => {
    const lints = lintBvcFilePath('protocols/foo.step');
    assert.ok(lints.some((entry) => entry.code === 'W_BVC_LEGACY_STEP_EXTENSION'));
    assert.equal(lintBvcFilePath('protocols/foo.bvc').length, 0);
  });

  it('resolves legacy .step path to renamed .bvc on disk', () => {
    const resolved = resolveBvcReadablePath('charter/main.bvc', process.cwd());
    assert.match(resolved, /charter[\\/]main\.bvc$/);
  });

  it('emits once-per-path legacy read warning', async () => {
    resetLegacyStepReadWarningsForTests();
    const warnings = [];
    await readBvcTextFile(join(CONFORMANCE_DIR, 'minimal.en.step'), {
      cwd: process.cwd(),
      onLegacyStepRead: ({ message }) => warnings.push(message),
    });
    assert.equal(warnings.length, 1);
    assert.match(warnings[0], /\.bvc/u);
    await readBvcTextFile(join(CONFORMANCE_DIR, 'minimal.en.step'), {
      cwd: process.cwd(),
      onLegacyStepRead: ({ message }) => warnings.push(message),
    });
    assert.equal(warnings.length, 1);
  });

  it('parses identical AST from .bvc and .step fixtures', async () => {
    const bvcText = await readFile(join(CONFORMANCE_DIR, 'minimal.en.bvc'), 'utf8');
    const stepText = await readFile(join(CONFORMANCE_DIR, 'minimal.en.step'), 'utf8');

    assert.equal(bvcText, stepText);

    const fromBvc = parseBvcFileContent(bvcText, { filePath: 'tests/conformance/minimal.en.bvc' });
    const fromStep = parseBvcFileContent(stepText, { filePath: 'tests/conformance/minimal.en.step' });

    assert.ok(bvcParseResultsEquivalent(fromBvc, fromStep));
    assert.equal(fromBvc.atoms[0]?.ast?.lang, 'en');
    assert.ok(fromStep.pathLints.some((lint) => lint.code === 'W_BVC_LEGACY_STEP_EXTENSION'));
    assert.equal(fromBvc.pathLints.length, 0);
  });
});
