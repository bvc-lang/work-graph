import {
  applyAtomInspectorProposalToBacklogFile,
  buildAtomInspectorProposal,
  importStepAtomDraftForWorkItem,
} from './atomInspector.mjs';
import {
  readWorkItemAtomFromRepo,
  readWorkItemsFromRepo,
} from './intentTreeWorkItems.mjs';

export function parseAtomInspectorRequestBody(rawBody) {
  if (rawBody === undefined || rawBody === null) {
    return {};
  }

  if (typeof rawBody === 'string' && rawBody.trim() === '') {
    return {};
  }

  const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new TypeError('atom inspector body must be a JSON object');
  }

  return body;
}

export async function readAtomInspectorDraftResponse(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const workId = String(options.workId ?? '').trim();

  if (workId === '') {
    throw new TypeError('workId is required');
  }

  const source = await readWorkItemAtomFromRepo(workId, { ...options, cwd });
  const imported = importStepAtomDraftForWorkItem(source.atomText, workId);
  const items = await readWorkItemsFromRepo({ ...options, cwd });
  const item = items.find((entry) => entry.id === workId) ?? null;

  return {
    schema: 'atom-inspector.draft.v1',
    workId,
    atomName: imported.atomName,
    draft: imported.draft,
    warnings: imported.warnings,
    validationErrors: imported.validationErrors,
    snapshot: item
      ? {
          id: item.id,
          title: item.title,
          status: item.status,
          ownerRole: item.ownerRole,
          department: item.department,
          priority: item.priority,
          risk: item.risk,
          dependsOn: item.dependsOn,
          targetFiles: item.targetFiles,
          nextAction: item.nextAction,
          blocker: item.blocker,
        }
      : null,
  };
}

export async function executeAtomInspectorProposal(options = {}) {
  const body = parseAtomInspectorRequestBody(options.body ?? {});
  const workId = String(body.workId ?? body.taskId ?? '').trim();
  const cwd = options.cwd ?? process.cwd();

  if (workId === '') {
    return buildAtomInspectorProposal({}, { targetFile: options.backlogPath ?? 'intent/index.bvc' });
  }

  if (!body.draft) {
    const draftResponse = await readAtomInspectorDraftResponse({ ...options, cwd, workId });
    return buildAtomInspectorProposal(draftResponse.draft, {
      workId,
      targetFile: options.backlogPath ?? 'intent/index.bvc',
    });
  }

  return buildAtomInspectorProposal(body.draft, {
    workId,
    targetFile: options.backlogPath ?? 'intent/index.bvc',
  });
}

export async function executeAtomInspectorApply(options = {}) {
  const body = parseAtomInspectorRequestBody(options.body ?? {});
  const workId = String(body.workId ?? body.taskId ?? '').trim();
  const cwd = options.cwd ?? process.cwd();

  if (workId === '') {
    return {
      schema: 'atom-inspector.apply.response.v1',
      ok: false,
      error: 'work_id_required',
      workId: null,
      persistedBacklog: false,
    };
  }

  if (!body.draft) {
    return {
      schema: 'atom-inspector.apply.response.v1',
      ok: false,
      error: 'draft_required',
      workId,
      persistedBacklog: false,
    };
  }

  return applyAtomInspectorProposalToBacklogFile({
    ...options,
    cwd,
    workId,
    draft: body.draft,
    targetFile: options.backlogPath ?? 'intent/index.bvc',
    persistBacklog: body.persistBacklog !== false && options.persistBacklog !== false,
  });
}

export {
  buildCodeGapDraftProposal,
  buildWorkItemDraftFromCodeGapSuggestion,
  executeCodeGapDraftApply,
  executeCodeGapDraftProposal,
} from './codeGapDraftIntakeApi.mjs';
