import enDialect from '@bvc-lang/spec/dialects/en.json' with { type: 'json' };
import ruDialect from '@bvc-lang/spec/dialects/ru.json' with { type: 'json' };

/** @type {Record<string, { bvc: Record<string, string>, optional?: Record<string, string> }>} */
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
  throw new Error(`Unknown section field: ${field}`);
}

/** @param {string} [lang] */
export function getFieldSectionsForDialect(lang) {
  const dialect = getDialect(lang);
  const optional = dialect.optional ?? DIALECTS.ru.optional;
  return [
    ['basis', dialect.bvc.basis],
    ['vector', dialect.bvc.vector],
    ['goal', dialect.bvc.goal],
    ['checks', optional.checks],
    ['evidence', optional.evidence],
    ['analysis', optional.analysis],
    ['decision', optional.decision],
    ['uiRefs', optional.uiRefs],
    ['labels', dialect.bvc.labels],
  ];
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

/** @param {string} title */
export function detectDialectFromBvcSectionTitle(title) {
  for (const dialectId of REGISTERED_DIALECT_IDS) {
    const sections = getFieldSectionsForDialect(dialectId);
    for (const [, sectionTitle] of sections) {
      if (sectionTitle === title) {
        return dialectId;
      }
    }
  }
  return null;
}

/** @param {string} text */
export function parseBvcFilePragma(text) {
  const firstLine = String(text ?? '').split(/\r?\n/u)[0]?.trim() ?? '';
  const match = /^#!bvc\s+lang=([a-z]{2})\b/iu.exec(firstLine);
  if (!match) {
    return null;
  }
  return normalizeDialectId(match[1]);
}
