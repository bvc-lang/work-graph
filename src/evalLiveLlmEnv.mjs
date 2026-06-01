const DEFAULT_LLM_BASE_URL = 'http://127.0.0.1:1234/v1';

export function resolveLiveLlmEnv(env = process.env) {
  const baseUrl = String(env.IOHASC_LLM_BASE_URL ?? DEFAULT_LLM_BASE_URL).trim().replace(/\/+$/u, '');
  const model = String(env.IOHASC_LLM_MODEL ?? '').trim();
  const apiKey = String(env.IOHASC_LLM_API_KEY ?? '').trim();

  return {
    IOHASC_E2E_REAL_LLM: '1',
    IOHASC_LLM_BASE_URL: baseUrl,
    IOHASC_LLM_MODEL: model,
    IOHASC_LLM_API_KEY: apiKey,
  };
}

export function validateLiveLlmEnv(env = process.env) {
  const errors = [];
  const resolved = resolveLiveLlmEnv(env);
  const baseUrl = String(env.IOHASC_LLM_BASE_URL ?? DEFAULT_LLM_BASE_URL).trim();
  const model = String(env.IOHASC_LLM_MODEL ?? '').trim();

  if (!model) {
    errors.push({
      code: 'missing_model',
      message: 'Set IOHASC_LLM_MODEL to the model id exposed by your OpenAI-compatible server.',
    });
  }

  if (baseUrl !== '' && !/^https?:\/\//iu.test(baseUrl)) {
    errors.push({
      code: 'invalid_base_url',
      message: 'IOHASC_LLM_BASE_URL must be an http(s) URL (example: http://127.0.0.1:1234/v1).',
    });
  }

  return {
    ok: errors.length === 0,
    errors,
    config: resolved,
    hints: {
      powershell: "$env:IOHASC_E2E_REAL_LLM='1'; $env:IOHASC_LLM_BASE_URL='http://127.0.0.1:1234/v1'; $env:IOHASC_LLM_MODEL='your-model'; npm run eval:live-llm",
      bash: "IOHASC_E2E_REAL_LLM=1 IOHASC_LLM_BASE_URL=http://127.0.0.1:1234/v1 IOHASC_LLM_MODEL=your-model npm run eval:live-llm",
    },
  };
}

export function formatLiveLlmEnvHelp(validation = validateLiveLlmEnv()) {
  return [
    'Live LLM eval wrapper (optional Tier B, non-blocking CI)',
    'Runs: worker live-loop (--provider openai) + optional OneBase gate',
    '',
    'Required env:',
    '  IOHASC_LLM_MODEL — model id on OpenAI-compatible proxy (LM Studio / LiteLLM / Ollama OpenAI route)',
    '',
    'Optional env:',
    '  IOHASC_LLM_BASE_URL — default http://127.0.0.1:1234/v1',
    '  IOHASC_LLM_API_KEY — Bearer token when proxy requires auth',
    '  IOHASC_E2E_REAL_LLM=1 — set automatically by this wrapper',
    '',
    'Example:',
    `  ${validation.hints.powershell}`,
  ].join('\n');
}
