import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';

import { parseStepAtomDrafts } from './stepAtomFormatter.mjs';

export const PROMPT_RULES_PROJECTION_SCHEMA = 'workgraph.prompt-rules-projection.v1';
export const PROMPT_RULES_SCAN_ROOTS = ['protocols', 'rules'];

export async function collectStepFilePaths(cwd, roots = PROMPT_RULES_SCAN_ROOTS) {
  const paths = [];

  for (const root of roots) {
    paths.push(...await walkStepFiles(resolve(cwd, root), cwd));
  }

  return [...new Set(paths)].sort((left, right) => left.localeCompare(right, 'en'));
}

async function walkStepFiles(directory, cwd) {
  let entries;

  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') {
      return [];
    }

    throw error;
  }

  const paths = [];

  for (const entry of entries) {
    const absolutePath = join(directory, entry.name);

    if (entry.isDirectory()) {
      paths.push(...await walkStepFiles(absolutePath, cwd));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith('.bvc')) {
      paths.push(relative(cwd, absolutePath).replace(/\\/g, '/'));
    }
  }

  return paths;
}

export function buildPromptRuleProjectionEntry(filePath, parsed) {
  const { draft, errors, warnings } = parsed;
  const labels = draft.labels ?? {};
  const ruleId = labels['rule.id']
    ?? labels['protocol.id']
    ?? labels['decision.id']
    ?? draft.name;

  return {
    id: ruleId,
    name: draft.name,
    filePath,
    profile: draft.profile,
    basis: joinTextArray(draft.basis),
    vector: joinTextArray(draft.vector),
    goal: joinTextArray(draft.goal),
    checks: joinTextArray(draft.checks ?? []),
    evidence: joinTextArray(draft.evidence ?? []),
    labels,
    traceStatus: labels['trace.status'] ?? 'unknown',
    protocolId: labels['protocol.id'] ?? null,
    decisionId: labels['decision.id'] ?? null,
    validationStatus: errors.length === 0 ? 'valid' : 'invalid',
    validationErrors: errors,
    validationWarnings: warnings,
  };
}

export async function buildPromptRulesProjection(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const roots = options.roots ?? PROMPT_RULES_SCAN_ROOTS;
  const ruleIdFilter = options.ruleId ? String(options.ruleId).trim() : '';
  const filePaths = options.filePaths ?? await collectStepFilePaths(cwd, roots);
  const rules = [];

  for (const filePath of filePaths) {
    const absolutePath = resolve(cwd, filePath);
    const text = options.fileContents?.[filePath] ?? await readFile(absolutePath, 'utf8');
    const parsedAtoms = parseStepAtomDrafts(text);

    for (const parsed of parsedAtoms) {
      if (parsed.draft.profile !== 'prompt_rule') {
        continue;
      }

      const entry = buildPromptRuleProjectionEntry(filePath, parsed);
      rules.push(entry);
    }
  }

  rules.sort((left, right) => {
    const byFile = left.filePath.localeCompare(right.filePath, 'en');
    if (byFile !== 0) {
      return byFile;
    }

    return left.id.localeCompare(right.id, 'en');
  });

  const filteredRules = ruleIdFilter
    ? rules.filter((rule) => rule.id === ruleIdFilter)
    : rules;

  const validCount = rules.filter((rule) => rule.validationStatus === 'valid').length;

  return {
    schema: PROMPT_RULES_PROJECTION_SCHEMA,
    scannedRoots: roots,
    rules: filteredRules,
    summary: {
      total: rules.length,
      valid: validCount,
      invalid: rules.length - validCount,
      filtered: filteredRules.length,
    },
  };
}

function joinTextArray(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return '';
  }

  return values.map((value) => String(value).trim()).filter(Boolean).join('\n');
}
