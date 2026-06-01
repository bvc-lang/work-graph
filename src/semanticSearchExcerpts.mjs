import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { normalizeBoundedTargetPath } from './workGraphBoundedTargetFileRead.mjs';

const DEFAULT_EXCERPT_CHARS = 1200;

export async function readSemanticSearchFileExcerpt(filePath, options = {}) {
  const repoRoot = resolve(options.repoRoot ?? options.cwd ?? process.cwd());
  const normalized = normalizeBoundedTargetPath(filePath, repoRoot);
  if (!normalized.ok) {
    return { ok: false, path: filePath, excerpt: '', error: normalized.error };
  }

  const readFileImpl = options.readFile ?? readFile;
  const maxChars = options.maxExcerptChars ?? DEFAULT_EXCERPT_CHARS;

  try {
    const absolute = resolve(repoRoot, normalized.path);
    const content = await readFileImpl(absolute, 'utf8');
    const excerpt = content.slice(0, maxChars).trim();
    return {
      ok: true,
      path: normalized.path,
      excerpt,
      truncated: content.length > maxChars,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, path: normalized.path, excerpt: '', error: message };
  }
}

export async function enrichSemanticDocumentsWithExcerpts(documents, options = {}) {
  const repoRoot = resolve(options.repoRoot ?? options.cwd ?? process.cwd());
  const targetFilesByWorkId = options.targetFilesByWorkId ?? new Map();
  const enriched = [];

  for (const document of documents) {
    const excerptPaths = document.kind === 'file_artifact' && document.filePath
      ? [document.filePath]
      : document.kind === 'work_item'
        ? (targetFilesByWorkId.get(document.workId) ?? []).slice(0, options.maxFilesPerWorkItem ?? 2)
        : [];

    let excerpt = '';
    const excerptSources = [];

    for (const filePath of excerptPaths) {
      const loaded = await readSemanticSearchFileExcerpt(filePath, { ...options, repoRoot });
      if (loaded.ok && loaded.excerpt) {
        excerpt += `${loaded.excerpt}\n`;
        excerptSources.push(loaded.path);
      }
    }

    enriched.push({
      ...document,
      excerpt: excerpt.trim(),
      excerptSources,
      parts: excerpt
        ? [...(document.parts ?? []), { text: excerpt, weight: 3 }]
        : [...(document.parts ?? [])],
    });
  }

  return enriched;
}
