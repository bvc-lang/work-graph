import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { collectStepFilePaths } from './promptRulesProjection.mjs';
import { parseStepAtomDrafts } from './stepAtomFormatter.mjs';

export const AGENT_BEHAVIOR_BUNDLE_SCHEMA = 'workgraph.agent-behavior-rules-bundle.v1';
export const AGENT_BEHAVIOR_RULES_DIR = 'rules/agent-behavior';

/** Rule ids injected into worker/OpenAI prompt slice (minimal port subset). */
export const WORKER_BEHAVIOR_RULE_IDS = [
  'golden-path',
  'worker-tool-policy',
  'worker-provider-neutrality',
  'worker-failure-retry',
  'worker-evidence-gates',
  'worker-task-bound-run',
  'mcp-read-guardrails',
  'mcp-loop-planning',
  'mcp-editing-policy',
  'cursor-ide-workgraph-parity',
  'chat-work-scope-readonly',
  'work-item-create-analysis-decision',
];

/** Rule ids for MCP agent prompt slice (includes worker subset). */
export const MCP_BEHAVIOR_RULE_IDS = [...WORKER_BEHAVIOR_RULE_IDS];

/** Documented port map (subset); full tool-rules-migrated.bvc remains in ../project. */
export const PORTED_RULE_SOURCE_HINTS = {
  'worker-tool-policy': '../project/rules/agent-behavior/tool-rules-migrated.step (tool policy, bounded scope)',
  'worker-provider-neutrality': '../project/rules/agent-behavior/tool-rules-migrated.step (provider-neutral execution)',
  'worker-failure-retry': '../project/rules/agent-behavior/tool-rules-migrated.step (errors / retry)',
  'worker-evidence-gates': '../project/rules/agent-behavior/tool-rules-migrated.step (evidence / verification)',
  'worker-task-bound-run': '../project/rules/agent-behavior/tool-rules-migrated.step (task-bound agent run)',
  'mcp-read-guardrails': '../project/rules/agent-behavior/tool-rules-migrated.step#Надёжное_Рассуждение_Guardrails',
  'mcp-loop-planning': '../project/rules/agent-behavior/tool-rules-migrated.step#Планирование_И_Инструменты',
  'mcp-editing-policy': '../project/rules/agent-behavior/tool-rules-migrated.step#Режим_По_Умолчанию_Разработчик',
  'cursor-ide-workgraph-parity': 'rules/agent-behavior/cursor-ide-workgraph-parity.bvc',
  'chat-work-scope-readonly': 'rules/agent-behavior/chat-work-scope-readonly.bvc',
  'golden-path': 'rules/agent-behavior/rebuild.bvc',
  'work-item-create-analysis-decision': 'rules/agent-behavior/work-item-create-analysis-decision.bvc',
};

const DEFAULT_PROMPT_SLICE_MAX_CHARS = 5500;

export function buildBehaviorRuleRecord(filePath, draft, labels) {
  const ruleId = labels['rule.id'] ?? draft.name;

  return {
    id: ruleId,
    name: draft.name,
    filePath,
    basis: joinLines(draft.basis),
    vector: joinLines(draft.vector),
    goal: joinLines(draft.goal),
    labels,
    bundleGroup: labels['bundle.group'] ?? null,
    traceStatus: labels['trace.status'] ?? 'unknown',
  };
}

export async function loadAgentBehaviorRulesFromDir(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const roots = options.roots ?? [AGENT_BEHAVIOR_RULES_DIR];
  const filePaths = options.filePaths ?? await collectStepFilePaths(cwd, roots);
  const rulesById = new Map();

  for (const filePath of filePaths) {
    const absolutePath = resolve(cwd, filePath);
    const text = options.fileContents?.[filePath] ?? await readFile(absolutePath, 'utf8');

    for (const parsed of parseStepAtomDrafts(text)) {
      if (parsed.draft.profile !== 'prompt_rule') {
        continue;
      }

      const labels = parsed.draft.labels ?? {};
      const ruleId = labels['rule.id'] ?? parsed.draft.name;
      const record = buildBehaviorRuleRecord(filePath, parsed.draft, labels);

      if (!parsed.errors.length) {
        rulesById.set(ruleId, record);
      }
    }
  }

  return [...rulesById.values()].sort((left, right) => left.id.localeCompare(right.id, 'en'));
}

export function selectWorkerBehaviorRules(allRules, ruleIds = WORKER_BEHAVIOR_RULE_IDS) {
  const byId = new Map(allRules.map((rule) => [rule.id, rule]));

  return ruleIds
    .map((ruleId) => byId.get(ruleId))
    .filter(Boolean);
}

export function buildAgentBehaviorPromptSlice(rules, options = {}) {
  const maxChars = options.maxChars ?? DEFAULT_PROMPT_SLICE_MAX_CHARS;
  const chunks = [];

  for (const rule of rules) {
    chunks.push(
      `[${rule.id}]\nБазис: ${rule.basis}\nВектор: ${rule.vector}\nЦель: ${rule.goal}`,
    );
  }

  let slice = chunks.join('\n\n');

  if (slice.length > maxChars) {
    slice = `${slice.slice(0, maxChars - 3)}...`;
  }

  return slice;
}

export async function loadAgentBehaviorRulesBundle(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const ruleIds = options.ruleIds ?? WORKER_BEHAVIOR_RULE_IDS;
  const allRules = await loadAgentBehaviorRulesFromDir({ cwd, ...options });
  const workerRules = selectWorkerBehaviorRules(allRules, ruleIds);
  const missingRuleIds = ruleIds.filter((ruleId) => !workerRules.some((rule) => rule.id === ruleId));

  return {
    schema: AGENT_BEHAVIOR_BUNDLE_SCHEMA,
    rulesDir: AGENT_BEHAVIOR_RULES_DIR,
    ruleIds: workerRules.map((rule) => rule.id),
    workerRules,
    allRules,
    missingRuleIds,
    promptSlice: buildAgentBehaviorPromptSlice(workerRules, options),
    portedSourceHints: PORTED_RULE_SOURCE_HINTS,
    ok: missingRuleIds.length === 0,
  };
}

function joinLines(values) {
  if (!Array.isArray(values) || values.length === 0) {
    return '';
  }

  return values.map((value) => String(value).trim()).filter(Boolean).join(' ');
}
