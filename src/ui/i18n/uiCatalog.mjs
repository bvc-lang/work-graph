import { readFileSync } from 'node:fs';
import { readFile as readFileAsync } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { DEFAULT_UI_LOCALE, SUPPORTED_UI_LOCALES, resolveUiLocale } from './resolveUiLocale.mjs';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const repoLocalesRoot = join(moduleDir, '../../../locales');

function interpolate(template, params = {}) {
  return String(template).replace(/\{(\w+)\}/g, (_, key) => (
    params[key] != null ? String(params[key]) : `{${key}}`
  ));
}

export async function loadUiCatalog(locale, options = {}) {
  const normalized = SUPPORTED_UI_LOCALES.includes(locale) ? locale : DEFAULT_UI_LOCALE;
  const root = options.localesRoot ?? repoLocalesRoot;
  const path = join(root, normalized, 'ui.json');
  const text = await readFileAsync(path, 'utf8');
  const messages = JSON.parse(text);
  return { locale: normalized, messages };
}

export function loadUiCatalogSync(locale, options = {}) {
  const normalized = SUPPORTED_UI_LOCALES.includes(locale) ? locale : DEFAULT_UI_LOCALE;
  const root = options.localesRoot ?? repoLocalesRoot;
  const path = join(root, normalized, 'ui.json');
  const messages = JSON.parse(readFileSync(path, 'utf8'));
  return { locale: normalized, messages };
}

export function createUiTranslator(catalog) {
  const messages = catalog?.messages ?? {};
  const locale = catalog?.locale ?? DEFAULT_UI_LOCALE;

  function t(key, params) {
    const template = messages[key] ?? key;
    return params ? interpolate(template, params) : template;
  }

  return { locale, t, messages };
}

export async function createUiTranslatorForRequest(input = {}, options = {}) {
  const locale = resolveUiLocale(input);
  const catalog = await loadUiCatalog(locale, options);
  return createUiTranslator(catalog);
}

export function listUiCatalogKeys(catalogA, catalogB) {
  const keysA = new Set(Object.keys(catalogA?.messages ?? {}));
  const keysB = new Set(Object.keys(catalogB?.messages ?? {}));
  const missingInB = [...keysA].filter((key) => !keysB.has(key)).sort();
  const missingInA = [...keysB].filter((key) => !keysA.has(key)).sort();
  return { missingInA, missingInB };
}
