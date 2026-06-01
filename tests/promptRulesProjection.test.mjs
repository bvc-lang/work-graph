import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  buildPromptRuleProjectionEntry,
  buildPromptRulesProjection,
  collectStepFilePaths,
} from '../src/promptRulesProjection.mjs';
import { parseStepAtomDrafts } from '../src/stepAtomFormatter.mjs';

const SAMPLE_PROMPT_RULE = `#Правило_Пример<[
Базис:
  Example basis.
Вектор:
  Example vector.
Цель:
  Example goal.

Метки:
  atom.profile: prompt_rule
  rule.id: example-rule
  trace.status: verified
]>
`;

const SAMPLE_MIXED_FILE = `${SAMPLE_PROMPT_RULE}

#Задача_not_prompt<[
Базис:
  Not a prompt rule.
Вектор:
  Skip.
Цель:
  Skip.

Метки:
  atom.profile: work_item
  work.id: skip-me
]>
`;

describe('buildPromptRulesProjection', () => {
  it('collects prompt_rule atoms from protocols and rules only', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-prompt-rules-'));

    try {
      await mkdir(join(cwd, 'protocols'), { recursive: true });
      await mkdir(join(cwd, 'rules', 'agent-behavior'), { recursive: true });
      await writeFile(join(cwd, 'protocols', 'sample.bvc'), SAMPLE_MIXED_FILE, 'utf8');
      await writeFile(join(cwd, 'rules', 'agent-behavior', 'rebuild.bvc'), SAMPLE_PROMPT_RULE, 'utf8');

      const filePaths = await collectStepFilePaths(cwd);
      assert.deepEqual(filePaths, [
        'protocols/sample.bvc',
        'rules/agent-behavior/rebuild.bvc',
      ]);

      const projection = await buildPromptRulesProjection({ cwd, filePaths });

      assert.equal(projection.schema, 'workgraph.prompt-rules-projection.v1');
      assert.equal(projection.summary.total, 2);
      assert.equal(projection.summary.valid, 2);
      assert.equal(projection.rules.length, 2);
      assert.equal(projection.rules[0].id, 'example-rule');
      assert.equal(projection.rules[0].validationStatus, 'valid');
      assert.equal(projection.rules[0].basis, 'Example basis.');
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('filters projection by rule id', async () => {
    const parsed = parseStepAtomDrafts(SAMPLE_PROMPT_RULE)[0];
    const entry = buildPromptRuleProjectionEntry('rules/example.bvc', parsed);

    const projection = await buildPromptRulesProjection({
      cwd: process.cwd(),
      filePaths: ['rules/example.bvc'],
      fileContents: {
        'rules/example.bvc': SAMPLE_PROMPT_RULE,
      },
      ruleId: entry.id,
    });

    assert.equal(projection.summary.filtered, 1);
    assert.equal(projection.rules[0].id, 'example-rule');
  });
});
