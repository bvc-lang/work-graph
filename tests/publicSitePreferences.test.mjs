import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  localeFromPathname,
  pathForLocale,
  stripLocalePathPrefix,
  withLocalePath,
} from '../src/publicSitePreferences.mjs';

describe('publicSitePreferences', () => {
  it('maps locale prefixes to routes and hrefs', () => {
    assert.equal(localeFromPathname('/'), 'ru');
    assert.equal(localeFromPathname('/product'), 'ru');
    assert.equal(localeFromPathname('/en'), 'en');
    assert.equal(localeFromPathname('/en/compare'), 'en');
    assert.equal(stripLocalePathPrefix('/en/compare'), '/compare');
    assert.equal(pathForLocale('/product', 'en'), '/en/product');
    assert.equal(pathForLocale('/en/product', 'ru'), '/product');
    assert.equal(withLocalePath('/docs', 'en'), '/en/docs');
    assert.equal(withLocalePath('/llms.txt', 'en'), '/llms.txt');
  });
});
