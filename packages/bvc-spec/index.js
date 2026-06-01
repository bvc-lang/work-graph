/**
 * @bvc-lang/spec — static artifacts for BVC open format v0.0.1
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));

function readJson(relativePath) {
  return JSON.parse(readFileSync(join(ROOT, relativePath), 'utf8'));
}

export const BVC_SPEC_VERSION = '0.0.1';
export const BVC_EXTENSION_CANON = '.bvc';
export const BVC_EXTENSION_LEGACY = '.step';

export const dialects = {
  en: readJson('dialects/en.json'),
  ru: readJson('dialects/ru.json'),
};

export const schemas = {
  bvcAtomDraftV1: readJson('schemas/bvc-atom-draft.v1.json'),
};

export default {
  version: BVC_SPEC_VERSION,
  extension: BVC_EXTENSION_CANON,
  legacyExtension: BVC_EXTENSION_LEGACY,
  dialects,
  schemas,
};
