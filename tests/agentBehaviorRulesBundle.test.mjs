import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  AGENT_BEHAVIOR_BUNDLE_SCHEMA,
  WORKER_BEHAVIOR_RULE_IDS,
  buildAgentBehaviorPromptSlice,
  loadAgentBehaviorRulesBundle,
  selectWorkerBehaviorRules,
} from '../src/agentBehaviorRulesBundle.mjs';

describe('loadAgentBehaviorRulesBundle', () => {
  it('loads worker subset from rules/agent-behavior without missing ids', async () => {
    const bundle = await loadAgentBehaviorRulesBundle({ cwd: process.cwd() });

    assert.equal(bundle.schema, AGENT_BEHAVIOR_BUNDLE_SCHEMA);
    assert.equal(bundle.ok, true);
    assert.deepEqual(bundle.ruleIds, WORKER_BEHAVIOR_RULE_IDS);
    assert.ok(bundle.promptSlice.includes('[worker-tool-policy]'));
    assert.ok(bundle.promptSlice.includes('[golden-path]'));
    assert.ok(bundle.workerRules.some((rule) => rule.id === 'chat-work-scope-readonly'));
    assert.ok(bundle.allRules.length >= WORKER_BEHAVIOR_RULE_IDS.length);
  });

  it('builds bounded prompt slice', () => {
    const rules = [
      {
        id: 'a',
        basis: 'basis',
        vector: 'vector',
        goal: 'goal',
      },
      {
        id: 'b',
        basis: 'basis b',
        vector: 'vector b',
        goal: 'goal b',
      },
    ];

    const slice = buildAgentBehaviorPromptSlice(rules, { maxChars: 40 });
    assert.equal(slice.endsWith('...'), true);
    assert.ok(slice.length <= 40);
  });

  it('selectWorkerBehaviorRules preserves manifest order', async () => {
    const bundle = await loadAgentBehaviorRulesBundle({ cwd: process.cwd() });
    const selected = selectWorkerBehaviorRules(bundle.allRules);

    assert.deepEqual(selected.map((rule) => rule.id), WORKER_BEHAVIOR_RULE_IDS);
  });
});
