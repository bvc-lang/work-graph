import { buildUnifiedLinkageProjectionV1 } from './unifiedLinkageProjection.mjs';

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });
const EXPAND_RELATIONS = new Set(['targets', 'depends_on', 'references', 'verifies', 'edits']);
const DEFAULT_MAX_NODES = 24;
const DEFAULT_MAX_DEPTH = 2;

function nodeKey(node) {
  return `${node.kind}:${node.id}`;
}

function workNode(item) {
  return {
    kind: 'work',
    id: item.id,
    title: item.title,
    status: item.status,
    targetFiles: [...(item.targetFiles ?? [])].sort(compareText),
    traceStatus: item.traceStatus ?? '',
  };
}

function fileNode(path) {
  return {
    kind: 'file',
    id: path,
    path,
  };
}

function extractFilePath(link) {
  if (link.to.kind === 'file') {
    return link.to.id;
  }

  if ((link.to.kind === 'symbol' || link.to.kind === 'range') && link.to.locator?.path) {
    return link.to.locator.path;
  }

  return null;
}

export function buildPvrgTaskScopeSlice(items, taskId, options = {}) {
  if (!Array.isArray(items)) {
    throw new TypeError('items must be an array');
  }

  const itemById = new Map(items.map((item) => [item.id, item]));
  const task = itemById.get(taskId);
  if (task === undefined) {
    throw new Error(`unknown task id: ${taskId}`);
  }

  const maxNodes = Number.isInteger(options.maxNodes) && options.maxNodes > 0 ? options.maxNodes : DEFAULT_MAX_NODES;
  const maxDepth = Number.isInteger(options.maxDepth) && options.maxDepth >= 0 ? options.maxDepth : DEFAULT_MAX_DEPTH;
  const linkage = options.linkage ?? buildUnifiedLinkageProjectionV1(items, options);

  const nodes = new Map([[nodeKey(workNode(task)), workNode(task)]]);
  const edges = [];
  const queue = [{ workId: task.id, depth: 0 }];
  const visitedWork = new Set([task.id]);

  while (queue.length > 0 && nodes.size < maxNodes) {
    const current = queue.shift();
    const currentItem = itemById.get(current.workId);
    if (currentItem === undefined) {
      continue;
    }

    for (const path of currentItem.targetFiles ?? []) {
      const file = fileNode(path);
      nodes.set(nodeKey(file), file);
      edges.push({
        from: { kind: 'work', id: current.workId },
        to: { kind: 'file', id: path },
        relation: 'targets',
        source: 'work.target_files',
        confidence: 'low',
      });
    }

    for (const link of linkage.links) {
      if (link.sourceWorkId !== current.workId && link.from.id !== current.workId) {
        continue;
      }

      if (!EXPAND_RELATIONS.has(link.relation)) {
        continue;
      }

      edges.push({
        from: link.from,
        to: link.to,
        relation: link.relation,
        source: link.sourceLabel ?? link.source,
        confidence: link.confidence,
      });

      const filePath = extractFilePath(link);
      if (filePath !== null && nodes.size < maxNodes) {
        nodes.set(nodeKey(fileNode(filePath)), fileNode(filePath));
      }

      if (link.to.kind === 'work' && current.depth < maxDepth && !visitedWork.has(link.to.id) && nodes.size < maxNodes) {
        const related = itemById.get(link.to.id);
        if (related !== undefined) {
          visitedWork.add(link.to.id);
          nodes.set(nodeKey(workNode(related)), workNode(related));
          queue.push({ workId: link.to.id, depth: current.depth + 1 });
        }
      }
    }

    for (const dependencyId of currentItem.dependsOn ?? []) {
      const dependency = itemById.get(dependencyId);
      if (dependency === undefined) {
        continue;
      }

      nodes.set(nodeKey(workNode(dependency)), workNode(dependency));
      edges.push({
        from: { kind: 'work', id: current.workId },
        to: { kind: 'work', id: dependencyId },
        relation: 'depends_on',
        source: 'work.depends_on',
        confidence: 'high',
      });

      if (current.depth < maxDepth && !visitedWork.has(dependencyId) && nodes.size < maxNodes) {
        visitedWork.add(dependencyId);
        queue.push({ workId: dependencyId, depth: current.depth + 1 });
      }
    }
  }

  const sortedNodes = [...nodes.values()].sort((left, right) => compareText(nodeKey(left), nodeKey(right)));
  const sortedEdges = edges.sort((left, right) =>
    compareText(`${left.from.kind}:${left.from.id}\0${left.relation}\0${left.to.kind}:${left.to.id}`, `${right.from.kind}:${right.from.id}\0${right.relation}\0${right.to.kind}:${right.to.id}`),
  );

  return {
    schema: 'pvrg.task-scope.slice.v1',
    seedWorkId: taskId,
    maxNodes,
    maxDepth,
    truncated: nodes.size >= maxNodes,
    nodeCount: sortedNodes.length,
    edgeCount: sortedEdges.length,
    nodes: sortedNodes.slice(0, maxNodes),
    edges: sortedEdges,
  };
}
