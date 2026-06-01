import {
  persistWorkItemUpdateToRepo,
  readWorkItemsFromRepo,
} from './intentTreeWorkItems.mjs';
import {
  evaluateCharterPreflightForPromoteFromRepo,
} from './charterPreflightPromoteGate.mjs';
import {
  evaluatePromoteReadyEligibility,
  transitionStatus,
} from './workGraphRuntime.mjs';

export const PROMOTE_READY_RESPONSE_SCHEMA = 'operator.promote-ready.response.v1';

export function parsePromoteReadyRequestBody(rawBody) {
  if (rawBody === undefined || rawBody === null) {
    return {};
  }

  if (typeof rawBody === 'string' && rawBody.trim() === '') {
    return {};
  }

  const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new TypeError('promote-ready body must be a JSON object');
  }

  return body;
}

export function buildPromoteReadyResponse(result) {
  return {
    schema: PROMOTE_READY_RESPONSE_SCHEMA,
    ok: Boolean(result.ok),
    error: result.error ?? null,
    workId: result.workId ?? null,
    previousStatus: result.previousStatus ?? null,
    newStatus: result.newStatus ?? null,
    unsatisfiedDependencies: result.unsatisfiedDependencies ?? [],
    currentStatus: result.currentStatus ?? null,
    persistedBacklog: Boolean(result.persistedBacklog),
    persistBacklogError: result.persistBacklogError ?? null,
    charterPreflight: result.charterPreflight ?? null,
    charterViolations: result.charterViolations ?? [],
    item: result.item ?? null,
  };
}

export async function executePromoteReady(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const body = parsePromoteReadyRequestBody(options.body ?? {});
  const workId = String(body.workId ?? body.taskId ?? '').trim();

  if (workId === '') {
    return buildPromoteReadyResponse({ ok: false, error: 'work_id_required' });
  }

  const items = await readWorkItemsFromRepo({ ...options, cwd });
  const item = items.find((entry) => entry.id === workId);
  if (!item) {
    return buildPromoteReadyResponse({ ok: false, error: 'task_not_found', workId });
  }

  const charterPreflight = options.skipCharterPreflight === true
    ? { ok: true, skipped: true }
    : await evaluateCharterPreflightForPromoteFromRepo(item, options);

  const eligibility = evaluatePromoteReadyEligibility(items, workId, {
    charterPreflight: options.skipCharterPreflight === true ? undefined : charterPreflight,
  });

  if (!eligibility.ok) {
    return buildPromoteReadyResponse(eligibility);
  }

  const previousStatus = eligibility.item.status;
  let updatedItem = transitionStatus(eligibility.item, 'ready', {
    evidence: `promote-ready: ${previousStatus}→ready via operator board`,
  });

  let persistedBacklog = false;
  let persistBacklogError = null;

  if (body.persistBacklog !== false && options.persistBacklog !== false) {
    try {
      await persistWorkItemUpdateToRepo({
        ...options,
        cwd,
        item: updatedItem,
      });
      persistedBacklog = true;
    } catch (error) {
      persistBacklogError = error instanceof Error ? error.message : String(error);
    }
  }

  const ok = persistBacklogError === null && (persistedBacklog || body.persistBacklog === false || options.persistBacklog === false);

  return buildPromoteReadyResponse({
    ok,
    error: persistBacklogError ? 'persist_failed' : null,
    workId,
    previousStatus,
    newStatus: updatedItem.status,
    persistedBacklog,
    persistBacklogError,
    item: {
      id: updatedItem.id,
      title: updatedItem.title,
      status: updatedItem.status,
    },
  });
}
