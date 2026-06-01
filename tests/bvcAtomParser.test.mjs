import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  BVC_LINT_E_DIALECT_MIX,
  lintBvcAtomDialect,
  parseBvcDocument,
  resolveAtomLang,
  scanBvcSectionDialects,
} from '../src/bvcAtomParser.mjs';
import {
  formatStepAtomDraft,
  parseBvcAtoms,
  parseStepAtomDrafts,
} from '../src/stepAtomFormatter.mjs';

describe('bvcAtomParser', () => {
  it('resolveAtomLang follows Detect-or-Declare priority', () => {
    assert.equal(
      resolveAtomLang({
        headerLang: 'en',
        labelsLang: 'ru',
        filePragmaLang: 'ru',
        autoDetectLang: 'ru',
      }).lang,
      'en',
    );
    assert.equal(
      resolveAtomLang({
        labelsLang: 'ru',
        filePragmaLang: 'en',
        autoDetectLang: 'en',
      }).source,
      'labels.lang',
    );
    assert.equal(
      resolveAtomLang({
        filePragmaLang: 'ru',
        autoDetectLang: 'en',
      }).lang,
      'ru',
    );
    assert.equal(
      resolveAtomLang({ autoDetectLang: 'ru' }).lang,
      'ru',
    );
  });

  it('detects mixed dialect keys in one atom', () => {
    const body = [
      'Basis:',
      '  - one',
      'Вектор:',
      '  - two',
    ].join('\n');
    const { dialects } = scanBvcSectionDialects(body);
    assert.deepEqual(Array.from(dialects).sort(), ['en', 'ru']);
    const lints = lintBvcAtomDialect(body, 'en');
    assert.ok(lints.some((entry) => entry.code === BVC_LINT_E_DIALECT_MIX));
  });

  it('parseBvcDocument extracts file pragma', () => {
    const doc = parseBvcDocument('#!bvc lang=ru\n#A<[\nБазис:\n  - x\n]>\n');
    assert.equal(doc.fileLang, 'ru');
    assert.match(doc.bodyText, /^#A<\[/);
  });

  it('parseStepAtomDrafts applies file pragma when keys absent', () => {
    const text = [
      '#!bvc lang=ru',
      '#OnlyLabels<[',
      'Проверки:',
      '  - no bvc keys before labels',
      '',
      'Метки:',
      '  atom.profile: work_item',
      '  work.id: test',
      ']>',
      '',
    ].join('\n');
    const [parsed] = parseStepAtomDrafts(text);
    assert.equal(parsed.draft.lang, 'ru');
    assert.equal(parsed.langSource, 'file_pragma');
  });

  it('header @en overrides file pragma', () => {
    const text = [
      '#!bvc lang=ru',
      '#Atom@en<[',
      'Basis:',
      '  - english',
      'Vector:',
      '  - english',
      'Goal:',
      '  - english',
      '',
      'Labels:',
      '  atom.profile: prompt_rule',
      ']>',
      '',
    ].join('\n');
    const [parsed] = parseStepAtomDrafts(text);
    assert.equal(parsed.draft.lang, 'en');
    assert.equal(parsed.langSource, 'atom_header');
  });
});

describe('parseBvcAtoms AST', () => {
  it('builds ast with lints on mixed dialect fixture', () => {
    const text = [
      '#Bad<[',
      'Basis:',
      '  - en',
      'Вектор:',
      '  - ru',
      'Цель:',
      '  - ru',
      '',
      'Labels:',
      '  atom.profile: prompt_rule',
      ']>',
      '',
    ].join('\n');
    const [parsed] = parseStepAtomDrafts(text);
    assert.ok(parsed.lints.some((entry) => entry.code === BVC_LINT_E_DIALECT_MIX));
    assert.equal(parsed.ast.lang, 'en');
  });

  it('EN format round-trip preserves @en header', () => {
    const original = formatStepAtomDraft({
      profile: 'prompt_rule',
      name: 'Rule_EN',
      lang: 'en',
      basis: ['a'],
      vector: ['b'],
      goal: ['c'],
      labels: { 'atom.profile': 'prompt_rule' },
    });
    assert.match(original, /^#Rule_EN@en<\[/);
    const [parsed] = parseStepAtomDrafts(original);
    assert.equal(parsed.draft.lang, 'en');
    assert.equal(formatStepAtomDraft(parsed.draft), original);
  });
});
