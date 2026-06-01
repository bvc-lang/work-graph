import {
  findWorkItemAtomSpan,
  writeBacklogTextAtomically,
} from './workGraphBacklogPersist.mjs';
import { readWorkItemAtomFromRepo } from './intentTreeWorkItems.mjs';
import { buildClosingAnalysisSuggestion } from './closingAnalysisSuggest.mjs';
import { parseWorkItems } from './workGraphRuntime.mjs';
import {
  formatStepAtomDraft,
  parseStepAtomDrafts,
  validateStepAtomDraft,
} from './stepAtomFormatter.mjs';

export const ATOM_INSPECTOR_PROPOSAL_SCHEMA = 'atom-inspector.proposal.v1';
export const ATOM_INSPECTOR_APPLY_SCHEMA = 'atom-inspector.apply.response.v1';

const WORK_ITEM_STATUS_OPTIONS = [
  'backlog',
  'ready',
  'claimed',
  'doing',
  'verify',
  'done',
  'blocked',
];

export function importStepAtomDraftForWorkItem(backlogText, workId) {
  const span = findWorkItemAtomSpan(backlogText, workId);
  if (!span) {
    throw new Error(`work item atom not found: ${workId}`);
  }

  const [record] = parseStepAtomDrafts(span.fullMatch);
  if (!record) {
    throw new Error(`failed to parse work item atom: ${workId}`);
  }

  return {
    workId,
    atomName: span.atomName,
    draft: record.draft,
    warnings: record.warnings,
    validationErrors: record.errors,
    sourceBlock: span.fullMatch,
  };
}

export function normalizeAtomInspectorDraftInput(rawDraft) {
  if (!rawDraft || typeof rawDraft !== 'object' || Array.isArray(rawDraft)) {
    throw new TypeError('draft must be an object');
  }

  const draft = {
    profile: String(rawDraft.profile ?? 'work_item').trim(),
    name: String(rawDraft.name ?? '').trim(),
    basis: normalizeTextArray(rawDraft.basis),
    vector: normalizeTextArray(rawDraft.vector),
    goal: normalizeTextArray(rawDraft.goal),
    labels: normalizeLabels(rawDraft.labels),
  };

  if (rawDraft.checks !== undefined) {
    draft.checks = normalizeTextArray(rawDraft.checks, { allowEmpty: true });
  }

  if (rawDraft.evidence !== undefined) {
    draft.evidence = normalizeTextArray(rawDraft.evidence, { allowEmpty: true });
  }

  if (rawDraft.analysis !== undefined) {
    draft.analysis = normalizeTextArray(rawDraft.analysis, { allowEmpty: true });
  }

  if (rawDraft.decision !== undefined) {
    draft.decision = normalizeTextArray(rawDraft.decision, { allowEmpty: true });
  }

  if (rawDraft.uiRefs !== undefined) {
    draft.uiRefs = normalizeTextArray(rawDraft.uiRefs, { allowEmpty: true });
  }

  if (draft.labels['atom.profile'] === undefined || draft.labels['atom.profile'] === '') {
    draft.labels['atom.profile'] = draft.profile;
  }

  return draft;
}

export function buildAtomInspectorProposal(draft, options = {}) {
  const normalizedDraft = normalizeAtomInspectorDraftInput(draft);
  const validationErrors = validateStepAtomDraft(normalizedDraft);

  if (validationErrors.length > 0) {
    return {
      schema: ATOM_INSPECTOR_PROPOSAL_SCHEMA,
      ok: false,
      workId: normalizedDraft.labels?.['work.id'] ?? options.workId ?? null,
      targetFile: options.targetFile ?? 'work/backlog.bvc',
      draft: normalizedDraft,
      generatedStep: null,
      warnings: [],
      validationErrors,
    };
  }

  const generatedStep = formatStepAtomDraft(normalizedDraft);
  const reparsed = parseStepAtomDrafts(generatedStep)[0];

  return {
    schema: ATOM_INSPECTOR_PROPOSAL_SCHEMA,
    ok: true,
    workId: normalizedDraft.labels['work.id'] ?? options.workId ?? null,
    targetFile: options.targetFile ?? 'work/backlog.bvc',
    draft: normalizedDraft,
    generatedStep,
    warnings: reparsed?.warnings ?? [],
    validationErrors: reparsed?.errors ?? [],
  };
}

export function replaceWorkItemAtomInBacklogText(backlogText, workId, generatedStep) {
  const span = findWorkItemAtomSpan(backlogText, workId);
  if (!span) {
    throw new Error(`work item atom not found: ${workId}`);
  }

  const atomText = String(generatedStep ?? '').trimEnd();
  if (!atomText.startsWith('#')) {
    throw new Error('generatedStep must be a formatted step atom block');
  }

  const suffix = backlogText.slice(span.end);
  const separator = suffix.startsWith('\n') ? '' : '\n';
  return `${backlogText.slice(0, span.start)}${atomText}${separator}${suffix}`;
}

export async function applyAtomInspectorProposalToBacklogFile(options = {}) {
  const workId = String(options.workId ?? '').trim();
  if (workId === '') {
    throw new TypeError('workId is required');
  }

  const proposal = buildAtomInspectorProposal(options.draft, {
    workId,
    targetFile: options.targetFile,
  });

  if (!proposal.ok || proposal.validationErrors.length > 0) {
    return {
      schema: ATOM_INSPECTOR_APPLY_SCHEMA,
      ok: false,
      error: 'validation_failed',
      workId,
      proposal,
      persistedBacklog: false,
    };
  }

  if (proposal.workId !== workId) {
    return {
      schema: ATOM_INSPECTOR_APPLY_SCHEMA,
      ok: false,
      error: 'work_id_mismatch',
      workId,
      proposal,
      persistedBacklog: false,
    };
  }

  const source = options.backlogText !== undefined || options.backlogPath
    ? {
        path: resolveBacklogPath(options),
        text: options.backlogText ?? await readBacklog(resolveBacklogPath(options)),
        mode: 'backlog',
      }
    : await readWorkItemAtomFromRepo(workId, options);
  const previousItem = parseWorkItems(source.text).find((entry) => entry.id === workId) ?? null;
  const newText = replaceWorkItemAtomInBacklogText(source.text, workId, proposal.generatedStep);
  const nextItem = parseWorkItems(newText).find((entry) => entry.id === workId) ?? null;
  const closingAnalysisSuggestion = buildClosingAnalysisSuggestion(previousItem, nextItem);

  if (options.persistBacklog !== false) {
    await writeBacklogTextAtomically(source.path, newText);
  }

  return {
    schema: ATOM_INSPECTOR_APPLY_SCHEMA,
    ok: true,
    error: null,
    workId,
    proposal,
    persistedBacklog: options.persistBacklog !== false,
    path: source.relativePath ?? source.path,
    mode: source.mode,
    ...(closingAnalysisSuggestion ? { closingAnalysisSuggestion } : {}),
  };
}

export function workItemStatusOptions() {
  return [...WORK_ITEM_STATUS_OPTIONS];
}

function normalizeTextArray(value, options = {}) {
  if (Array.isArray(value)) {
    return value
      .map((entry) => String(entry ?? '').trim())
      .filter((entry) => entry !== '');
  }

  if (typeof value === 'string') {
    const lines = value
      .split(/\r?\n/u)
      .map((line) => line.replace(/^-\s*/u, '').trim())
      .filter(Boolean);
    return lines;
  }

  if (options.allowEmpty) {
    return [];
  }

  return [];
}

function normalizeLabels(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  const labels = {};
  for (const [key, rawValue] of Object.entries(value)) {
    labels[String(key).trim()] = String(rawValue ?? '').trim();
  }

  return labels;
}

async function readBacklog(backlogPath) {
  const { readFile } = await import('node:fs/promises');
  return readFile(backlogPath, 'utf8');
}

function resolveBacklogPath(options) {
  if (!options.backlogPath) {
    throw new TypeError('backlogPath is required for backlog compatibility writes');
  }

  if (/^(?:[A-Za-z]:[\\/]|\\\\|\/)/u.test(options.backlogPath)) {
    return options.backlogPath;
  }

  return `${options.cwd ?? process.cwd()}/${options.backlogPath}`;
}
