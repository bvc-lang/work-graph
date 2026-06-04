import { resolve } from 'node:path';

import { normalizeCodeLanguage } from './codeSyntaxHighlight.mjs';
import { normalizeBoundedTargetPath } from './workGraphBoundedTargetFileRead.mjs';

export const REPO_FILE_PREVIEW_SCHEMA = 'workgraph.repo-file-preview.v1';
export const REPO_FILE_PREVIEW_MAX_BYTES = 131_072;

const REPO_FILE_EXTENSION_RE = /\.(?:bvc|mjs|js|cjs|ts|tsx|md|yaml|yml|json|step)$/iu;

export function basenameFromRepoPath(repoPath) {
  const normalized = String(repoPath ?? '').replace(/\\/gu, '/');
  const parts = normalized.split('/');
  return parts[parts.length - 1] || normalized;
}

export function detectRepoFileLanguage(repoPath) {
  const base = basenameFromRepoPath(repoPath);
  const dot = base.lastIndexOf('.');
  const ext = dot >= 0 ? base.slice(dot).toLowerCase() : '';

  switch (ext) {
    case '.mjs':
    case '.js':
    case '.cjs':
      return normalizeCodeLanguage('javascript');
    case '.ts':
    case '.tsx':
      return normalizeCodeLanguage('typescript');
    case '.yaml':
    case '.yml':
      return normalizeCodeLanguage('yaml');
    case '.bvc':
    case '.step':
      return 'bvc';
    case '.md':
      return 'markdown';
    case '.json':
      return normalizeCodeLanguage('json');
    default:
      return 'plaintext';
  }
}

export function isRepoFilePreviewPath(value) {
  const text = String(value ?? '').trim();
  if (text === '' || text.includes(' ') || /^https?:\/\//iu.test(text)) {
    return false;
  }
  if (text.startsWith('/') || /^[a-zA-Z]:/u.test(text)) {
    return false;
  }
  if (text.split('/').includes('..')) {
    return false;
  }
  return REPO_FILE_EXTENSION_RE.test(text);
}

/**
 * Resolve analytics-style relative paths (e.g. `other.md`) against a base file path.
 * @param {string | null | undefined} rawPath
 * @param {string | null | undefined} basePath
 */
export function resolveRepoFilePath(rawPath, basePath) {
  const path = String(rawPath ?? '').trim().replace(/\\/gu, '/');
  const base = String(basePath ?? '').trim().replace(/\\/gu, '/');

  if (path === '' || path.split('/').includes('..')) {
    return path;
  }

  if (path.includes('/') || base === '') {
    return path;
  }

  const slash = base.lastIndexOf('/');
  const dir = slash >= 0 ? base.slice(0, slash) : '';
  return dir ? `${dir}/${path}` : path;
}

export async function buildRepoFilePreview(rawPath, options = {}) {
  const repoRoot = options.repoRoot ?? options.cwd ?? process.cwd();
  const maxBytes = options.maxBytes ?? REPO_FILE_PREVIEW_MAX_BYTES;
  const resolvedPath = resolveRepoFilePath(rawPath, options.basePath);
  const readFileImpl = options.readFile ?? (async (filePath) => {
    const { readFile } = await import('node:fs/promises');
    return readFile(filePath, 'utf8');
  });

  const normalized = normalizeBoundedTargetPath(resolvedPath, repoRoot);
  if (!normalized.ok) {
    return {
      schema: REPO_FILE_PREVIEW_SCHEMA,
      ok: false,
      path: String(rawPath ?? ''),
      language: 'plaintext',
      content: '',
      truncated: false,
      byteLength: 0,
      error: normalized.error,
    };
  }

  const absolutePath = resolve(repoRoot, normalized.path);

  try {
    const content = await readFileImpl(absolutePath);
    const text = String(content);
    const byteLength = Buffer.byteLength(text, 'utf8');
    const truncated = byteLength > maxBytes;
    const slice = truncated ? Buffer.from(text, 'utf8').subarray(0, maxBytes).toString('utf8') : text;

    return {
      schema: REPO_FILE_PREVIEW_SCHEMA,
      ok: true,
      path: normalized.path,
      language: detectRepoFileLanguage(normalized.path),
      content: slice,
      truncated,
      byteLength,
      error: '',
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const isNotFound = message.includes('ENOENT');
    return {
      schema: REPO_FILE_PREVIEW_SCHEMA,
      ok: false,
      path: normalized.path,
      language: detectRepoFileLanguage(normalized.path),
      content: '',
      truncated: false,
      byteLength: 0,
      error: isNotFound ? 'file not found in workspace' : message,
    };
  }
}

export async function readRepoFilePreviewFromRequest(url, options = {}) {
  const path = url.searchParams.get('path') ?? '';
  const basePath = url.searchParams.get('base') ?? '';
  if (String(path).trim() === '') {
    return {
      status: 400,
      body: {
        schema: REPO_FILE_PREVIEW_SCHEMA,
        ok: false,
        error: 'missing_path',
        message: 'path query param is required',
      },
    };
  }

  const preview = await buildRepoFilePreview(path, { ...options, basePath });
  if (!preview.ok) {
    const status = preview.error === 'file not found in workspace'
      ? 404
      : (/traversal|absolute|allowed/iu.test(preview.error) ? 400 : 500);
    return { status, body: preview };
  }

  return { status: 200, body: preview };
}
