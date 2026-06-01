import { createHash } from 'node:crypto';

export const BRACKET_IR_PARSER_ENGINE_VERSION = 'bracket-ir-engine-v1-port-ref';

const BRACKET_PREFIX = /^bracket:\s*/iu;

export function normalizeBracketIrTextForHash(text) {
  let normalized = String(text ?? '').replace(/\r\n/gu, '\n').replace(/\r/gu, '\n');
  normalized = normalized.replace(/[ \t\u00a0]+$/gmu, '');
  return normalized;
}

export function extractBracketBodyForHash(vectorRaw) {
  const trimmed = String(vectorRaw ?? '').trimStart();
  const body = trimmed.replace(BRACKET_PREFIX, '');
  if (trimmed === body) {
    return null;
  }

  return body;
}

export function computeBracketIrVectorHash(bracketBody, options = {}) {
  const normalizedBody = normalizeBracketIrTextForHash(bracketBody);
  const engineVersion = options.engineVersion ?? BRACKET_IR_PARSER_ENGINE_VERSION;
  const vectorHash = createHash('sha256').update(`${normalizedBody}\0${engineVersion}`, 'utf8').digest('hex');

  return { vectorHash, normalizedBody, engineVersion };
}

export function extractBracketVectorFromStepText(stepText) {
  const vectorSection = /(?:^|\n)Вектор:\s*\n([\s\S]*?)(?=\n(?:Цель:|Метки:|критерии_готовности:|Проверки:)|\n#|\s*$)/u.exec(String(stepText ?? ''));
  if (vectorSection === null) {
    return null;
  }

  return extractBracketBodyForHash(vectorSection[1]);
}

export function buildBracketIrTraceSignal(item, options = {}) {
  const storedHash = String(item.labels?.['trace.bracket_ir_hash'] ?? '').trim();
  const stepPath = String(item.labels?.['trace.bracket_ir_step'] ?? item.labels?.['trace.source_step'] ?? '').trim();
  const stepText = options.stepTextByPath?.[stepPath] ?? options.stepText ?? '';
  const bracketBody = extractBracketVectorFromStepText(stepText);

  if (bracketBody === null) {
    return {
      schema: 'bracket-ir.trace-signal.v1',
      workId: item.id,
      stepPath,
      hasBracketSection: false,
      storedHash,
      currentHash: '',
      drift: false,
    };
  }

  const { vectorHash } = computeBracketIrVectorHash(bracketBody, options);
  const drift = storedHash !== '' && storedHash !== vectorHash;

  return {
    schema: 'bracket-ir.trace-signal.v1',
    workId: item.id,
    stepPath,
    hasBracketSection: true,
    storedHash,
    currentHash: vectorHash,
    engineVersion: options.engineVersion ?? BRACKET_IR_PARSER_ENGINE_VERSION,
    drift,
  };
}

export function evaluateBracketIrDrift(item, options = {}) {
  const signal = buildBracketIrTraceSignal(item, options);
  if (!signal.hasBracketSection || !signal.storedHash) {
    return { ok: true, signal, diagnostics: [] };
  }

  if (!signal.drift) {
    return { ok: true, signal, diagnostics: [] };
  }

  return {
    ok: false,
    signal,
    diagnostics: [{
      severity: 'error',
      code: 'bracket_ir.hash_drift',
      message: `WorkItem ${item.id} Bracket IR hash drift detected for ${signal.stepPath || 'unknown step'}.`,
      actionable: 'Re-run compiler round-trip or update trace.bracket_ir_hash after reviewed step edit.',
    }],
  };
}
