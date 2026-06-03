import {
  buildSectionTitleToFieldMap,
  detectDialectFromBvcSectionTitle,
  getFieldSectionsForDialect,
  normalizeDialectId,
  parseBvcFilePragma,
  REGISTERED_DIALECT_IDS,
} from './bvcDialectRegistry.mjs';
import {
  buildBvcAtomAst,
  lintBvcAtomDialect,
  resolveAtomLang,
  scanBvcSectionDialects,
  stripBvcFilePragmaLine,
} from './bvcAtomParser.mjs';
import { validateStructuredEvidenceDraftArray } from './structuredEvidenceV1.mjs';

const ALLOWED_PROFILES = new Set([
  'charter',
  'charter_section',
  'work_item',
  'plan',
  'prompt_rule',
  'compiler',
  'trace',
]);

const ATOM_NAME_PATTERN = /^[A-Za-zА-Яа-яЁё0-9_]+$/u;
const LABEL_KEY_PATTERN = /^[A-Za-zА-Яа-яЁё0-9_.-]+$/u;

const SECTION_BY_TITLE = buildSectionTitleToFieldMap();

const STEP_ATOM_PATTERN = /^#([^@\n<]+?)(?:@([a-z]{2}))?<\[\n([\s\S]*?)\n\]>/gmu;

const LEGACY_MACHINE_FIELDS = new Map([
  ['guid', 'guid'],
  ['id', 'atom.id'],
  ['mode', 'atom.mode'],
  ['статус', 'work.status'],
  ['status', 'work.status'],
  ['trace_status', 'trace.status'],
]);

export class StepAtomDraftValidationError extends Error {
  constructor(errors) {
    super(`Invalid StepAtomDraft: ${errors.join('; ')}`);
    this.name = 'StepAtomDraftValidationError';
    this.errors = errors;
  }
}

export function validateStepAtomDraft(draft) {
  const errors = [];

  if (!isPlainObject(draft)) {
    return ['draft must be an object'];
  }

  validateProfile(draft.profile, errors);
  validateName(draft.name, errors);
  validateTextArray(draft.basis, 'basis', errors, { required: true });
  validateTextArray(draft.vector, 'vector', errors, { required: true });
  validateTextArray(draft.goal, 'goal', errors, { required: true });
  validateTextArray(draft.checks, 'checks', errors, { required: false });
  validateTextArray(draft.evidence, 'evidence', errors, { required: false });
  errors.push(...validateStructuredEvidenceDraftArray(draft.structuredEvidence));
  validateLabels(draft.labels, errors);
  validateLang(draft.lang, errors);

  return errors;
}

function resolveDraftLang(draft) {
  const fromField = typeof draft.lang === 'string' ? draft.lang.trim() : '';
  if (fromField !== '') {
    return normalizeDialectId(fromField);
  }
  const fromLabels = typeof draft.labels?.lang === 'string' ? draft.labels.lang.trim() : '';
  if (fromLabels !== '') {
    return normalizeDialectId(fromLabels);
  }
  return 'ru';
}

function validateLang(lang, errors) {
  if (lang === undefined) {
    return;
  }
  if (typeof lang !== 'string' || lang.trim() === '') {
    errors.push('lang must be a non-empty string when provided');
    return;
  }
  const id = lang.trim().toLowerCase();
  if (!REGISTERED_DIALECT_IDS.includes(id)) {
    errors.push(`lang must be one of: ${REGISTERED_DIALECT_IDS.join(', ')}`);
  }
}

export function formatStepAtomDraft(draft) {
  const errors = validateStepAtomDraft(draft);
  if (errors.length > 0) {
    throw new StepAtomDraftValidationError(errors);
  }

  const lang = resolveDraftLang(draft);
  const headerSuffix = lang === 'en' ? '@en' : '';
  const fieldSections = getFieldSectionsForDialect(lang);
  const lines = [`#${draft.name.trim()}${headerSuffix}<[`];

  for (const [field, title] of fieldSections) {
    if (field === 'labels') {
      continue;
    }
    if (field === 'checks' || field === 'evidence' || field === 'analysis' || field === 'decision' || field === 'uiRefs') {
      if (draft[field] === undefined || (Array.isArray(draft[field]) && draft[field].length === 0)) {
        continue;
      }
    }

    lines.push(`${title}:`);
    for (const item of draft[field]) {
      lines.push(`  ${item.trim()}`);
    }
  }

  lines.push('');
  lines.push(`${getFieldSectionsForDialect(lang).find(([field]) => field === 'labels')[1]}:`);

  const labels = {
    ...(draft.labels ?? {}),
  };

  if (!Object.prototype.hasOwnProperty.call(labels, 'atom.profile')) {
    labels['atom.profile'] = draft.profile;
  }

  for (const key of Object.keys(labels).sort(compareLabelKeys)) {
    lines.push(`  ${key}: ${labels[key].trim()}`);
  }

  lines.push(']>');
  return `${lines.join('\n')}\n`;
}

export function parseStepAtomDrafts(text, options = {}) {
  if (typeof text !== 'string') {
    throw new TypeError('text must be a string');
  }

  const filePragmaLang = options.filePragmaLang ?? parseBvcFilePragma(text);
  const searchText = options.stripFilePragma === false ? text : stripBvcFilePragmaLine(text);

  return [...searchText.matchAll(STEP_ATOM_PATTERN)].map((match) =>
    parseStepAtomMatch(match, { filePragmaLang }),
  );
}

export function parseBvcAtoms(text, options = {}) {
  const parsed = parseStepAtomDrafts(text, options);
  return parsed.map((entry) => entry.ast).filter(Boolean);
}

function isInlineSectionHeading(line) {
  return /^[A-Za-zА-Яа-яЁё0-9][^:\n]{0,80}:$/u.test(line)
    || /^[A-Za-zА-Яа-яЁё0-9][^:\n]{0,40}\s\/\s[^:\n]{0,40}:$/u.test(line);
}

function parseStepAtomMatch(match, context = {}) {
  const [, rawHeader, headerLangToken, body] = match;
  const atomName = rawHeader.trim();
  const headerLang = headerLangToken ? normalizeDialectId(headerLangToken) : null;
  const draft = {
    profile: '',
    name: atomName.trim(),
    basis: [],
    vector: [],
    goal: [],
    labels: {},
    lang: undefined,
  };
  const warnings = [];
  let section = '';
  const { firstBvcDialect } = scanBvcSectionDialects(body);
  let labelsLangDeclared = null;

  for (const rawLine of body.split(/\r?\n/u)) {
    const line = rawLine.trim();
    if (line === '') {
      continue;
    }

    const title = line.endsWith(':') ? line.slice(0, -1) : '';
    if (SECTION_BY_TITLE.has(title)) {
      const nextField = SECTION_BY_TITLE.get(title);
      const labelsTitleRu = getFieldSectionsForDialect('ru').find(([f]) => f === 'labels')[1];
      const labelsTitleEn = getFieldSectionsForDialect('en').find(([f]) => f === 'labels')[1];
      const isLabelsTitle = title === labelsTitleRu || title === labelsTitleEn;

      if (section === 'analysis' && nextField === 'decision') {
        section = 'decision';
        continue;
      }

      if ((section === 'analysis' || section === 'decision') && !isLabelsTitle) {
        if (draft[section] === undefined) {
          draft[section] = [];
        }
        draft[section].push(stripListMarker(line));
        continue;
      }
      section = nextField;
      continue;
    }

    if (line === 'критерии_готовности:') {
      section = 'checks';
      warnings.push('legacy section критерии_готовности imported as checks');
      continue;
    }

    const labelsTitleRu = getFieldSectionsForDialect('ru').find(([f]) => f === 'labels')[1];
    const labelsTitleEn = getFieldSectionsForDialect('en').find(([f]) => f === 'labels')[1];
    if (line === `${labelsTitleRu}:` || line === `${labelsTitleEn}:`) {
      section = 'labels';
      continue;
    }

    if (section === 'basis' || section === 'vector' || section === 'goal') {
      if (isInlineSectionHeading(line)) {
        section = '';
        continue;
      }
      draft[section].push(stripListMarker(line));
      continue;
    }

    if (section === 'checks' || section === 'evidence' || section === 'analysis' || section === 'decision' || section === 'uiRefs') {
      if (draft[section] === undefined) {
        draft[section] = [];
      }
      draft[section].push(stripListMarker(line));
      continue;
    }

    if (section === 'labels') {
      const separatorIndex = line.indexOf(':');
      if (separatorIndex === -1) {
        warnings.push(`ignored label line without separator: ${line}`);
        continue;
      }

      const key = line.slice(0, separatorIndex).trim();
      const value = line.slice(separatorIndex + 1).trim();
      if (key === 'lang') {
        labelsLangDeclared = value;
      }
      draft.labels[key] = value;
      continue;
    }

    const legacyField = parseLegacyMachineField(line);
    if (section === '' && legacyField !== null) {
      const { labelKey, value, sourceKey } = legacyField;
      if (!Object.prototype.hasOwnProperty.call(draft.labels, labelKey)) {
        draft.labels[labelKey] = value;
      }
      warnings.push(`legacy top-level field ${sourceKey} imported as labels.${labelKey}`);
    }
  }

  draft.profile = draft.labels['atom.profile'] ?? '';

  const labelsLang = labelsLangDeclared ?? draft.labels.lang ?? null;
  if (draft.labels.lang) {
    delete draft.labels.lang;
  }

  const resolved = resolveAtomLang({
    headerLang,
    labelsLang,
    filePragmaLang: context.filePragmaLang ?? null,
    autoDetectLang: firstBvcDialect,
  });

  draft.lang = resolved.lang;
  for (const code of resolved.warnings) {
    warnings.push(code);
  }

  const dialectLints = lintBvcAtomDialect(body, resolved.lang);
  const ast = buildBvcAtomAst(draft, resolved.lang, dialectLints);

  return {
    draft,
    ast,
    langSource: resolved.source,
    warnings,
    lints: dialectLints,
    errors: validateStepAtomDraft(draft),
  };
}

function parseLegacyMachineField(line) {
  const separatorIndex = line.indexOf(':');
  if (separatorIndex === -1) {
    return null;
  }

  const sourceKey = line.slice(0, separatorIndex).trim();
  const value = line.slice(separatorIndex + 1).trim();
  const labelKey = LEGACY_MACHINE_FIELDS.get(sourceKey);

  if (labelKey === undefined || value === '') {
    return null;
  }

  return { labelKey, value, sourceKey };
}

function validateProfile(profile, errors) {
  if (typeof profile !== 'string' || profile.trim() === '') {
    errors.push('profile is required and must be a non-empty string');
    return;
  }

  if (profile !== profile.trim()) {
    errors.push('profile must not have leading or trailing whitespace');
    return;
  }

  if (!ALLOWED_PROFILES.has(profile)) {
    errors.push(`profile must be one of: ${Array.from(ALLOWED_PROFILES).join(', ')}`);
  }
}

function validateName(name, errors) {
  if (typeof name !== 'string' || name.trim() === '') {
    errors.push('name is required and must be a non-empty string');
    return;
  }

  const trimmed = name.trim();
  if (!ATOM_NAME_PATTERN.test(trimmed)) {
    errors.push('name may contain only letters, digits, and underscore');
  }
}

function validateTextArray(value, fieldName, errors, options) {
  if (value === undefined && !options.required) {
    return;
  }

  if (!Array.isArray(value)) {
    errors.push(`${fieldName} is required and must be a non-empty array of strings`);
    return;
  }

  if (value.length === 0) {
    errors.push(`${fieldName} must contain at least one string`);
    return;
  }

  value.forEach((item, index) => {
    if (typeof item !== 'string' || item.trim() === '') {
      errors.push(`${fieldName}[${index}] must be a non-empty string`);
      return;
    }

    if (hasLineBreak(item)) {
      errors.push(`${fieldName}[${index}] must be a single-line string`);
    }
  });
}

function validateLabels(labels, errors) {
  if (labels === undefined) {
    return;
  }

  if (!isPlainObject(labels)) {
    errors.push('labels must be an object with string values');
    return;
  }

  for (const [key, value] of Object.entries(labels)) {
    if (!LABEL_KEY_PATTERN.test(key)) {
      errors.push(`labels.${key} has an invalid key; use letters, digits, underscore, dot, or dash`);
    }

    if (typeof value !== 'string' || value.trim() === '') {
      errors.push(`labels.${key} must be a non-empty string`);
      continue;
    }

    if (hasLineBreak(value)) {
      errors.push(`labels.${key} must be a single-line string`);
    }
  }
}

function compareLabelKeys(left, right) {
  return left.localeCompare(right, 'en', { sensitivity: 'variant' });
}

function hasLineBreak(value) {
  return value.includes('\n') || value.includes('\r');
}

function stripListMarker(line) {
  return line.replace(/^-\s*/u, '').trim();
}

function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
