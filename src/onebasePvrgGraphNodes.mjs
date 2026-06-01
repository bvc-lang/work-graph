import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { resolveOnebaseMetadataScanRoot } from './onebaseCliCapabilityProbe.mjs';

export const ONEBASE_PVRG_METADATA_DIRS = ['catalogs', 'documents', 'registers', 'inforegs', 'reports', 'constants'];
const YAML_EXT = /\.(yaml|yml)$/iu;
const POSTING_OS_EXT = /\.posting\.os$/iu;

function normalizeRelPath(path) {
  return String(path).replace(/\\/g, '/');
}

function inferOnebaseKindFromPath(relPath) {
  const normalized = normalizeRelPath(relPath).toLowerCase();
  for (const dir of ONEBASE_PVRG_METADATA_DIRS) {
    if (normalized.includes(`/${dir}/`) || normalized.startsWith(`${dir}/`)) {
      if (dir === 'catalogs') {
        return 'catalog';
      }
      if (dir === 'documents') {
        return 'document';
      }
      return dir.endsWith('s') ? dir.slice(0, -1) : dir;
    }
  }
  return 'artifact';
}

export function parseOnebaseYamlSummary(text, relPath) {
  const nameMatch = String(text ?? '').match(/^name:\s*(.+)$/mu);
  if (!nameMatch) {
    return null;
  }

  const name = nameMatch[1].trim();
  const posting = /^posting:\s*true/mu.test(text);

  return {
    kind: inferOnebaseKindFromPath(relPath),
    name,
    posting,
    yamlPath: normalizeRelPath(relPath),
  };
}

function listFilesRecursive(dir, prefix = '') {
  const entries = [];
  if (!existsSync(dir)) {
    return entries;
  }

  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    const abs = join(dir, entry.name);
    if (entry.isDirectory()) {
      entries.push(...listFilesRecursive(abs, rel));
      continue;
    }
    entries.push({ abs, rel: normalizeRelPath(rel) });
  }

  return entries;
}

function findPostingScriptPath(projectRoot, documentName) {
  const srcDir = join(projectRoot, 'src');
  if (!existsSync(srcDir)) {
    return null;
  }

  const normalizedDocumentName = String(documentName).toLowerCase();
  for (const file of listFilesRecursive(srcDir, 'src')) {
    if (!POSTING_OS_EXT.test(file.rel)) {
      continue;
    }

    const baseName = file.rel.split('/').pop()?.replace(/\.posting\.os$/iu, '') ?? '';
    if (baseName.toLowerCase() === normalizedDocumentName) {
      return file.rel;
    }
  }

  return null;
}

export function scanOnebaseMetadataSync(projectRoot, options = {}) {
  const root = resolve(projectRoot ?? process.cwd());
  if (!existsSync(root)) {
    return [];
  }

  const entries = [];
  for (const file of listFilesRecursive(root)) {
    if (!YAML_EXT.test(file.rel)) {
      continue;
    }

    if (!ONEBASE_PVRG_METADATA_DIRS.some((dir) => file.rel.includes(`/${dir}/`) || file.rel.startsWith(`${dir}/`))) {
      continue;
    }

    const summary = parseOnebaseYamlSummary(readFileSync(file.abs, 'utf8'), file.rel);
    if (!summary) {
      continue;
    }

    const postingOsPath = summary.kind === 'document' && summary.posting
      ? findPostingScriptPath(root, summary.name)
      : null;

    entries.push({
      ...summary,
      traceId: `onebase:${summary.kind}:${summary.name}`,
      ...(postingOsPath ? { postingOsPath } : {}),
    });
  }

  return entries.sort((left, right) => left.yamlPath.localeCompare(right.yamlPath, 'en', { sensitivity: 'variant' }));
}

export function buildOnebaseArtifactNodeId(kind, name) {
  return `onebase:${kind}:${name}`;
}

export function buildOnebasePvrgGraphNodes(metadataEntries = [], options = {}) {
  const nodeById = new Map();
  const edges = [];
  const edgeKeys = new Set();

  function ensureNode(node) {
    if (!nodeById.has(node.id)) {
      nodeById.set(node.id, node);
    }
    return nodeById.get(node.id);
  }

  function addEdge(edge) {
    const key = `${edge.from}->${edge.to}:${edge.type}`;
    if (edgeKeys.has(key)) {
      return;
    }
    edgeKeys.add(key);
    edges.push(edge);
  }

  for (const entry of metadataEntries) {
    const artifactNode = ensureNode({
      id: buildOnebaseArtifactNodeId(entry.kind, entry.name),
      kind: 'onebase_artifact',
      onebaseKind: entry.kind,
      title: entry.name,
      subtitle: entry.kind,
      path: entry.yamlPath,
      traceId: entry.traceId,
      posting: entry.posting === true,
    });

    if (entry.postingOsPath) {
      const scriptNode = ensureNode({
        id: buildOnebaseArtifactNodeId('posting_script', entry.name),
        kind: 'onebase_artifact',
        onebaseKind: 'posting_script',
        title: `${entry.name}.posting`,
        subtitle: 'posting_script',
        path: entry.postingOsPath,
        traceId: `onebase:posting_script:${entry.name}`,
        posting: true,
      });
      addEdge({
        from: artifactNode.id,
        to: scriptNode.id,
        type: 'onebase_posting',
      });
    }
  }

  const nodes = [...nodeById.values()].sort((left, right) => left.id.localeCompare(right.id, 'en', { sensitivity: 'variant' }));
  const sortedEdges = edges.sort((left, right) =>
    `${left.from}\0${left.to}\0${left.type}`.localeCompare(`${right.from}\0${right.to}\0${right.type}`, 'en', { sensitivity: 'variant' }),
  );

  return {
    schema: 'onebase.pvrg_graph_nodes.v1',
    projectRoot: options.projectRoot ? normalizeRelPath(relative(options.repoRoot ?? process.cwd(), options.projectRoot)) : null,
    nodes,
    edges: sortedEdges,
    counts: {
      nodes: nodes.length,
      edges: sortedEdges.length,
      documents: nodes.filter((node) => node.onebaseKind === 'document').length,
      catalogs: nodes.filter((node) => node.onebaseKind === 'catalog').length,
      postingScripts: nodes.filter((node) => node.onebaseKind === 'posting_script').length,
    },
  };
}

export function buildOnebasePvrgGraphFromProjectRoot(options = {}) {
  const repoRoot = options.repoRoot ?? process.cwd();
  const projectRoot = options.projectRoot ?? resolveOnebaseMetadataScanRoot({ repoRoot });
  if (!projectRoot) {
    return buildOnebasePvrgGraphNodes([], { repoRoot, projectRoot: null });
  }

  const metadataEntries = scanOnebaseMetadataSync(projectRoot);
  return buildOnebasePvrgGraphNodes(metadataEntries, { repoRoot, projectRoot });
}

export function mergeOnebaseGraphIntoBlockL2Graph(l2Graph, onebaseGraph, options = {}) {
  if (!onebaseGraph || onebaseGraph.nodes.length === 0) {
    return l2Graph;
  }

  const containerId = options.containerId ?? 'container:onebase-domain';
  const maxNodes = options.maxNodes ?? l2Graph.counts?.nodes ?? Number.MAX_SAFE_INTEGER;
  const mergedNodes = [...l2Graph.nodes];
  const mergedEdges = [...l2Graph.edges];
  const visibleIds = new Set(mergedNodes.map((node) => node.id));

  for (const node of onebaseGraph.nodes) {
    if (mergedNodes.length >= maxNodes) {
      break;
    }
    mergedNodes.push(node);
    visibleIds.add(node.id);
    mergedEdges.push({
      from: containerId,
      to: node.id,
      type: 'hosts_onebase',
    });
  }

  for (const edge of onebaseGraph.edges) {
    if (visibleIds.has(edge.from) && visibleIds.has(edge.to)) {
      mergedEdges.push(edge);
    }
  }

  const hiddenCount = Math.max(0, (l2Graph.hiddenCount ?? 0) + Math.max(0, onebaseGraph.nodes.length - (maxNodes - l2Graph.nodes.length)));

  return {
    ...l2Graph,
    nodes: mergedNodes,
    edges: mergedEdges.sort((left, right) =>
      `${left.from}\0${left.to}\0${left.type}`.localeCompare(`${right.from}\0${right.to}\0${right.type}`, 'en', { sensitivity: 'variant' }),
    ),
    onebaseMerged: true,
    hiddenCount,
    capped: hiddenCount > 0,
    counts: {
      ...l2Graph.counts,
      nodes: mergedNodes.length,
      edges: mergedEdges.length,
      onebaseArtifacts: onebaseGraph.nodes.length,
    },
  };
}
