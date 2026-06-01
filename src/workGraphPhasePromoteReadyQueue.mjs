import {
  evaluatePromoteReadyEligibility,
  isPromotableBacklogItem,
} from './workGraphRuntime.mjs';

export const PHASE_8_PLUS_ANCHORS = [
  'phase-8-agent-prompt-eval-tools',
  'phase-9-ui-operator-shell',
  'phase-10-ci-e2e-release-gates',
  'phase-11-gbc-gfs-gvm-deferred',
];

const PRIORITY_ORDER = new Map([
  ['critical', 0],
  ['high', 1],
  ['medium', 2],
  ['low', 3],
]);

const compareText = (left, right) => String(left).localeCompare(String(right), 'en', { sensitivity: 'variant' });

export function extractPhaseNumberFromWorkId(workId) {
  const match = String(workId ?? '').match(/^phase-(\d+)/u);
  return match ? Number(match[1]) : null;
}

export function extractPhaseNumberFromLabels(labels = {}) {
  const targetPhase = String(labels['migration.target_phase'] ?? '').trim();
  const fromTarget = extractPhaseNumberFromWorkId(targetPhase);
  if (fromTarget !== null) {
    return fromTarget;
  }

  return null;
}

export function buildPhaseAffinityIndex(items) {
  const itemById = new Map(items.map((item) => [item.id, item]));
  const affinity = new Map();

  for (const item of items) {
    const direct = extractPhaseNumberFromWorkId(item.id) ?? extractPhaseNumberFromLabels(item.labels);
    if (direct !== null) {
      affinity.set(item.id, direct);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (const item of items) {
      if (affinity.has(item.id)) {
        continue;
      }

      const deps = item.dependsOn ?? [];
      const depPhases = deps
        .map((depId) => affinity.get(depId))
        .filter((phase) => Number.isInteger(phase));

      if (depPhases.length > 0) {
        affinity.set(item.id, Math.min(...depPhases));
        changed = true;
        continue;
      }

      if (PHASE_8_PLUS_ANCHORS.some((anchorId) => deps.includes(anchorId))) {
        const anchorPhase = Math.min(
          ...PHASE_8_PLUS_ANCHORS
            .filter((anchorId) => deps.includes(anchorId))
            .map((anchorId) => extractPhaseNumberFromWorkId(anchorId) ?? 99),
        );
        affinity.set(item.id, anchorPhase);
        changed = true;
      }
    }
  }

  for (const anchorId of PHASE_8_PLUS_ANCHORS) {
    const phase = extractPhaseNumberFromWorkId(anchorId);
    if (phase !== null) {
      affinity.set(anchorId, phase);
    }
  }

  return { affinity, itemById };
}

export function resolveWorkItemPhase(item, affinityIndex) {
  return affinityIndex.affinity.get(item.id)
    ?? extractPhaseNumberFromWorkId(item.id)
    ?? extractPhaseNumberFromLabels(item.labels);
}

export function isWorkItemAtLeastMinPhase(item, affinityIndex, minPhase = 8) {
  const phase = resolveWorkItemPhase(item, affinityIndex);
  return Number.isInteger(phase) && phase >= minPhase;
}

/** @deprecated Prefer {@link isWorkItemAtLeastMinPhase} with explicit minPhase. */
export function isPhase8PlusWorkItem(item, affinityIndex) {
  return isWorkItemAtLeastMinPhase(item, affinityIndex, 8);
}

export function comparePromoteQueueItems(left, right) {
  const byPriority = (PRIORITY_ORDER.get(left.priority) ?? 9) - (PRIORITY_ORDER.get(right.priority) ?? 9);
  if (byPriority !== 0) {
    return byPriority;
  }

  return compareText(left.id, right.id);
}

export function buildPhasePromoteReadyQueue(items, options = {}) {
  const minPhase = Number.isInteger(options.minPhase) ? options.minPhase : 8;
  const limit = Number.isInteger(options.limit) ? options.limit : 12;
  const affinityIndex = buildPhaseAffinityIndex(items);

  const backlogPhaseItems = items.filter(
    (item) => item.status === 'backlog' && isWorkItemAtLeastMinPhase(item, affinityIndex, minPhase),
  );

  const promotable = backlogPhaseItems
    .filter((item) => isPromotableBacklogItem(items, item))
    .map((item) => ({
      workId: item.id,
      title: item.title,
      priority: item.priority,
      phase: affinityIndex.affinity.get(item.id) ?? null,
      dependsOn: [...(item.dependsOn ?? [])],
      nextAction: item.nextAction,
    }))
    .sort(comparePromoteQueueItems)
    .slice(0, limit);

  const blocked = backlogPhaseItems
    .filter((item) => !isPromotableBacklogItem(items, item))
    .map((item) => {
      const eligibility = evaluatePromoteReadyEligibility(items, item.id);
      return {
        workId: item.id,
        title: item.title,
        phase: affinityIndex.affinity.get(item.id) ?? null,
        error: eligibility.error ?? 'not_promotable',
        unsatisfiedDependencies: eligibility.unsatisfiedDependencies ?? [],
      };
    })
    .sort((left, right) => compareText(left.workId, right.workId));

  return {
    schema: 'workgraph.promote-ready-queue.v1',
    minPhase,
    phaseAnchors: [...PHASE_8_PLUS_ANCHORS],
    queue: promotable,
    blocked,
    backlogCount: backlogPhaseItems.length,
    promotableCount: promotable.length,
  };
}
