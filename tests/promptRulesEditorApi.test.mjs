import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';

import {
  isPromptRulesEditorPathAllowed,
  readPromptRuleSource,
  savePromptRuleSource,
  validatePromptRuleSourceText,
} from '../src/promptRulesEditorApi.mjs';

const SAMPLE_RULE = `#Правило_Test_Editor<[
Базис:
  Test basis.
Вектор:
  Test vector.
Цель:
  Test goal.

Метки:
  atom.profile: prompt_rule
  rule.id: test-editor-rule
  trace.status: verified
]>
`;

describe('promptRulesEditorApi', () => {
  it('allows only rules/agent-behavior paths', () => {
    assert.equal(isPromptRulesEditorPathAllowed('rules/agent-behavior/sample.bvc'), true);
    assert.equal(isPromptRulesEditorPathAllowed('protocols/foo.bvc'), false);
  });

  it('validates and saves bounded prompt rule source', async () => {
    const cwd = await mkdtemp(join(tmpdir(), 'wg-prompt-editor-'));
    const filePath = 'rules/agent-behavior/test-editor.bvc';
    const absolutePath = join(cwd, filePath);

    try {
      await mkdir(join(cwd, 'rules/agent-behavior'), { recursive: true });
      await writeFile(absolutePath, SAMPLE_RULE, 'utf8');

      const validation = validatePromptRuleSourceText(SAMPLE_RULE);
      assert.equal(validation.ok, true);

      const source = await readPromptRuleSource({ cwd, ruleId: 'test-editor-rule' });
      assert.equal(source.ruleId, 'test-editor-rule');
      assert.match(source.sourceText, /test-editor-rule/u);

      const updated = SAMPLE_RULE.replace('Test basis.', 'Updated basis.');
      const saveResult = await savePromptRuleSource({ cwd, filePath, sourceText: updated });
      assert.equal(saveResult.ok, true);
      assert.match(await readFile(absolutePath, 'utf8'), /Updated basis./u);
    } finally {
      await rm(cwd, { recursive: true, force: true });
    }
  });

  it('rejects invalid source without persist', async () => {
    const result = await savePromptRuleSource({
      cwd: process.cwd(),
      filePath: 'rules/agent-behavior/broken.bvc',
      sourceText: '#Broken<[',
      persist: false,
    });

    assert.equal(result.ok, false);
    assert.equal(result.error, 'validation_failed');
  });
});
