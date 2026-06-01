import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import {
  appendWorkItemAtomToBacklogText,
  findWorkItemAtomSpan,
  writeBacklogTextAtomically,
} from './workGraphBacklogPersist.mjs';
import {
  appendWorkItemAtomToIntentTree,
  readWorkItemAtomFromRepo,
} from './intentTreeWorkItems.mjs';
import { formatStepAtomDraft, validateStepAtomDraft } from './stepAtomFormatter.mjs';

export const INTENT_COMPOSER_PROPOSAL_SCHEMA = 'intent-composer.proposal.v1';
export const INTENT_COMPOSER_DRAFT_SCHEMA = 'intent-composer.draft.v1';
export const INTENT_COMPOSER_APPLY_SCHEMA = 'intent-composer.apply.response.v1';

function slugifyIntent(value) {
  const asciiParts = String(value ?? '')
    .toLowerCase()
    .split(/[^a-z0-9]+/u)
    .filter(Boolean);

  if (asciiParts.length > 0) {
    return asciiParts.join('-').slice(0, 40);
  }

  const hash = [...String(value ?? '')].reduce((acc, ch) => ((acc * 31) + ch.charCodeAt(0)) >>> 0, 7);
  return `msg-${hash.toString(36)}`;
}

function atomNameFromSlug(slug) {
  const safe = slug.replace(/-/g, '_');
  return `Задача_${safe}`;
}

export function buildIntentDraftFromMessage(message, options = {}) {
  const text = String(message ?? '').trim();
  if (text === '') {
    throw new TypeError('message is required');
  }

  const slug = slugifyIntent(text);
  const workId = String(options.workId ?? `intent-${slug}`).trim();
  const title = text.length > 120 ? `${text.slice(0, 117)}...` : text;

  const draft = {
    name: atomNameFromSlug(slug),
    profile: 'work_item',
    basis: [text],
    vector: [
      'Оформить WorkItem из намерения пользователя через раздел «Замысел».',
    ],
    goal: [
      'Получить reviewable backlog draft без записи chat transcript в канон.',
    ],
    checks: [
      'draft проходит StepAtomDraft validation',
      'operator подтверждает apply в backlog',
    ],
    labels: {
      'atom.profile': 'work_item',
      'work.id': workId,
      'work.title': title,
      'work.status': 'backlog',
      'work.owner_role': options.ownerRole ?? 'product_architect',
      'work.department': options.department ?? 'ui-dashboard',
      'work.priority': options.priority ?? 'medium',
      'work.risk': 'low',
      'work.next_action': options.nextAction ?? 'review draft и promote в ready',
      'intake.source_kind': 'intent-composer',
      'intake.review_status': 'pending',
      'work.pipeline_stage': 'intake',
      'trace.status': 'pending',
      'migration.strategy': 'rebuild',
    },
  };

  const questions = text.length < 48
    ? ['Уточните ожидаемый результат и target files для WorkItem.']
    : [];

  return {
    schema: INTENT_COMPOSER_DRAFT_SCHEMA,
    message: text,
    suggestedWorkId: workId,
    reviewRequired: true,
    questions,
    risks: [],
    targetFiles: [],
    criteria: draft.checks,
    draft,
  };
}

export function buildIntentComposerProposal(body, options = {}) {
  const message = String(body?.message ?? body?.text ?? '').trim();
  if (message === '') {
    return {
      schema: INTENT_COMPOSER_PROPOSAL_SCHEMA,
      ok: false,
      error: 'message_required',
      validationErrors: ['message is required'],
    };
  }

  const intentDraft = buildIntentDraftFromMessage(message, {
    workId: body.workId,
    ownerRole: body.ownerRole,
    department: body.department,
    priority: body.priority,
    nextAction: body.nextAction,
  });

  const validationErrors = validateStepAtomDraft(intentDraft.draft);
  let formattedAtom = null;

  if (validationErrors.length === 0) {
    try {
      formattedAtom = formatStepAtomDraft(intentDraft.draft);
    } catch (error) {
      validationErrors.push(error instanceof Error ? error.message : String(error));
    }
  }

  return {
    schema: INTENT_COMPOSER_PROPOSAL_SCHEMA,
    ok: validationErrors.length === 0,
    error: validationErrors.length === 0 ? null : 'validation_failed',
    intentDraft,
    formattedAtom,
    validationErrors,
    validationWarnings: options.warnings ?? [],
    reviewRequired: true,
    distinctFromAgentRun: true,
  };
}

export function parseIntentComposerRequestBody(rawBody) {
  if (rawBody === undefined || rawBody === null) {
    return {};
  }

  if (typeof rawBody === 'string' && rawBody.trim() === '') {
    return {};
  }

  const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;

  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new TypeError('intent composer body must be a JSON object');
  }

  return body;
}

export async function executeIntentComposerProposal(options = {}) {
  const body = parseIntentComposerRequestBody(options.body ?? {});
  return buildIntentComposerProposal(body, options);
}

export async function executeIntentComposerApply(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const body = parseIntentComposerRequestBody(options.body ?? {});

  const proposal = body.proposal
    ?? buildIntentComposerProposal(body);

  if (!proposal.ok || !proposal.intentDraft?.draft) {
    return {
      schema: INTENT_COMPOSER_APPLY_SCHEMA,
      ok: false,
      error: proposal.error ?? 'invalid_proposal',
      workId: null,
      persistedBacklog: false,
      validationErrors: proposal.validationErrors ?? [],
    };
  }

  const workId = String(proposal.intentDraft.suggestedWorkId ?? '').trim();
  const formattedAtom = proposal.formattedAtom
    ?? formatStepAtomDraft(proposal.intentDraft.draft);

  if (options.backlogText !== undefined || options.backlogPath) {
    const backlogPath = resolve(cwd, options.backlogPath);
    const backlogText = options.backlogText ?? await readFile(backlogPath, 'utf8');
    if (findWorkItemAtomSpan(backlogText, workId)) {
      return {
        schema: INTENT_COMPOSER_APPLY_SCHEMA,
        ok: false,
        error: 'duplicate_work_id',
        workId,
        persistedBacklog: false,
        validationErrors: [`work.id already exists: ${workId}`],
      };
    }

    const nextText = appendWorkItemAtomToBacklogText(backlogText, formattedAtom);

    if (options.persistBacklog !== false) {
      await writeBacklogTextAtomically(backlogPath, nextText);
    }

    return {
      schema: INTENT_COMPOSER_APPLY_SCHEMA,
      ok: true,
      error: null,
      workId,
      persistedBacklog: options.persistBacklog !== false,
      validationErrors: [],
      formattedAtom,
    };
  }

  try {
    await readWorkItemAtomFromRepo(workId, { ...options, cwd });
    return {
      schema: INTENT_COMPOSER_APPLY_SCHEMA,
      ok: false,
      error: 'duplicate_work_id',
      workId,
      persistedBacklog: false,
      validationErrors: [`work.id already exists: ${workId}`],
    };
  } catch (error) {
    if (!String(error instanceof Error ? error.message : error).includes('not found')) {
      throw error;
    }
  }

  if (options.persistBacklog !== false) {
    await appendWorkItemAtomToIntentTree(formattedAtom, { ...options, cwd });
  }

  return {
    schema: INTENT_COMPOSER_APPLY_SCHEMA,
    ok: true,
    error: null,
    workId,
    persistedBacklog: options.persistBacklog !== false,
    validationErrors: [],
    formattedAtom,
  };
}
