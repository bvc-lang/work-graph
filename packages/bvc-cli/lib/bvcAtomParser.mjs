import {
  detectDialectFromBvcSectionTitle,
  getDialect,
  normalizeDialectId,
  parseBvcFilePragma,
  REGISTERED_DIALECT_IDS,
} from './bvcDialectRegistry.mjs';

export const BVC_LINT_E_DIALECT_MIX = 'E_BVC_DIALECT_MIX';
export const BVC_LINT_E_DIALECT_LANG_MISMATCH = 'E_BVC_DIALECT_LANG_MISMATCH';
export const BVC_LINT_W_LANG_FALLBACK_EN = 'W_BVC_LANG_FALLBACK_EN';

export const BVC_ATOM_AST_SCHEMA = 'bvc-atom.ast.v1';
export const BVC_DOCUMENT_AST_SCHEMA = 'bvc-document.ast.v1';

/** @param {string} text */
export function stripBvcFilePragmaLine(text) {
  const lines = text.split(/\r?\n/u);
  if (lines.length === 0) {
    return text;
  }
  if (parseBvcFilePragma(text) !== null) {
    return lines.slice(1).join('\n');
  }
  return text;
}

/**
 * @param {string} rawHeader
 * @returns {{ name: string, headerLang: string | null }}
 */
export function parseBvcAtomHeader(rawHeader) {
  const trimmed = String(rawHeader ?? '').trim();
  const atIndex = trimmed.lastIndexOf('@');
  if (atIndex === -1) {
    return { name: trimmed, headerLang: null };
  }
  const name = trimmed.slice(0, atIndex).trim();
  const langToken = trimmed.slice(atIndex + 1).trim().toLowerCase();
  if (!REGISTERED_DIALECT_IDS.includes(langToken)) {
    return { name: trimmed, headerLang: null };
  }
  return { name, headerLang: langToken };
}

/**
 * @param {string} body
 * @returns {{ dialects: Set<string>, firstBvcDialect: string | null }}
 */
export function scanBvcSectionDialects(body) {
  /** @type {Set<string>} */
  const dialects = new Set();
  let firstBvcDialect = null;

  for (const rawLine of body.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (!line.endsWith(':')) {
      continue;
    }
    const title = line.slice(0, -1);
    const detected = detectDialectFromBvcSectionTitle(title);
    if (detected === null) {
      continue;
    }
    dialects.add(detected);
    if (firstBvcDialect === null) {
      firstBvcDialect = detected;
    }
  }

  return { dialects, firstBvcDialect };
}

/**
 * @param {{
 *   headerLang?: string | null,
 *   labelsLang?: string | null,
 *   filePragmaLang?: string | null,
 *   autoDetectLang?: string | null,
 * }} sources
 */
export function resolveAtomLang(sources) {
  const warnings = [];
  const headerLang = sources.headerLang ? normalizeDialectId(sources.headerLang) : null;
  const labelsLang = sources.labelsLang ? normalizeDialectId(sources.labelsLang) : null;
  const filePragmaLang = sources.filePragmaLang ? normalizeDialectId(sources.filePragmaLang) : null;
  const autoDetectLang = sources.autoDetectLang ? normalizeDialectId(sources.autoDetectLang) : null;

  if (headerLang !== null) {
    return { lang: headerLang, source: 'atom_header', warnings };
  }
  if (labelsLang !== null) {
    return { lang: labelsLang, source: 'labels.lang', warnings };
  }
  if (filePragmaLang !== null) {
    return { lang: filePragmaLang, source: 'file_pragma', warnings };
  }
  if (autoDetectLang !== null) {
    return { lang: autoDetectLang, source: 'auto_detect', warnings };
  }

  warnings.push(BVC_LINT_W_LANG_FALLBACK_EN);
  return { lang: 'en', source: 'fallback_en', warnings };
}

/**
 * @param {string} body
 * @param {string} resolvedLang
 */
export function lintBvcAtomDialect(body, resolvedLang) {
  /** @type {Array<{ code: string, message: string }>} */
  const lints = [];
  const { dialects } = scanBvcSectionDialects(body);

  if (dialects.size > 1) {
    lints.push({
      code: BVC_LINT_E_DIALECT_MIX,
      message: `Mixed BVC dialect keys in one atom: ${Array.from(dialects).join(', ')}`,
    });
  }

  if (dialects.size === 1) {
    const [onlyDialect] = dialects;
    if (onlyDialect !== resolvedLang) {
      lints.push({
        code: BVC_LINT_E_DIALECT_LANG_MISMATCH,
        message: `Resolved lang=${resolvedLang} but BVC keys use dialect ${onlyDialect}`,
      });
    }
  }

  return lints;
}

/**
 * @param {import('./stepAtomFormatter.mjs').StepAtomDraftLike} draft
 * @param {string} lang
 * @param {Array<{ code: string, message: string }>} lints
 */
export function buildBvcAtomAst(draft, lang, lints = []) {
  return {
    schema: BVC_ATOM_AST_SCHEMA,
    name: draft.name,
    lang,
    bvc: {
      basis: [...(draft.basis ?? [])],
      vector: [...(draft.vector ?? [])],
      goal: [...(draft.goal ?? [])],
    },
    labels: { ...(draft.labels ?? {}) },
    optional: {
      checks: draft.checks ? [...draft.checks] : [],
      evidence: draft.evidence ? [...draft.evidence] : [],
      analysis: draft.analysis ? [...draft.analysis] : [],
      decision: draft.decision ? [...draft.decision] : [],
      uiRefs: draft.uiRefs ? [...draft.uiRefs] : [],
    },
    profile: draft.profile ?? draft.labels?.['atom.profile'] ?? '',
    lints,
  };
}

/**
 * @param {string} text
 */
export function parseBvcDocument(text) {
  if (typeof text !== 'string') {
    throw new TypeError('text must be a string');
  }

  const fileLang = parseBvcFilePragma(text);
  const bodyText = stripBvcFilePragmaLine(text);

  return {
    schema: BVC_DOCUMENT_AST_SCHEMA,
    fileLang,
    bodyText,
  };
}

/** @param {string} name @param {string} [lang] */
export function formatBvcAtomHeader(name, lang) {
  const trimmed = String(name ?? '').trim();
  if (lang === 'en') {
    return `#${trimmed}@en<[` ;
  }
  return `#${trimmed}<[` ;
}

/**
 * Compare normalized BVC content (EN-canonical arrays) for conformance.
 * @param {ReturnType<typeof buildBvcAtomAst>} left
 * @param {ReturnType<typeof buildBvcAtomAst>} right
 */
export function bvcAtomAstEquivalent(left, right) {
  return JSON.stringify({
    bvc: left.bvc,
    profile: left.profile,
    labels: left.labels,
  }) === JSON.stringify({
    bvc: right.bvc,
    profile: right.profile,
    labels: right.labels,
  });
}

/** @param {string} lang @param {string} field */
export function localizedBvcTitle(lang, field) {
  return getDialect(lang).bvc[field];
}
