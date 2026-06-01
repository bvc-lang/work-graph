import { buildFileFactsEnvelope, createCapabilities } from './shared.mjs';

export const onebaseOsAdapter = {
  id: 'onebase-os-v1',
  languageId: 'onebase-os',
  extensions: ['.os'],
  artifactProfiles: ['onebase-posting-script'],
  capabilities: createCapabilities({
    syntax: 'structured',
    symbols: true,
    domainMetadata: true,
    semanticChunks: true,
    verificationHints: true,
  }),
  confidence: 'medium',
  fallback: 'plaintext-v1',
  owner: 'work-graph',
};

const PROCEDURE_PATTERN = /(?:Процедура|Procedure)\s+([\wА-Яа-яЁё]+)\s*\(/gu;
const MOVEMENT_PATTERN = /Движения\.([\wА-Яа-яЁё]+)/gu;
const FIELD_REF_PATTERN = /(?:Строка|this)\.([\wА-Яа-яЁё]+)/gu;

export function extractOnebaseOsFacts(content, context = {}) {
  const filePath = context.filePath ?? '';
  const text = String(content);
  const procedures = [...text.matchAll(PROCEDURE_PATTERN)].map((match) => match[1]);
  const registers = [...new Set([...text.matchAll(MOVEMENT_PATTERN)].map((match) => match[1]))];
  const documentFields = [...new Set([...text.matchAll(FIELD_REF_PATTERN)].map((match) => match[1]))];

  const symbols = procedures.map((name) => ({ kind: 'procedure', name }));
  const domainMetadata = {
    postingScript: true,
    procedures,
    registers,
    documentFields,
    clearsMovements: /Движения\.[\wА-Яа-яЁё]+\.Очистить\(\)/u.test(text),
  };

  const testHints = [{
    kind: 'onebase-posting',
    commandHint: 'npm run test:optional:onebase',
  }];

  return buildFileFactsEnvelope(onebaseOsAdapter, filePath, {
    symbols,
    domainMetadata,
    testHints,
    chunks: procedures.map((name) => ({
      ref: `procedure:${name}`,
      kind: 'onebase-procedure',
      text: name,
    })),
  });
}
