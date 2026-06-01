import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { parseStepAtomDrafts } from './stepAtomFormatter.mjs';
import {
  AGENT_BEHAVIOR_RULES_DIR,
  PORTED_RULE_SOURCE_HINTS,
  WORKER_BEHAVIOR_RULE_IDS,
  loadAgentBehaviorRulesFromDir,
} from './agentBehaviorRulesBundle.mjs';

export const AGENT_BEHAVIOR_RULES_AUDIT_SCHEMA = 'workgraph.agent-behavior-rules-audit.v1';

/** Canonical port map vs ../project/rules/agent-behavior/tool-rules-migrated.step */
export const TOOL_RULES_MIGRATED_PORT_CATALOG = [
  {
    sourceAtom: 'Правила_Заметки_И_Пути',
    status: 'deferred',
    reason: 'Monaco writeFile/readFile/deleteFile tree; Work Graph uses MCP + bounded worker targetFiles',
  },
  {
    sourceAtom: 'Команды_Shell_Npm',
    status: 'deferred',
    reason: 'Sidecar runCommand/bash; worker uses verification matrix gates',
  },
  {
    sourceAtom: 'Режим_Агента_Доп_Правила',
    status: 'adapted',
    workGraphRuleId: 'worker-tool-policy',
  },
  {
    sourceAtom: 'Только_Доставка_Через_Инструмент',
    status: 'deferred',
    reason: 'AGENT_TOOLS / writeFile delivery in Monaco chat',
  },
  {
    sourceAtom: 'Настройка_MCP',
    status: 'deferred',
    reason: 'configureMcpServer UI flow in ioHasC settings',
  },
  {
    sourceAtom: 'Стиль_Исполнения_Composer',
    status: 'deferred',
    reason: 'Composer chat UX; worker returns structured JSON output',
  },
  {
    sourceAtom: 'Режим_По_Умолчанию_Разработчик',
    status: 'ported',
    workGraphRuleId: 'mcp-editing-policy',
  },
  {
    sourceAtom: 'Планирование_И_Инструменты',
    status: 'ported',
    workGraphRuleId: 'mcp-loop-planning',
  },
  {
    sourceAtom: 'Надёжное_Рассуждение_Guardrails',
    status: 'ported',
    workGraphRuleId: 'mcp-read-guardrails',
  },
  {
    sourceAtom: 'После_Правок_LSP',
    status: 'deferred',
    reason: 'Monaco LSP sidecar diagnostics',
  },
  {
    sourceAtom: 'После_Правок_Тесты',
    status: 'adapted',
    workGraphRuleId: 'worker-evidence-gates',
  },
  {
    sourceAtom: 'Формат_Вызовов_Инструментов',
    status: 'deferred',
    reason: 'AGENT_TOOLS markdown / native tool_calls in orchestrator',
  },
  {
    sourceAtom: 'Структурированный_Итог_PVRG',
    status: 'adapted',
    workGraphRuleId: 'mcp-read-guardrails',
  },
  {
    sourceAtom: 'Обратная_Связь_По_Плану',
    status: 'deferred',
    reason: 'Plan mode orchestrator nudges',
  },
  {
    sourceAtom: 'Агент_Low_Code_Устав',
    status: 'deferred',
    reason: 'generateFromCharter sidecar in ioHasC IDE',
  },
];

const catalogBySourceAtom = new Map(
  TOOL_RULES_MIGRATED_PORT_CATALOG.map((entry) => [entry.sourceAtom, entry]),
);

export async function parseToolRulesMigratedSourceAtomNames(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const sourcePath = resolve(cwd, options.sourcePath ?? '../project/rules/agent-behavior/tool-rules-migrated.step');
  const text = options.sourceText ?? await readFile(sourcePath, 'utf8');
  return parseStepAtomDrafts(text).map((parsed) => parsed.draft.name);
}

export async function auditToolRulesMigratedPort(options = {}) {
  const cwd = options.cwd ?? process.cwd();
  const sourcePath = options.sourcePath ?? '../project/rules/agent-behavior/tool-rules-migrated.step';
  const sourceAtoms = await parseToolRulesMigratedSourceAtomNames({ cwd, sourcePath, sourceText: options.sourceText });
  const allRules = await loadAgentBehaviorRulesFromDir({ cwd, ...options });
  const ruleIds = new Set(allRules.map((rule) => rule.id));

  const rows = sourceAtoms.map((sourceAtom) => {
    const catalog = catalogBySourceAtom.get(sourceAtom);
    if (!catalog) {
      return {
        sourceAtom,
        status: 'missing_catalog_entry',
        workGraphRuleId: null,
        rulePresent: false,
        ok: false,
      };
    }

    const workGraphRuleId = catalog.workGraphRuleId ?? null;
    const rulePresent = workGraphRuleId ? ruleIds.has(workGraphRuleId) : catalog.status === 'deferred';

    return {
      sourceAtom,
      status: catalog.status,
      reason: catalog.reason ?? null,
      workGraphRuleId,
      rulePresent,
      ok: catalog.status === 'deferred' || catalog.status === 'adapted' || rulePresent,
    };
  });

  const covered = rows.filter((row) => row.status === 'ported' || row.status === 'adapted');
  const deferred = rows.filter((row) => row.status === 'deferred');
  const missing = rows.filter((row) => !row.ok);

  return {
    schema: AGENT_BEHAVIOR_RULES_AUDIT_SCHEMA,
    sourcePath,
    rulesDir: AGENT_BEHAVIOR_RULES_DIR,
    workerRuleIds: [...WORKER_BEHAVIOR_RULE_IDS],
    sourceRuleCount: sourceAtoms.length,
    catalogEntryCount: TOOL_RULES_MIGRATED_PORT_CATALOG.length,
    coveredCount: covered.length,
    deferredCount: deferred.length,
    missingCount: missing.length,
    ok: missing.length === 0 && sourceAtoms.length === TOOL_RULES_MIGRATED_PORT_CATALOG.length,
    rows,
    portedSourceHints: PORTED_RULE_SOURCE_HINTS,
  };
}

export function formatAgentBehaviorRulesAuditReport(report) {
  const lines = [
    `agent behavior rules audit: ${report.ok ? 'ok' : 'failed'} (${report.coveredCount} covered/adapted, ${report.deferredCount} deferred, ${report.missingCount} missing)`,
    `source: ${report.sourcePath}`,
    `worker rule ids: ${report.workerRuleIds.join(', ')}`,
  ];

  for (const row of report.rows) {
    lines.push(`${row.ok ? 'ok' : 'fail'}: ${row.sourceAtom} → ${row.status}${row.workGraphRuleId ? ` (${row.workGraphRuleId})` : ''}`);
  }

  return lines.join('\n');
}
