import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const STEP_ATOM_PATTERN = /^#([^\n<]+)<\[\n([\s\S]*?)\n\]>/gmu;
const LIST_SEPARATOR_PATTERN = /\s*,\s*/u;

export const INTENT_NODE_KINDS = ['question', 'option', 'decision', 'work_ref', 'evidence_ref'];
export const INTENT_NODE_PROFILE = 'intent_node';

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

function parseList(value) {
  if (value === undefined || value === null) {
    return [];
  }
  return String(value)
    .split(LIST_SEPARATOR_PATTERN)
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function parseSections(body) {
  const sections = {
    basis: '',
    vector: '',
    goal: '',
    labels: {},
  };

  const lines = body.split('\n');
  let current = null;
  let buffer = [];

  const flush = () => {
    if (current === null) {
      return;
    }
    const text = buffer.join('\n').trim();
    if (current === 'labels') {
      for (const line of buffer) {
        const match = line.match(/^([^:]+):\s*(.*)$/u);
        if (match) {
          sections.labels[match[1].trim()] = match[2].trim();
        }
      }
    } else {
      sections[current] = text;
    }
    buffer = [];
    current = null;
  };

  for (const line of lines) {
    if (line === 'Базис:') {
      flush();
      current = 'basis';
      continue;
    }
    if (line === 'Вектор:') {
      flush();
      current = 'vector';
      continue;
    }
    if (line === 'Цель:') {
      flush();
      current = 'goal';
      continue;
    }
    if (line === 'Метки:') {
      flush();
      current = 'labels';
      continue;
    }
    if (current !== null) {
      buffer.push(line);
    }
  }
  flush();
  return sections;
}

export function parseIntentNodes(text) {
  if (typeof text !== 'string') {
    throw new TypeError('text must be a string');
  }

  const nodes = [];
  for (const match of text.matchAll(STEP_ATOM_PATTERN)) {
    const [, atomName, body] = match;
    const sections = parseSections(body);
    const labels = sections.labels;
    if (labels['atom.profile'] !== INTENT_NODE_PROFILE) {
      continue;
    }

    const id = String(labels['intent.id'] ?? '').trim();
    if (id === '') {
      continue;
    }

    nodes.push({
      atomName: atomName.trim(),
      id,
      nodeKind: String(labels['intent.node_kind'] ?? '').trim(),
      parentId: String(labels['intent.parent_id'] ?? '').trim(),
      title: String(labels['intent.title'] ?? labels['intent.id'] ?? id).trim(),
      selected: String(labels['intent.selected'] ?? '').trim().toLowerCase() === 'true',
      basis: sections.basis,
      vector: sections.vector,
      goal: sections.goal,
      links: Object.fromEntries(
        Object.entries(labels)
          .filter(([key]) => key.startsWith('intent.link.'))
          .map(([key, value]) => [key.slice('intent.link.'.length), value]),
      ),
      labels,
    });
  }

  return nodes;
}

async function listStepFiles(rootDir) {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = join(rootDir, entry.name);
      if (entry.isDirectory()) {
        return listStepFiles(entryPath);
      }
      return entry.isFile() && entry.name.endsWith('.bvc') ? [entryPath] : [];
    }),
  );
  return nested.flat();
}

export async function readIntentNodesFromRepo(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const intentRoot = resolve(cwd, options.intentRoot ?? 'intent');
  try {
    const files = await listStepFiles(intentRoot);
    const nodes = [];

    for (const filePath of files.sort(compareText)) {
      const text = await readFile(filePath, 'utf8');
      nodes.push(...parseIntentNodes(text));
    }

    return nodes.sort((left, right) => compareText(left.id, right.id));
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

export function buildChildIdsByIntentParent(nodes) {
  const childIdsByParent = new Map();
  for (const node of nodes) {
    if (node.parentId === '') {
      continue;
    }
    if (!childIdsByParent.has(node.parentId)) {
      childIdsByParent.set(node.parentId, []);
    }
    childIdsByParent.get(node.parentId).push(node.id);
  }
  for (const childIds of childIdsByParent.values()) {
    childIds.sort(compareText);
  }
  return childIdsByParent;
}

export function attachDerivedIntentNodeChildren(nodes) {
  const childIdsByParent = buildChildIdsByIntentParent(nodes);
  return nodes.map((node) => ({
    ...node,
    childIds: [...(childIdsByParent.get(node.id) ?? [])],
  }));
}

export function readIntentNodeLink(node, key) {
  return String(node?.links?.[key] ?? node?.labels?.[`intent.link.${key}`] ?? '').trim();
}
