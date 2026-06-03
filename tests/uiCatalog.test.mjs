import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { createUiTranslator, listUiCatalogKeys, loadUiCatalogSync } from '../src/ui/i18n/uiCatalog.mjs';
import { resolveUiLocale } from '../src/ui/i18n/resolveUiLocale.mjs';

describe('resolveUiLocale', () => {
  it('prefers cookie over accept-language', () => {
    assert.equal(resolveUiLocale({
      cookieHeader: 'wg_locale=en',
      acceptLanguage: 'ru-RU,ru;q=0.9',
    }), 'en');
  });

  it('falls back to ru by default', () => {
    assert.equal(resolveUiLocale({}), 'ru');
  });

  it('negotiates en from accept-language', () => {
    assert.equal(resolveUiLocale({
      acceptLanguage: 'en-US,en;q=0.9',
    }), 'en');
  });
});

describe('uiCatalog', () => {
  it('loads en and ru with matching keys', () => {
    const en = loadUiCatalogSync('en');
    const ru = loadUiCatalogSync('ru');
    const parity = listUiCatalogKeys(en, ru);
    assert.deepEqual(parity.missingInA, []);
    assert.deepEqual(parity.missingInB, []);
  });

  it('loads pseudolocale with key parity to en', () => {
    const en = loadUiCatalogSync('en');
    const ps = loadUiCatalogSync('ps');
    const parity = listUiCatalogKeys(en, ps);
    assert.deepEqual(parity.missingInA, []);
    assert.deepEqual(parity.missingInB, []);
    assert.match(ps.messages['nav.settings'], /^\[!! ~~/);
  });

  it('translates settings nav label', () => {
    const { t } = createUiTranslator(loadUiCatalogSync('en'));
    assert.equal(t('nav.settings'), 'Settings');
  });
});
