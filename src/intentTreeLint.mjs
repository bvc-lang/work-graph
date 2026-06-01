import { access, readdir } from 'node:fs/promises';
import { join, posix } from 'node:path';

import { parseIntentIndexEntries } from './intentTreeWorkItems.mjs';
import { isWorkItemArtifactPath, workItemPathMatchesId } from './bvcNewWritePolicy.mjs';

export const INTENT_TREE_LINT_SCHEMA = 'workgraph.intent-tree.lint.v1';

async function fileExists(absolutePath) {
  try {
    await access(absolutePath);
    return true;
  } catch {
    return false;
  }
}

async function listIntentWorkStepFiles(rootDir, cwd) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(rootDir, entry.name);
      if (entry.isDirectory()) {
        return listIntentWorkStepFiles(entryPath, cwd);
      }

      return entry.isFile() && isWorkItemArtifactPath(entry.name) ? [entryPath] : [];
    }),
  );

  return nested.flat();
}

function toRepoRelativePath(cwd, absolutePath) {
  return absolutePath
    .slice(cwd.length + 1)
    .split(/\\/u)
    .join('/');
}

/**
 * @param {{ cwd?: string, intentRoot?: string, indexPath?: string, indexText?: string }} [options]
 */
export async function lintIntentTreeOrphans(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const intentRoot = join(cwd, options.intentRoot ?? 'intent');
  const indexPath = options.indexPath ?? 'intent/index.bvc';
  const { readFile } = await import('node:fs/promises');
  const indexText = options.indexText ?? await readFile(join(cwd, indexPath), 'utf8');
  const indexEntries = parseIntentIndexEntries(indexText);
  const indexById = new Map(indexEntries.map((entry) => [entry.id, entry.path]));
  const indexPaths = new Set(indexEntries.map((entry) => entry.path.replace(/\\/g, '/')));

  const diskFiles = await listIntentWorkStepFiles(intentRoot, cwd);
  const diskPaths = diskFiles.map((filePath) => toRepoRelativePath(cwd, filePath));

  const orphanFiles = diskPaths
    .filter((relativePath) => !indexPaths.has(relativePath))
    .sort()
    .map((path) => ({ path, kind: 'orphan_file' }));

  const missingFiles = [];
  const workIdMismatches = [];

  for (const entry of indexEntries) {
    const normalizedPath = entry.path.replace(/\\/g, '/');
    const absolutePath = join(cwd, normalizedPath);
    const exists = await fileExists(absolutePath);

    if (!exists) {
      missingFiles.push({
        workId: entry.id,
        path: normalizedPath,
        kind: 'missing_file',
      });
      continue;
    }

    if (!workItemPathMatchesId(entry.id, normalizedPath)) {
      workIdMismatches.push({
        workId: entry.id,
        path: normalizedPath,
        kind: 'path_work_id_mismatch',
        expectedSuffix: `${entry.id}.work.bvc (or legacy .work.bvc)`,
      });
    }
  }

  const indexedIds = new Set(indexEntries.map((entry) => entry.id));
  const duplicateIds = indexEntries
    .map((entry) => entry.id)
    .filter((id, index, array) => array.indexOf(id) !== index);

  const errors = [
    ...orphanFiles.map((row) => `orphan work item file without index entry: ${row.path}`),
    ...missingFiles.map((row) => `index entry without file: ${row.workId} -> ${row.path}`),
    ...workIdMismatches.map((row) => `index path mismatch for ${row.workId}: ${row.path}`),
    ...duplicateIds.map((id) => `duplicate index work.id: ${id}`),
  ];

  return {
    schema: INTENT_TREE_LINT_SCHEMA,
    ok: errors.length === 0,
    indexPath,
    indexedCount: indexEntries.length,
    diskFileCount: diskPaths.length,
    orphanFiles,
    missingFiles,
    workIdMismatches,
    duplicateIndexIds: [...new Set(duplicateIds)].sort(),
    errors,
    indexById: Object.fromEntries(indexById),
  };
}
