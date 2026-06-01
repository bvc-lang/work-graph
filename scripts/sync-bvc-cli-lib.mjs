#!/usr/bin/env node
/**
 * Copy parser/lint/format runtime into packages/bvc-cli/lib for npm publish.
 */
import { cpSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const srcDir = join(repoRoot, 'src');
const libDir = join(repoRoot, 'packages/bvc-cli/lib');

const COPY_FILES = [
  'bvcLintCli.mjs',
  'bvcFormatCli.mjs',
  'bvcFileFormat.mjs',
  'bvcAtomParser.mjs',
  'stepAtomFormatter.mjs',
];

function copyCoreModules() {
  mkdirSync(libDir, { recursive: true });
  for (const name of COPY_FILES) {
    cpSync(join(srcDir, name), join(libDir, name));
  }
  cpSync(join(srcDir, 'languageAdapters/shared.mjs'), join(libDir, 'shared.mjs'));
}

function writeDialectRegistry() {
  const body = `import enDialect from '@bvc-lang/spec/dialects/en.json' with { type: 'json' };
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
    throw new Error(\`Unknown BVC dialect: \${lang}\`);
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
  throw new Error(\`Unknown section field: \${field}\`);
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
  const firstLine = String(text ?? '').split(/\\r?\\n/u)[0]?.trim() ?? '';
  const match = /^#!bvc\\s+lang=([a-z]{2})\\b/iu.exec(firstLine);
  if (!match) {
    return null;
  }
  return normalizeDialectId(match[1]);
}
`;
  writeFileSync(join(libDir, 'bvcDialectRegistry.mjs'), body, 'utf8');
}

function patchImports() {
  const patches = [
    {
      file: 'bvcFileFormat.mjs',
      from: "from './languageAdapters/shared.mjs'",
      to: "from './shared.mjs'",
    },
    {
      file: 'stepAtomFormatter.mjs',
      from: "from './bvcDialectRegistry.mjs'",
      to: "from './bvcDialectRegistry.mjs'",
    },
  ];

  for (const { file, from, to } of patches) {
    const path = join(libDir, file);
    const text = readFileSync(path, 'utf8');
    if (text.includes(from)) {
      writeFileSync(path, text.replace(from, to), 'utf8');
    }
  }
}

function main() {
  copyCoreModules();
  writeDialectRegistry();
  patchImports();
  console.log(JSON.stringify({
    schema: 'workgraph.sync-bvc-cli-lib.v1',
    libDir,
    files: [...COPY_FILES, 'bvcDialectRegistry.mjs', 'shared.mjs'],
  }, null, 2));
}

main();
