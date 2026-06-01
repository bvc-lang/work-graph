import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { describe, it } from 'node:test';

import {
  TOOL_RULES_MIGRATED_PORT_CATALOG,
  auditToolRulesMigratedPort,
  formatAgentBehaviorRulesAuditReport,
  parseToolRulesMigratedSourceAtomNames,
} from '../src/agentBehaviorRulesAudit.mjs';
import { WORKER_BEHAVIOR_RULE_IDS } from '../src/agentBehaviorRulesBundle.mjs';

describe('auditToolRulesMigratedPort', () => {
  it('catalog covers every source atom from tool-rules-migrated.bvc', async () => {
    const sourceAtoms = await parseToolRulesMigratedSourceAtomNames({ cwd: process.cwd() });
    assert.equal(sourceAtoms.length, TOOL_RULES_MIGRATED_PORT_CATALOG.length);

    const report = await auditToolRulesMigratedPort({ cwd: process.cwd() });
    assert.equal(report.schema, 'workgraph.agent-behavior-rules-audit.v1');
    assert.equal(report.ok, true, formatAgentBehaviorRulesAuditReport(report));
    assert.equal(report.missingCount, 0);
    assert.ok(report.deferredCount >= 5);
    assert.ok(report.coveredCount >= 3);
  });

  it('requires ported MCP rules in worker bundle', async () => {
    const report = await auditToolRulesMigratedPort({ cwd: process.cwd() });
    for (const ruleId of ['mcp-read-guardrails', 'mcp-loop-planning', 'mcp-editing-policy']) {
      assert.ok(WORKER_BEHAVIOR_RULE_IDS.includes(ruleId));
      assert.ok(report.rows.some((row) => row.workGraphRuleId === ruleId && row.rulePresent));
    }
  });

  it('fails when catalog entry missing for a source atom', async () => {
    const sourceText = await readFile('../project/rules/agent-behavior/tool-rules-migrated.step', 'utf8');
    const report = await auditToolRulesMigratedPort({
      cwd: process.cwd(),
      sourceText: `${sourceText}\n#Новое_Правило_Без_Каталога<[\nВектор:\n  test.\n]>\n`,
    });
    assert.equal(report.ok, false);
    assert.ok(report.rows.some((row) => row.sourceAtom === 'Новое_Правило_Без_Каталога'));
  });
});
