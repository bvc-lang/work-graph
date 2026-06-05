import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatPromptRuleValidationBadgeLabel,
  resolvePromptRuleValidationBadgeTone,
} from '../src/ui/promptRuleRowBadge.mjs';

describe('promptRuleRowBadge', () => {
  it('maps valid rules to ok badge label and tone', () => {
    const rule = { validationStatus: 'valid' };
    assert.equal(formatPromptRuleValidationBadgeLabel(rule), 'VALID');
    assert.equal(resolvePromptRuleValidationBadgeTone(rule), 'ok');
  });

  it('maps invalid rules to danger badge label and tone', () => {
    const rule = { validationStatus: 'invalid' };
    assert.equal(formatPromptRuleValidationBadgeLabel(rule), 'INVALID');
    assert.equal(resolvePromptRuleValidationBadgeTone(rule), 'danger');
  });
});
