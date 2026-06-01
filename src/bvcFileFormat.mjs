import { parseBvcDocument } from './bvcAtomParser.mjs';
import { formatStepAtomDraft, parseStepAtomDrafts } from './stepAtomFormatter.mjs';
import { extensionFromPath } from './languageAdapters/shared.mjs';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

export const BVC_EXTENSION_CANON = '.bvc';
export const BVC_EXTENSION_LEGACY = '.step';
export const BVC_READ_EXTENSIONS = Object.freeze([BVC_EXTENSION_CANON, BVC_EXTENSION_LEGACY]);
export const BVC_LINT_W_LEGACY_EXTENSION = 'W_BVC_LEGACY_STEP_EXTENSION';
export const BVC_LEGACY_STEP_READ_WARNING = 'W_BVC_LEGACY_STEP_READ';

/** @type {Set<string>} */
const legacyStepReadWarnings = new Set();

/** Reset once-per-path legacy read warnings (tests only). */
export function resetLegacyStepReadWarningsForTests() {
  legacyStepReadWarnings.clear();
}

/**
 * @param {string} resolvedPath
 * @param {{ onLegacyStepRead?: (detail: { resolvedPath: string, message: string }) => void }} [options]
 */
export function warnLegacyStepRead(resolvedPath, options = {}) {
  if (!isLegacyStepPath(resolvedPath)) {
    return;
  }

  const key = resolve(resolvedPath);
  if (legacyStepReadWarnings.has(key)) {
    return;
  }
  legacyStepReadWarnings.add(key);

  const message = `Legacy ${BVC_EXTENSION_LEGACY} read: ${key}; prefer ${BVC_EXTENSION_CANON} for new writes (deprecation until v2).`;
  if (typeof options.onLegacyStepRead === 'function') {
    options.onLegacyStepRead({ resolvedPath: key, message });
    return;
  }
  console.warn(`[bvc] ${message}`);
}

/** @param {string} filePath */
export function bvcExtensionFromPath(filePath) {
  return extensionFromPath(filePath);
}

/** @param {string} filePath */
export function isBvcReadablePath(filePath) {
  return BVC_READ_EXTENSIONS.includes(bvcExtensionFromPath(filePath));
}

/** @param {string} filePath */
export function isLegacyStepPath(filePath) {
  return bvcExtensionFromPath(filePath) === BVC_EXTENSION_LEGACY;
}

/**
 * @param {string} filePath
 * @param {{ preferCanon?: boolean }} [options]
 */
export function swapBvcExtension(filePath, options = {}) {
  const preferCanon = options.preferCanon !== false;
  const ext = bvcExtensionFromPath(filePath);
  if (preferCanon && ext === BVC_EXTENSION_LEGACY) {
    return `${filePath.slice(0, -BVC_EXTENSION_LEGACY.length)}${BVC_EXTENSION_CANON}`;
  }
  if (!preferCanon && ext === BVC_EXTENSION_CANON) {
    return `${filePath.slice(0, -BVC_EXTENSION_CANON.length)}${BVC_EXTENSION_LEGACY}`;
  }
  return filePath;
}

/**
 * Resolve on-disk path for dual-read: try canonical `.bvc` when legacy `.step` is missing (and vice versa).
 * @param {string} filePath
 * @param {string} [cwd]
 */
export function resolveBvcReadablePath(filePath, cwd = process.cwd()) {
  const absolute = resolve(cwd, filePath);
  if (existsSync(absolute)) {
    return absolute;
  }

  if (!isBvcReadablePath(absolute)) {
    return absolute;
  }

  const preferCanon = isLegacyStepPath(absolute);
  const canonCandidate = swapBvcExtension(absolute, { preferCanon });
  if (canonCandidate !== absolute && existsSync(canonCandidate)) {
    return canonCandidate;
  }

  const legacyCandidate = swapBvcExtension(absolute, { preferCanon: false });
  if (legacyCandidate !== absolute && existsSync(legacyCandidate)) {
    return legacyCandidate;
  }

  return absolute;
}

/**
 * @param {string} filePath
 * @param {{ cwd?: string, onLegacyStepRead?: (detail: { resolvedPath: string, message: string }) => void }} [options]
 */
export async function readBvcTextFile(filePath, options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const resolved = resolveBvcReadablePath(filePath, cwd);
  warnLegacyStepRead(resolved, options);
  return readFile(resolved, 'utf8');
}

/** @param {string} filePath */
export function lintBvcFilePath(filePath) {
  /** @type {Array<{ code: string, message: string }>} */
  const lints = [];
  if (isLegacyStepPath(filePath)) {
    lints.push({
      code: BVC_LINT_W_LEGACY_EXTENSION,
      message: `Legacy extension ${BVC_EXTENSION_LEGACY}; prefer ${BVC_EXTENSION_CANON} for new writes (ADR adr-bvc-format-naming.md).`,
    });
  }
  return lints;
}

/**
 * @param {string} content
 * @param {{ filePath?: string, stripFilePragma?: boolean }} [options]
 */
export function parseBvcFileContent(content, options = {}) {
  const document = parseBvcDocument(content);
  const atoms = parseStepAtomDrafts(content, {
    filePragmaLang: document.fileLang,
    stripFilePragma: options.stripFilePragma !== false,
  });

  const pathLints = options.filePath ? lintBvcFilePath(options.filePath) : [];

  return {
    schema: 'bvc-file.parse.v1',
    filePath: options.filePath ?? null,
    extension: options.filePath ? bvcExtensionFromPath(options.filePath) : null,
    document,
    atoms,
    pathLints,
    lints: [
      ...pathLints,
      ...atoms.flatMap((entry) => entry.lints ?? []),
    ],
  };
}

/**
 * @param {ReturnType<typeof parseBvcFileContent>} left
 * @param {ReturnType<typeof parseBvcFileContent>} right
 */
export function bvcParseResultsEquivalent(left, right) {
  if (left.atoms.length !== right.atoms.length) {
    return false;
  }
  for (let index = 0; index < left.atoms.length; index += 1) {
    const a = left.atoms[index]?.ast;
    const b = right.atoms[index]?.ast;
    if (!a || !b) {
      return false;
    }
    if (JSON.stringify(a.bvc) !== JSON.stringify(b.bvc)) {
      return false;
    }
    if (JSON.stringify(a.labels) !== JSON.stringify(b.labels)) {
      return false;
    }
    if (a.profile !== b.profile) {
      return false;
    }
  }
  return true;
}

/**
 * Canonical formatter: preserve resolved atom.lang and optional file pragma.
 * @param {string} content
 * @param {{ filePath?: string, stripFilePragma?: boolean }} [options]
 */
export function formatBvcFileContent(content, options = {}) {
  const parsed = parseBvcFileContent(content, options);
  const blocks = [];

  if (parsed.document.fileLang) {
    blocks.push(`#!bvc lang=${parsed.document.fileLang}`);
  }

  for (const atom of parsed.atoms) {
    if (atom.errors?.length > 0) {
      const error = new Error(
        `Cannot format atom ${atom.draft.name}: ${atom.errors.join('; ')}`,
      );
      error.code = 'E_BVC_FORMAT_INVALID_ATOM';
      throw error;
    }

    const draft = {
      ...atom.draft,
      profile: atom.draft.profile || atom.draft.labels?.['atom.profile'] || '',
      lang: atom.draft.lang,
    };
    blocks.push(formatStepAtomDraft(draft).trimEnd());
  }

  if (blocks.length === 0) {
    return parsed.document.fileLang ? `#!bvc lang=${parsed.document.fileLang}\n` : '';
  }

  return `${blocks.join('\n\n')}\n`;
}
