import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { BVC_LINT_E_DIALECT_MIX, bvcAtomAstEquivalent } from '../src/bvcAtomParser.mjs';
import { formatStepAtomDraft, parseStepAtomDrafts } from '../src/stepAtomFormatter.mjs';

const CONFORMANCE_DIR = join(dirname(fileURLToPath(import.meta.url)), 'conformance');

async function readFixture(name) {
  return readFile(join(CONFORMANCE_DIR, name), 'utf8');
}

describe('BVC conformance fixtures', () => {
  it('minimal.en.bvc and minimal.ru.bvc produce equivalent normalized AST', async () => {
    const enText = await readFixture('minimal.en.bvc');
    const ruText = await readFixture('minimal.ru.bvc');

    const [enParsed] = parseStepAtomDrafts(enText);
    const [ruParsed] = parseStepAtomDrafts(ruText);

    assert.equal(enParsed.draft.lang, 'en');
    assert.equal(ruParsed.draft.lang, 'ru');
    assert.equal(enParsed.langSource, 'atom_header');
    assert.equal(ruParsed.langSource, 'file_pragma');
    assert.ok(bvcAtomAstEquivalent(enParsed.ast, ruParsed.ast));
    assert.deepEqual(enParsed.ast.bvc, ruParsed.ast.bvc);
  });

  it('mixed-dialect.invalid.bvc reports E_BVC_DIALECT_MIX', async () => {
    const text = await readFixture('mixed-dialect.invalid.bvc');
    const [parsed] = parseStepAtomDrafts(text);
    assert.ok(parsed.lints.some((entry) => entry.code === BVC_LINT_E_DIALECT_MIX));
  });

  it('auto-detect-mixed-file.bvc assigns per-atom lang', async () => {
    const text = await readFixture('auto-detect-mixed-file.bvc');
    const parsed = parseStepAtomDrafts(text);
    assert.equal(parsed.length, 2);
    assert.equal(parsed[0].draft.lang, 'en');
    assert.equal(parsed[1].draft.lang, 'ru');
    assert.equal(parsed[0].langSource, 'atom_header');
    assert.equal(parsed[1].langSource, 'auto_detect');
  });

  it('dialect-preserve round-trip for EN and RU conformance samples', async () => {
    for (const fixture of ['minimal.en.bvc', 'minimal.ru.bvc']) {
      const text = await readFixture(fixture);
      const [parsed] = parseStepAtomDrafts(text);
      parsed.draft.profile = parsed.draft.labels['atom.profile'];
      const formatted = formatStepAtomDraft(parsed.draft);
      const [reparsed] = parseStepAtomDrafts(formatted);
      assert.equal(reparsed.draft.lang, parsed.draft.lang);
      assert.deepEqual(reparsed.ast.bvc, parsed.ast.bvc);
    }
  });
});
