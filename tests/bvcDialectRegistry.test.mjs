import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  detectDialectFromBvcSectionTitle,
  getDialect,
  normalizeDialectId,
  parseBvcFilePragma,
  REGISTERED_DIALECT_IDS,
} from '../src/bvcDialectRegistry.mjs';

describe('bvcDialectRegistry', () => {
  it('loads en and ru dialects', () => {
    assert.deepEqual(REGISTERED_DIALECT_IDS, ['en', 'ru']);
    assert.equal(getDialect('en').bvc.basis, 'Basis');
    assert.equal(getDialect('ru').bvc.basis, 'Базис');
  });

  it('defaults empty lang to ru for Work Graph legacy', () => {
    assert.equal(normalizeDialectId(undefined), 'ru');
    assert.equal(normalizeDialectId(''), 'ru');
  });

  it('detects dialect from section title', () => {
    assert.equal(detectDialectFromBvcSectionTitle('Basis'), 'en');
    assert.equal(detectDialectFromBvcSectionTitle('Базис'), 'ru');
    assert.equal(detectDialectFromBvcSectionTitle('Проверки'), null);
  });

  it('parses file pragma', () => {
    assert.equal(parseBvcFilePragma('#!bvc lang=ru\n#Atom<[...\n'), 'ru');
    assert.equal(parseBvcFilePragma('#Atom<[...\n'), null);
  });
});
