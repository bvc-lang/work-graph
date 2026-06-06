import { loadArchitectureL1Canon } from './architectureL1Canon.mjs';
import { classifyWorkItemBlock, classifyWorkItemBlockIdForCanon } from './workItemBlockClassifier.mjs';
import { buildIntentHierarchySnapshot } from './intentHierarchy.mjs';
import { buildOperatorDashboardSnapshot } from './workGraphRuntime.mjs';
import { buildRunnerQueueProjectionFromItems } from './workGraphRunnerQueueProjection.mjs';
import { buildKanbanBoardProjection } from './kanbanBoardProjection.mjs';
import {
  buildCycleSliceProjection,
  DEFAULT_DONE_ARCHIVE_CAP,
  PHASE_EPIC_PATTERN,
} from './workGraphCycleSlice.mjs';

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

export const OPERATOR_SHELL_SCHEMA = 'operator-shell.snapshot.v2';
export const STARTUP_BUDGET_V1 = {
  maxInitialFetchMs: 800,
  lazyViews: ['graph', 'architecture', 'schematic'],
  deferUntilVisible: true,
};

export function buildSemanticCrossHighlightMap(items, options = {}) {
  let canon = options.canon ?? null;
  if (!canon && options.repoRoot) {
    try {
      canon = loadArchitectureL1Canon(options.repoRoot, { canonPath: options.canonPath });
    } catch {
      canon = null;
    }
  }

  return [...items]
    .sort((left, right) => compareText(left.id, right.id))
    .map((item) => ({
      workId: item.id,
      title: item.title,
      status: item.status,
      architectureBlockId: canon
        ? classifyWorkItemBlockIdForCanon(item, canon)
        : classifyWorkItemBlock(item),
      intentPath: item.labels?.['intent.path'] ?? null,
      targetFiles: [...(item.targetFiles ?? [])],
    }));
}

export function buildPhaseRoadmap(items) {
  return [...items]
    .filter((item) => PHASE_EPIC_PATTERN.test(item.id))
    .sort((left, right) => compareText(left.id, right.id))
    .map((item) => ({
      id: item.id,
      title: item.title,
      status: item.status,
      nextAction: item.nextAction,
    }));
}

export function buildOperatorShellSnapshotV2(workGraphSnapshot, options = {}) {
  const items = Array.isArray(workGraphSnapshot?.items) ? workGraphSnapshot.items : [];
  const dashboard = buildOperatorDashboardSnapshot(workGraphSnapshot, options.dashboard ?? options);
  const cycleSlice = buildCycleSliceProjection(items, {
    doneArchiveCap: options.doneArchiveCap ?? DEFAULT_DONE_ARCHIVE_CAP,
    currentCycle: options.currentCycle,
  });
  const intentSidebar = buildIntentHierarchySnapshot(items.map((item) => ({ item })));
  const semanticCrossHighlight = buildSemanticCrossHighlightMap(items, {
    repoRoot: options.repoRoot,
    canonPath: options.canonPath,
    canon: options.canon,
  });
  const runnerQueue = buildRunnerQueueProjectionFromItems(items, {
    workerRuns: options.workerRuns ?? [],
    recordedAt: options.recordedAt,
  });
  const kanbanBoard = buildKanbanBoardProjection(items, { includeItems: options.includeKanbanItems === true });

  return {
    schema: OPERATOR_SHELL_SCHEMA,
    sourceSchema: workGraphSnapshot.schema,
    dashboard,
    cycleSlice,
    intentSidebar,
    semanticCrossHighlight,
    runnerQueue,
    kanbanBoard,
    phaseRoadmap: buildPhaseRoadmap(items),
    startupBudget: STARTUP_BUDGET_V1,
  };
}

export function buildIntentSidebarReadModel(intentHierarchySnapshot) {
  const domains = intentHierarchySnapshot?.domains ?? [];
  return {
    schema: 'intent.sidebar.read.v1',
    domains: domains.map((domain) => ({
      id: domain.id,
      label: domain.label,
      count: domain.count,
      workIds: [...domain.workIds],
    })),
  };
}

export function findCrossHighlightTargets(shellSnapshot, workId) {
  const row = shellSnapshot?.semanticCrossHighlight?.find((entry) => entry.workId === workId);
  if (!row) {
    return { architectureBlockId: null, relatedWorkIds: [] };
  }

  const relatedWorkIds = (shellSnapshot.semanticCrossHighlight ?? [])
    .filter((entry) => entry.architectureBlockId === row.architectureBlockId && entry.workId !== workId)
    .map((entry) => entry.workId);

  return {
    architectureBlockId: row.architectureBlockId,
    relatedWorkIds,
  };
}
