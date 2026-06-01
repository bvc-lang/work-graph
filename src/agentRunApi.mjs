import {
  appendWorkerRunJournal,
  readWorkerRunJournal,
  runAgentWorkerLiveLoop,
} from './agentWorkerLiveLoop.mjs';
import {
  persistWorkItemUpdateToRepo,
  readWorkItemsFromRepo,
} from './intentTreeWorkItems.mjs';
import { buildWorkerProviderCatalog } from './workGraphWorkerProvider.mjs';

const AGENT_RUN_RESPONSE_SCHEMA = 'operator.agent-run.response.v1';

export function resolveAgentRunProvider(provider) {
  const value = String(provider ?? 'auto').trim().toLowerCase();

  if (value === '' || value === 'auto') {
    return undefined;
  }

  if (value === 'local' || value === 'openai' || value === 'openai-compatible') {
    return value === 'openai-compatible' ? 'openai' : value;
  }

  throw new Error(`unsupported agent run provider: ${provider}`);
}

export function parseAgentRunRequestBody(rawBody) {
  if (rawBody === undefined || rawBody === null) {
    return {};
  }

  if (typeof rawBody === 'string' && rawBody.trim() === '') {
    return {};
  }

  const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new TypeError('agent run body must be a JSON object');
  }

  return body;
}

export function buildAgentRunResponse(result) {
  return {
    schema: AGENT_RUN_RESPONSE_SCHEMA,
    ok: Boolean(result.ok),
    error: result.error ?? null,
    taskId: result.taskId ?? null,
    steps: Array.isArray(result.steps) ? result.steps : [],
    workerRunSummary: result.workerRunSummary ?? null,
    workerOutput: result.workerOutput ?? null,
    providerResult: result.providerResult ?? null,
    transitionProposal: result.transitionProposal ?? null,
    appliedTransition: result.appliedTransition ?? null,
    transitionError: result.transitionError ?? null,
    persistedBacklog: Boolean(result.persistedBacklog),
    persistBacklogError: result.persistBacklogError ?? null,
  };
}

export async function executeAgentRun(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const body = parseAgentRunRequestBody(options.body ?? {});
  const items = await readWorkItemsFromRepo({ ...options, cwd });

  const provider = resolveAgentRunProvider(body.provider);
  const result = await runAgentWorkerLiveLoop(items, {
    taskId: body.taskId,
    provider,
    enableFallback: body.enableFallback !== false,
    workerInput: body.policyPreset === 'verification'
      ? { policy: { mode: 'dry-run' } }
      : { policy: { mode: 'dry-run' } },
    recordedAt: options.recordedAt,
  });

  if (options.writeJournal !== false && result.workerRunSummary) {
    await appendWorkerRunJournal(result.workerRunSummary, {
      cwd,
      journalPath: options.journalPath,
    });
  }

  const persistBacklog = body.persistBacklog !== false && options.persistBacklog !== false;
  let persistedBacklog = false;
  let persistBacklogError = null;

  if (
    persistBacklog
    && result.taskId
    && result.appliedTransition
    && !result.transitionError
    && Array.isArray(result.finalItems)
  ) {
    const updatedItem = result.finalItems.find((item) => item.id === result.taskId);

    if (updatedItem) {
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
  }

  return buildAgentRunResponse({
    ...result,
    persistedBacklog,
    persistBacklogError,
  });
}

export function readWorkerProviderCatalogResponse() {
  return buildWorkerProviderCatalog();
}

export async function readAgentRunJournalResponse(options = {}) {
  const entries = await readWorkerRunJournal({
    cwd: options.cwd,
    journalPath: options.journalPath,
  });
  const limit = Number(options.limit ?? 20);

  return {
    schema: 'operator.agent-run.journal.v1',
    entries: entries.slice(-limit).reverse(),
  };
}
