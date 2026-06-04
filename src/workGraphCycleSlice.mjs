const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

export const CYCLE_SLICE_SCHEMA = 'workgraph.cycle.slice.v1';
export const PHASE_EPIC_PATTERN = /^phase-\d+/u;
export const DONE_STATUSES = new Set(['done', 'verified']);
export const OPERATIONAL_STATUSES = new Set(['ready', 'claimed', 'doing', 'in_progress', 'verify', 'blocked']);
export const DEFAULT_DONE_ARCHIVE_CAP = 12;

export function sortDoneArchiveItems(items) {
  return [...items].sort((left, right) => compareText(right.id, left.id));
}

export function selectDoneArchiveItems(items, cap = DEFAULT_DONE_ARCHIVE_CAP) {
  return sortDoneArchiveItems(items.filter((item) => DONE_STATUSES.has(item.status))).slice(0, cap);
}

export function deriveWorkCycle(item, itemById) {
  if (!item || typeof item !== 'object') {
    throw new TypeError('item must be an object');
  }

  const explicitCycle = String(item.labels?.['work.cycle'] ?? item.cycle ?? '').trim();
  if (explicitCycle !== '') {
    return explicitCycle;
  }

  if (PHASE_EPIC_PATTERN.test(item.id)) {
    return item.id;
  }

  const visited = new Set();
  const queue = [...(item.dependsOn ?? [])];

  while (queue.length > 0) {
    const dependencyId = queue.shift();
    if (visited.has(dependencyId)) {
      continue;
    }
    visited.add(dependencyId);

    if (PHASE_EPIC_PATTERN.test(dependencyId)) {
      return dependencyId;
    }

    const dependency = itemById.get(dependencyId);
    if (dependency?.labels?.['work.cycle']) {
      return String(dependency.labels['work.cycle']).trim();
    }

    for (const nextId of dependency?.dependsOn ?? []) {
      if (!visited.has(nextId)) {
        queue.push(nextId);
      }
    }
  }

  return 'uncategorized';
}

export function resolveCurrentCycle(items, itemById) {
  const activeItems = items.filter((item) => OPERATIONAL_STATUSES.has(item.status) && item.status !== 'backlog');
  const cycles = activeItems.map((item) => deriveWorkCycle(item, itemById));

  const phaseCycles = cycles.filter((cycle) => PHASE_EPIC_PATTERN.test(cycle));
  if (phaseCycles.length > 0) {
    return [...phaseCycles].sort((left, right) => comparePhaseEpic(right, left))[0];
  }

  const readyItem = items.find((item) => item.status === 'ready');
  if (readyItem) {
    return deriveWorkCycle(readyItem, itemById);
  }

  if (cycles.length > 0) {
    return cycles[0];
  }

  const backlogItems = items.filter((item) => item.status === 'backlog');
  const cycleCounts = new Map();
  for (const item of backlogItems) {
    const cycleId = deriveWorkCycle(item, itemById);
    cycleCounts.set(cycleId, (cycleCounts.get(cycleId) ?? 0) + 1);
  }

  if (cycleCounts.size > 0) {
    const ranked = [...cycleCounts.entries()]
      .filter(([cycleId]) => cycleId !== 'uncategorized')
      .sort((left, right) => right[1] - left[1] || compareText(left[0], right[0]));
    if (ranked.length > 0) {
      return ranked[0][0];
    }

    return [...cycleCounts.entries()].sort((left, right) => right[1] - left[1])[0][0];
  }

  return 'uncategorized';
}

export function buildCycleSliceProjection(items, options = {}) {
  const stableItems = [...items].sort((left, right) => compareText(left.id, right.id));
  const itemById = new Map(stableItems.map((item) => [item.id, item]));
  const doneArchiveCap = options.doneArchiveCap ?? DEFAULT_DONE_ARCHIVE_CAP;

  const cyclesMap = new Map();
  for (const item of stableItems) {
    const cycleId = deriveWorkCycle(item, itemById);
    const bucket = cyclesMap.get(cycleId) ?? {
      id: cycleId,
      label: formatCycleLabel(cycleId),
      total: 0,
      done: 0,
      active: 0,
      backlog: 0,
    };

    bucket.total += 1;
    if (DONE_STATUSES.has(item.status)) {
      bucket.done += 1;
    } else if (item.status === 'backlog') {
      bucket.backlog += 1;
    } else {
      bucket.active += 1;
    }

    cyclesMap.set(cycleId, bucket);
  }

  const currentCycle = options.currentCycle ?? resolveCurrentCycle(stableItems, itemById);

  return {
    schema: CYCLE_SLICE_SCHEMA,
    currentCycle,
    doneArchiveCap,
    operationalStatuses: [...OPERATIONAL_STATUSES],
    derivedByWorkId: Object.fromEntries(
      stableItems.map((item) => [item.id, deriveWorkCycle(item, itemById)]),
    ),
    cycles: [...cyclesMap.values()].sort((left, right) => compareText(left.id, right.id)),
  };
}

export function filterItemsByCycleSlice(items, options = {}) {
  const stableItems = [...items].sort((left, right) => compareText(left.id, right.id));
  const itemById = new Map(stableItems.map((item) => [item.id, item]));
  const cycleId = options.cycleId ?? 'current';
  const resolvedCycle = cycleId === 'current'
    ? resolveCurrentCycle(stableItems, itemById)
    : cycleId;
  const includeAllCycles = resolvedCycle === 'all';
  const operationalOnly = options.operationalOnly !== false;
  const doneArchiveCap = options.doneArchiveCap ?? DEFAULT_DONE_ARCHIVE_CAP;

  const cycleMatched = includeAllCycles
    ? stableItems
    : stableItems.filter((item) => deriveWorkCycle(item, itemById) === resolvedCycle);

  if (!operationalOnly) {
    return cycleMatched;
  }

  const operational = cycleMatched.filter((item) => OPERATIONAL_STATUSES.has(item.status));
  const doneArchive = selectDoneArchiveItems(cycleMatched, doneArchiveCap);

  return [...operational, ...doneArchive];
}

export function partitionBoardItems(items, options = {}) {
  const filtered = filterItemsByCycleSlice(items, options);
  const operational = filtered.filter((item) => OPERATIONAL_STATUSES.has(item.status));
  const doneArchive = selectDoneArchiveItems(filtered, options.doneArchiveCap ?? DEFAULT_DONE_ARCHIVE_CAP);
  const hiddenDoneCount = Math.max(0, countDoneInCycle(items, options) - doneArchive.length);

  return {
    operational,
    doneArchive,
    hiddenDoneCount,
    totalVisible: filtered.length,
  };
}

function countDoneInCycle(items, options) {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const cycleId = options.cycleId ?? 'current';
  const resolvedCycle = cycleId === 'current'
    ? resolveCurrentCycle(items, itemById)
    : cycleId;

  if (resolvedCycle === 'all') {
    return items.filter((item) => DONE_STATUSES.has(item.status)).length;
  }

  return items.filter((item) => DONE_STATUSES.has(item.status) && deriveWorkCycle(item, itemById) === resolvedCycle).length;
}

function formatCycleLabel(cycleId) {
  if (cycleId === 'uncategorized') {
    return 'Без цикла';
  }
  return cycleId.replace(/^phase-/u, 'Фаза ').replace(/-/gu, ' · ');
}

function comparePhaseEpic(left, right) {
  const leftNum = Number.parseInt(String(left).match(/^phase-(\d+)/u)?.[1] ?? '0', 10);
  const rightNum = Number.parseInt(String(right).match(/^phase-(\d+)/u)?.[1] ?? '0', 10);
  return leftNum - rightNum;
}
