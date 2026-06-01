import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, posix } from 'node:path';
import { pathToFileURL } from 'node:url';

import { buildSnapshot, parseWorkItems } from './workGraphRuntime.mjs';
import { classifyIntentFolder, toIntentPath } from './intentHierarchy.mjs';

const STEP_ATOM_PATTERN = /^#([^\n<]+)<\[\n([\s\S]*?)\n\]>/gmu;

export function extractWorkItemAtoms(backlogText) {
  if (typeof backlogText !== 'string') {
    throw new TypeError('backlogText must be a string');
  }

  return [...backlogText.matchAll(STEP_ATOM_PATTERN)]
    .map((match) => {
      const [content] = match;
      const [item] = parseWorkItems(content);
      return item ? { item, content: ensureTrailingNewline(content) } : null;
    })
    .filter(Boolean);
}

export function buildIntentTreeEntries(backlogText) {
  const entries = extractWorkItemAtoms(backlogText).map(({ item, content }) => ({
    id: item.id,
    path: toIntentPathFromItem(item),
    content,
    item,
  }));

  assertUniquePaths(entries);
  return entries.sort((left, right) => compareText(left.id, right.id));
}

export function buildIntentIndexStep(entries) {
  const lines = entries
    .map((entry) => `  - ${entry.id}: ${toPortablePath(entry.path)}`)
    .join('\n');

  return `#Индекс_Intent_Tree_WorkItems<[
Базис:
  Generated compatibility manifest for WorkItem atoms split from work/backlog.bvc.
Вектор:
  Keep work/backlog.bvc intact for current runtime/UI readers until they can read intent/**/*.work.bvc directly.
Цель:
  Provide a deterministic inventory of canonical intent tree task files without changing current backlog compatibility.
WorkItems:
${lines}

Метки:
  atom.profile: trace
  intent.index: work_items
  intent.source: work/backlog.bvc
  intent.compatibility_projection: work/backlog.bvc
  trace.status: pending
]>
`;
}

export function compareBacklogAndIntentSnapshots(backlogText, intentFileTexts) {
  const backlogSnapshot = buildSnapshot(parseWorkItems(backlogText));
  const intentSnapshot = buildSnapshot(parseWorkItems(intentFileTexts.join('\n')));

  return {
    equal: JSON.stringify(backlogSnapshot) === JSON.stringify(intentSnapshot),
    backlogSnapshot,
    intentSnapshot,
  };
}

export async function writeIntentTreeFromBacklog(backlogText, options = {}) {
  const root = options.root ?? process.cwd();
  if (options.clean === true) {
    await rm(join(root, 'intent'), { recursive: true, force: true });
  }

  const entries = buildIntentTreeEntries(backlogText);

  for (const entry of entries) {
    const absolutePath = join(root, entry.path);
    await mkdir(dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, entry.content, 'utf8');
  }

  const indexPath = options.indexPath ?? 'intent/index.bvc';
  await mkdir(dirname(join(root, indexPath)), { recursive: true });
  await writeFile(join(root, indexPath), buildIntentIndexStep(entries), 'utf8');

  const comparison = compareBacklogAndIntentSnapshots(
    backlogText,
    entries.map((entry) => entry.content),
  );

  return {
    entries,
    indexPath,
    comparison,
  };
}

function toIntentPathFromItem(item) {
  return toIntentPath(item);
}

function assertUniquePaths(entries) {
  const seen = new Map();

  for (const entry of entries) {
    const existing = seen.get(entry.path);
    if (existing !== undefined) {
      throw new Error(`duplicate intent path ${entry.path} for ${existing} and ${entry.id}`);
    }

    seen.set(entry.path, entry.id);
  }
}

function toPortablePath(path) {
  return path;
}

function ensureTrailingNewline(text) {
  return text.endsWith('\n') ? text : `${text}\n`;
}

function compareText(left, right) {
  return left.localeCompare(right, 'en', { sensitivity: 'variant' });
}

export { lintIntentTreeOrphans } from './intentTreeLint.mjs';

async function main() {
  const { readFile } = await import('node:fs/promises');
  const root = process.cwd();
  const backlogPath = join(root, 'work/backlog.bvc');
  const backlogText = await readFile(backlogPath, 'utf8');
  const result = await writeIntentTreeFromBacklog(backlogText, { root, clean: true });

  if (!result.comparison.equal) {
    throw new Error('intent tree split did not preserve backlog snapshot');
  }

  console.log(`Wrote ${result.entries.length} WorkItem files and ${result.indexPath}`);
}

const invokedUrl = process.argv[1] ? pathToFileURL(process.argv[1]).href : '';
if (invokedUrl === import.meta.url) {
  await main();
}
