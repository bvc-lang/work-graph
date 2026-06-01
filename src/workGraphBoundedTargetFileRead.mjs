import { posix, resolve } from 'node:path';

export const BOUNDED_TARGET_FILE_READ_SCHEMA = 'workgraph.bounded-target-file-read.v1';

export const DEFAULT_MAX_BYTES_PER_FILE = 32_768;
export const DEFAULT_MAX_TOTAL_BYTES = 131_072;

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

export function normalizeBoundedTargetPath(rawPath, repoRoot = '') {
  const normalized = String(rawPath ?? '').trim().replace(/\\/gu, '/');
  if (normalized === '') {
    return { ok: false, error: 'empty path' };
  }

  if (normalized.startsWith('/') || /^[a-zA-Z]:/u.test(normalized)) {
    return { ok: false, error: 'absolute paths are not allowed' };
  }

  if (normalized.split('/').includes('..')) {
    return { ok: false, error: 'path traversal is not allowed' };
  }

  const cleaned = posix.normalize(normalized).replace(/^\.\//u, '');
  if (cleaned === '..' || cleaned.startsWith('../')) {
    return { ok: false, error: 'path traversal is not allowed' };
  }

  if (repoRoot) {
    const absolute = resolve(repoRoot, cleaned);
    const root = resolve(repoRoot);
    if (!absolute.startsWith(root)) {
      return { ok: false, error: 'path escapes repo root' };
    }
  }

  return { ok: true, path: cleaned };
}

export function isPathAllowedForTargetFiles(path, targetFiles) {
  const allowed = new Set(
    (targetFiles ?? []).map((entry) => normalizeBoundedTargetPath(entry).path).filter(Boolean),
  );
  const normalized = normalizeBoundedTargetPath(path);
  return normalized.ok && allowed.has(normalized.path);
}

export async function readBoundedTargetFile(path, options = {}) {
  const targetFiles = options.targetFiles ?? [];
  const repoRoot = options.repoRoot ?? options.cwd ?? process.cwd();
  const maxBytes = options.maxBytesPerFile ?? DEFAULT_MAX_BYTES_PER_FILE;
  const readFileImpl = options.readFile ?? (async (filePath) => {
    const { readFile } = await import('node:fs/promises');
    return readFile(filePath, 'utf8');
  });

  if (!isPathAllowedForTargetFiles(path, targetFiles)) {
    return {
      path: String(path),
      ok: false,
      error: 'path is not in task targetFiles allowlist',
      content: '',
      truncated: false,
      byteLength: 0,
    };
  }

  const normalized = normalizeBoundedTargetPath(path, repoRoot);
  if (!normalized.ok) {
    return {
      path: String(path),
      ok: false,
      error: normalized.error,
      content: '',
      truncated: false,
      byteLength: 0,
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
      path: normalized.path,
      ok: true,
      error: '',
      content: slice,
      truncated,
      byteLength,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      path: normalized.path,
      ok: false,
      error: message,
      content: '',
      truncated: false,
      byteLength: 0,
    };
  }
}

export async function readBoundedTargetFiles(input, options = {}) {
  const targetFiles = [...(options.targetFiles ?? input?.targetFiles ?? [])]
    .map(String)
    .filter(Boolean)
    .sort(compareText);

  const maxBytesPerFile = options.maxBytesPerFile ?? DEFAULT_MAX_BYTES_PER_FILE;
  const maxTotalBytes = options.maxTotalBytes ?? DEFAULT_MAX_TOTAL_BYTES;
  const repoRoot = options.repoRoot ?? options.cwd ?? process.cwd();

  const files = [];
  let totalBytes = 0;

  for (const path of targetFiles) {
    if (totalBytes >= maxTotalBytes) {
      files.push({
        path,
        ok: false,
        error: 'total byte budget exceeded',
        content: '',
        truncated: false,
        byteLength: 0,
      });
      continue;
    }

    const remaining = maxTotalBytes - totalBytes;
    const entry = await readBoundedTargetFile(path, {
      targetFiles,
      repoRoot,
      maxBytesPerFile: Math.min(maxBytesPerFile, remaining),
      readFile: options.readFile,
    });

    files.push(entry);
    if (entry.ok) {
      totalBytes += Buffer.byteLength(entry.content, 'utf8');
    }
  }

  return {
    schema: BOUNDED_TARGET_FILE_READ_SCHEMA,
    taskId: input?.task?.id ?? '',
    allowedPaths: targetFiles,
    files,
    summary: {
      requested: targetFiles.length,
      readOk: files.filter((entry) => entry.ok).length,
      failed: files.filter((entry) => !entry.ok).length,
      truncated: files.filter((entry) => entry.truncated).length,
      totalBytes,
    },
  };
}

export function formatBoundedTargetFilesForPrompt(readResult) {
  if (!readResult?.files?.length) {
    return 'No target file contents available.';
  }

  return readResult.files.map((entry) => {
    if (!entry.ok) {
      return `# ${entry.path}\n(error: ${entry.error})`;
    }

    const suffix = entry.truncated ? '\n...(truncated)' : '';
    return `# ${entry.path}\n${entry.content}${suffix}`;
  }).join('\n\n');
}
