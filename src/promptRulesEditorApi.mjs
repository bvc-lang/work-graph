import { readFile, rename, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';

import { buildPromptRulesProjection } from './promptRulesProjection.mjs';
import { parseStepAtomDrafts } from './stepAtomFormatter.mjs';

export const PROMPT_RULES_EDITOR_SCHEMA = 'workgraph.prompt-rules-editor.v1';
export const PROMPT_RULES_EDITOR_ALLOWED_ROOT = 'rules/agent-behavior/';

function normalizeRelativePath(filePath) {
  return String(filePath ?? '').trim().replace(/\\/g, '/');
}

export function isPromptRulesEditorPathAllowed(filePath) {
  const normalized = normalizeRelativePath(filePath);
  return normalized.startsWith(PROMPT_RULES_EDITOR_ALLOWED_ROOT)
    && (normalized.endsWith('.bvc') || normalized.endsWith('.bvc'));
}

export function validatePromptRuleSourceText(sourceText) {
  const parsedAtoms = parseStepAtomDrafts(sourceText);
  const promptRules = parsedAtoms.filter((parsed) => parsed.draft.profile === 'prompt_rule');
  const errors = [];

  if (promptRules.length === 0) {
    errors.push('file must contain at least one prompt_rule atom');
  }

  for (const parsed of parsedAtoms) {
    errors.push(...parsed.errors.map((message) => `${parsed.draft.name}: ${message}`));
  }

  return {
    ok: errors.length === 0,
    atomCount: parsedAtoms.length,
    promptRuleCount: promptRules.length,
    errors,
  };
}

export async function readPromptRuleSource(options = {}) {
  const cwd = resolve(options.cwd ?? process.cwd());
  const ruleId = String(options.ruleId ?? options.id ?? '').trim();
  if (ruleId === '') {
    throw new TypeError('ruleId is required');
  }

  const projection = await buildPromptRulesProjection({
    cwd,
    ruleId,
    roots: ['rules/agent-behavior'],
  });

  const rule = projection.rules.find((entry) => entry.id === ruleId);
  if (!rule) {
    throw new Error(`prompt rule not found in ${PROMPT_RULES_EDITOR_ALLOWED_ROOT}: ${ruleId}`);
  }

  if (!isPromptRulesEditorPathAllowed(rule.filePath)) {
    throw new Error(`prompt rule path not editable: ${rule.filePath}`);
  }

  const absolutePath = resolve(cwd, rule.filePath);
  const sourceText = await readFile(absolutePath, 'utf8');
  const validation = validatePromptRuleSourceText(sourceText);

  return {
    schema: PROMPT_RULES_EDITOR_SCHEMA,
    ruleId,
    filePath: rule.filePath,
    sourceText,
    rule,
    validation,
    editable: true,
  };
}

async function writeTextAtomically(path, text) {
  const tempPath = `${path}.tmp-${process.pid}-${Date.now()}`;
  await writeFile(tempPath, text, 'utf8');
  await rename(tempPath, path);
}

export async function savePromptRuleSource(options = {}) {
  const cwd = resolve(options.cwd ?? process.cwd());
  const filePath = normalizeRelativePath(options.filePath);
  const sourceText = String(options.sourceText ?? '');

  if (!isPromptRulesEditorPathAllowed(filePath)) {
    return {
      schema: 'workgraph.prompt-rules-editor.save.v1',
      ok: false,
      error: 'path_not_allowed',
      filePath,
      persisted: false,
    };
  }

  const validation = validatePromptRuleSourceText(sourceText);
  if (!validation.ok) {
    return {
      schema: 'workgraph.prompt-rules-editor.save.v1',
      ok: false,
      error: 'validation_failed',
      filePath,
      persisted: false,
      validation,
    };
  }

  const absolutePath = resolve(cwd, filePath);
  if (options.persist !== false) {
    await mkdirSafe(dirname(absolutePath));
    await writeTextAtomically(absolutePath, sourceText.endsWith('\n') ? sourceText : `${sourceText}\n`);
  }

  return {
    schema: 'workgraph.prompt-rules-editor.save.v1',
    ok: true,
    filePath,
    persisted: options.persist !== false,
    validation,
  };
}

async function mkdirSafe(path) {
  const { mkdir } = await import('node:fs/promises');
  await mkdir(path, { recursive: true });
}

export function parsePromptRulesEditorRequestBody(rawBody) {
  if (rawBody === undefined || rawBody === null) {
    return {};
  }

  if (typeof rawBody === 'string' && rawBody.trim() === '') {
    return {};
  }

  const body = typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new TypeError('prompt rules editor body must be a JSON object');
  }

  return body;
}

export async function executePromptRuleSourceRead(options = {}) {
  const body = parsePromptRulesEditorRequestBody(options.body ?? {});
  const ruleId = String(options.ruleId ?? body.ruleId ?? body.id ?? '').trim();
  return readPromptRuleSource({ cwd: options.cwd, ruleId });
}

export async function executePromptRuleSourceSave(options = {}) {
  const body = parsePromptRulesEditorRequestBody(options.body ?? {});
  const filePath = normalizeRelativePath(body.filePath);
  const sourceText = String(body.sourceText ?? '');

  if (filePath === '' || sourceText.trim() === '') {
    return {
      schema: 'workgraph.prompt-rules-editor.save.v1',
      ok: false,
      error: 'file_path_and_source_required',
      persisted: false,
    };
  }

  return savePromptRuleSource({
    cwd: options.cwd,
    filePath,
    sourceText,
    persist: body.persist !== false && options.persist !== false,
  });
}
