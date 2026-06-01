import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatLiveLlmEnvHelp,
  validateLiveLlmEnv,
} from '../src/evalLiveLlmEnv.mjs';

describe('validateLiveLlmEnv', () => {
  it('passes when model and base URL are configured', () => {
    const result = validateLiveLlmEnv({
      IOHASC_LLM_BASE_URL: 'http://127.0.0.1:1234/v1',
      IOHASC_LLM_MODEL: 'qwen-test',
    });

    assert.equal(result.ok, true);
    assert.equal(result.config.IOHASC_E2E_REAL_LLM, '1');
    assert.equal(result.config.IOHASC_LLM_MODEL, 'qwen-test');
    assert.equal(result.config.IOHASC_LLM_BASE_URL, 'http://127.0.0.1:1234/v1');
  });

  it('fails when IOHASC_LLM_MODEL is missing', () => {
    const result = validateLiveLlmEnv({
      IOHASC_LLM_BASE_URL: 'http://127.0.0.1:1234/v1',
    });

    assert.equal(result.ok, false);
    assert.equal(result.errors[0].code, 'missing_model');
  });

  it('fails when base URL is invalid', () => {
    const result = validateLiveLlmEnv({
      IOHASC_LLM_BASE_URL: 'not-a-url',
      IOHASC_LLM_MODEL: 'qwen-test',
    });

    assert.equal(result.ok, false);
    assert.ok(result.errors.some((entry) => entry.code === 'invalid_base_url'));
  });
});

describe('formatLiveLlmEnvHelp', () => {
  it('documents required env vars', () => {
    const help = formatLiveLlmEnvHelp();
    assert.match(help, /IOHASC_LLM_MODEL/);
    assert.match(help, /npm run eval:live-llm/);
  });
});
