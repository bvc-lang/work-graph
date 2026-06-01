import enDialect from '../packages/bvc-dialects/en.json' with { type: 'json' };
import ruDialect from '../packages/bvc-dialects/ru.json' with { type: 'json' };

/** @type {Record<string, import('./bvcDialectRegistry.types').BvcDialectV1>} */
const DIALECTS = {
  en: enDialect,
  ru: ruDialect,
};

export const REGISTERED_DIALECT_IDS = Object.freeze(Object.keys(DIALECTS));

const BVC_FIELDS = ['basis', 'vector', 'goal', 'labels'];
const OPTIONAL_FIELDS = ['checks', 'evidence', 'analysis', 'decision', 'uiRefs'];
const ALL_SECTION_FIELDS = [...BVC_FIELDS, ...OPTIONAL_FIELDS];

/** @param {string} [lang] */
export function normalizeDialectId(lang) {
  const id = String(lang ?? '').trim().toLowerCase();
  if (id === '') {
    return 'ru';
  }
  if (!Object.hasOwn(DIALECTS, id)) {
    throw new Error(`Unknown BVC dialect: ${lang}`);
  }
  return id;
}

/** @param {string} [lang] */
export function getDialect(lang) {
  return DIALECTS[normalizeDialectId(lang)];
}

/** @param {string} [lang] */
export function getSectionTitle(lang, field) {
  const dialect = getDialect(lang);
  if (BVC_FIELDS.includes(field)) {
    return dialect.bvc[field];
  }
  if (OPTIONAL_FIELDS.includes(field)) {
    return dialect.optional?.[field] ?? DIALECTS.ru.optional[field];
  }
  throw new Error(`Unknown BVC section field: ${field}`);
}

/** @param {string} [lang] */
export function getFieldSectionsForDialect(lang) {
  return ALL_SECTION_FIELDS.map((field) => [field, getSectionTitle(lang, field)]);
}

export function buildSectionTitleToFieldMap() {
  /** @type {Map<string, string>} */
  const map = new Map();
  for (const dialectId of REGISTERED_DIALECT_IDS) {
    for (const [field, title] of getFieldSectionsForDialect(dialectId)) {
      map.set(title, field);
    }
  }
  map.set('критерии_готовности', 'checks');
  return map;
}

/**
 * @param {string} title
 * @returns {'en' | 'ru' | null}
 */
export function detectDialectFromBvcSectionTitle(title) {
  for (const dialectId of REGISTERED_DIALECT_IDS) {
    const dialect = DIALECTS[dialectId];
    if (Object.values(dialect.bvc).includes(title)) {
      return /** @type {'en' | 'ru'} */ (dialectId);
    }
  }
  return null;
}

const FILE_PRAGMA_PATTERN = /^#!bvc\s+lang=([a-z]{2})\s*$/u;

/** @param {string} text */
export function parseBvcFilePragma(text) {
  const firstLine = text.split(/\r?\n/u)[0]?.trim() ?? '';
  const match = firstLine.match(FILE_PRAGMA_PATTERN);
  if (!match) {
    return null;
  }
  return normalizeDialectId(match[1]);
}
