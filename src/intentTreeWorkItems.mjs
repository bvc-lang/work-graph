import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { resolveIntentPathFromIndex } from './intentHierarchy.mjs';
import { buildIntentIndexStep } from './intentTreeMigration.mjs';
import { intentPathForNewWorkItem } from './bvcNewWritePolicy.mjs';
import { resolveCanonReadOptions } from './canonPaths.mjs';
import { readBvcTextFile, resolveBvcReadablePath } from './bvcFileFormat.mjs';
import { parseWorkItems } from './workGraphRuntime.mjs';
import {
  findWorkItemAtomSpan,
  patchWorkItemInBacklogText,
} from './workGraphBacklogPersist.mjs';

import { collectGitSnapshotTargetFiles, maybeRunGitSnapshotAfterPersist } from './gitSnapshot.mjs';

const DEFAULT_INTENT_INDEX_PATH = 'intent/index.bvc';

export async function readIntentWorkItemTexts(options = {}) {
  const resolved = resolveCanonReadOptions(options);
  const cwd = resolved.cwd ?? process.cwd();
  const indexPath = resolveBvcReadablePath(resolved.intentIndexPath ?? DEFAULT_INTENT_INDEX_PATH, cwd);
  const indexText = resolved.indexText ?? await readBvcTextFile(resolved.intentIndexPath ?? DEFAULT_INTENT_INDEX_PATH, { cwd });
  const entries = parseIntentIndexEntries(indexText);
  const texts = [];

  for (const entry of entries) {
    texts.push(await readBvcTextFile(entry.path, { cwd }));
  }

  return {
    indexPath,
    indexText,
    entries,
    texts,
  };
}

export async function readWorkItemsFromIntentTree(options = {}) {
  const { texts } = await readIntentWorkItemTexts(options);
  return parseWorkItems(texts.join('\n'));
}

export async function readWorkItemsFromRepo(options = {}) {
  if (options.backlogText !== undefined) {
    return parseWorkItems(options.backlogText);
  }

  if (options.backlogPath) {
    const backlogPath = resolveBvcReadablePath(options.backlogPath, options.cwd ?? process.cwd());
    const backlogText = await readBvcTextFile(options.backlogPath, { cwd: options.cwd });
    return parseWorkItems(backlogText);
  }

  return readWorkItemsFromIntentTree(resolveCanonReadOptions(options));
}

export async function readWorkItemAtomFromRepo(workId, options = {}) {
  const normalizedWorkId = String(workId ?? '').trim();
  if (normalizedWorkId === '') {
    throw new TypeError('workId is required');
  }

  if (options.backlogText !== undefined || options.backlogPath) {
    const cwd = options.cwd ?? process.cwd();
    const backlogPath = options.backlogPath
      ? resolveBvcReadablePath(options.backlogPath, cwd)
      : null;
    const text = options.backlogText ?? await readBvcTextFile(options.backlogPath, { cwd });
    const span = findWorkItemAtomSpan(text, normalizedWorkId);
    if (!span) {
      throw new Error(`work item atom not found: ${normalizedWorkId}`);
    }
    return {
      mode: 'backlog',
      path: backlogPath,
      text,
      atomText: span.fullMatch,
      span,
    };
  }

  const resolved = resolveCanonReadOptions(options);
  const cwd = resolved.cwd ?? process.cwd();
  const indexPath = resolved.intentIndexPath ?? DEFAULT_INTENT_INDEX_PATH;
  const indexText = resolved.indexText ?? await readBvcTextFile(indexPath, { cwd });
  const relativePath = resolveIntentPathFromIndex(indexText, normalizedWorkId);
  if (!relativePath) {
    throw new Error(`intent path not found for work item: ${normalizedWorkId}`);
  }

  const path = resolveBvcReadablePath(relativePath, cwd);
  const text = await readBvcTextFile(relativePath, { cwd });
  const span = findWorkItemAtomSpan(text, normalizedWorkId);
  if (!span) {
    throw new Error(`work item atom not found in ${relativePath}: ${normalizedWorkId}`);
  }

  return {
    mode: 'intent',
    path,
    relativePath,
    indexPath: resolveBvcReadablePath(indexPath, cwd),
    indexText,
    text,
    atomText: span.fullMatch,
    span,
  };
}

export async function persistWorkItemUpdateToRepo(options = {}) {
  const item = options.item;
  if (!item?.id) {
    throw new TypeError('item.id is required');
  }

  if (options.backlogPath || options.backlogText !== undefined) {
    const cwd = options.cwd ?? process.cwd();
    const backlogPath = options.backlogPath
      ? resolveBvcReadablePath(options.backlogPath, cwd)
      : null;
    const sourceText = options.backlogText ?? await readBvcTextFile(options.backlogPath, { cwd });
    const newText = patchWorkItemInBacklogText(sourceText, item, {
      writeAudit: options.writeAudit,
    });
    if (options.persistBacklog !== false && backlogPath) {
      await writeTextAtomically(backlogPath, newText);
    }
    const result = {
      path: backlogPath,
      workId: item.id,
      status: item.status,
      mode: 'backlog',
      persisted: options.persistBacklog !== false && Boolean(backlogPath),
    };
    if (options.skipGitSnapshot !== true) {
      result.gitSnapshot = await maybeRunGitSnapshotAfterPersist({
        ...options,
        persistedResults: [result],
        workId: item.id,
        title: item.title,
        targetFiles: item.targetFiles,
      });
    }
    return result;
  }

  const source = await readWorkItemAtomFromRepo(item.id, options);
  const newText = patchWorkItemInBacklogText(source.text, item, {
    writeAudit: options.writeAudit,
  });
  if (options.persistIntent !== false) {
    await writeTextAtomically(source.path, newText);
  }
  const result = {
    path: source.relativePath ?? source.path,
    workId: item.id,
    status: item.status,
    mode: 'intent',
    persisted: options.persistIntent !== false,
  };
  if (options.skipGitSnapshot !== true) {
    result.gitSnapshot = await maybeRunGitSnapshotAfterPersist({
      ...options,
      persistedResults: [result],
      workId: item.id,
      title: item.title,
      targetFiles: item.targetFiles,
    });
  }
  return result;
}

export async function persistWorkItemUpdatesToRepo(items, options = {}) {
  if (!Array.isArray(items) || items.length === 0) {
    return [];
  }

  const results = [];
  for (const item of items) {
    results.push(await persistWorkItemUpdateToRepo({ ...options, item, skipGitSnapshot: true }));
  }

  if (options.skipGitSnapshot !== true) {
    const snapshot = await maybeRunGitSnapshotAfterPersist({
      ...options,
      persistedResults: results,
      workId: options.gitSnapshot?.workId ?? items[0]?.id,
      title: options.gitSnapshot?.title ?? items[0]?.title,
      targetFiles: options.gitSnapshot?.targetFiles ?? collectGitSnapshotTargetFiles(items),
    });
    if (snapshot) {
      results.gitSnapshot = snapshot;
    }
  }

  return results;
}

export async function appendWorkItemAtomToIntentTree(atomText, options = {}) {
  const atom = String(atomText ?? '').trim();
  if (atom === '') {
    throw new TypeError('atomText must be a non-empty string');
  }

  const [item] = parseWorkItems(atom);
  if (!item?.id) {
    throw new Error('atomText must contain a WorkItem');
  }

  const resolved = resolveCanonReadOptions(options);
  const cwd = resolved.cwd ?? process.cwd();
  const indexPath = resolveBvcReadablePath(resolved.intentIndexPath ?? DEFAULT_INTENT_INDEX_PATH, cwd);
  let indexText = '';
  let entries = [];
  try {
    indexText = await readBvcTextFile(resolved.intentIndexPath ?? DEFAULT_INTENT_INDEX_PATH, { cwd });
    entries = parseIntentIndexEntries(indexText);
  } catch (error) {
    if (!error || typeof error !== 'object' || error.code !== 'ENOENT') {
      throw error;
    }
  }

  if (entries.some((entry) => entry.id === item.id)) {
    throw new Error(`work.id already exists: ${item.id}`);
  }

  const path = options.path ?? intentPathForNewWorkItem(item);
  const nextEntries = [...entries, { id: item.id, path }]
    .sort((left, right) => compareText(left.id, right.id));
  const absolutePath = resolve(cwd, path);

  await mkdir(dirname(absolutePath), { recursive: true });
  await writeTextAtomically(absolutePath, `${atom}\n`);
  await mkdir(dirname(indexPath), { recursive: true });
  await writeTextAtomically(indexPath, buildIntentIndexStep(nextEntries.map((entry) => ({
    id: entry.id,
    path: entry.path,
  }))));

  const result = {
    workId: item.id,
    path,
    indexPath,
  };

  return result;
}

export function parseIntentIndexEntries(indexText) {
  if (typeof indexText !== 'string') {
    throw new TypeError('indexText must be a string');
  }

  return [...indexText.matchAll(/^\s*-\s*([^:\s]+):\s*(\S+)\s*$/gmu)]
    .map((match) => ({ id: match[1], path: match[2] }))
    .sort((left, right) => compareText(left.id, right.id));
}

function intentPathForItem(item) {
  return intentPathForNewWorkItem(item);
}

async function writeTextAtomically(path, text) {
  const tempPath = `${path}.tmp`;
  await writeFile(tempPath, text, 'utf8');
  await rename(tempPath, path);
}

function compareText(left, right) {
  return String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });
}
