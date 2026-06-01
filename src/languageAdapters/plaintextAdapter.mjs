import {
  basenameFromPath,
  buildFileFactsEnvelope,
  createCapabilities,
  lexicalChunks,
} from './shared.mjs';

export const plaintextAdapter = {
  id: 'plaintext-v1',
  languageId: 'plaintext',
  extensions: ['*'],
  artifactProfiles: ['generic-file'],
  capabilities: createCapabilities({
    syntax: 'lexical',
    semanticChunks: true,
  }),
  confidence: 'low',
  fallback: null,
  owner: 'work-graph',
};

export function extractPlaintextFacts(content, context = {}) {
  const filePath = context.filePath ?? '';
  const extension = context.extension ?? '';

  return buildFileFactsEnvelope(plaintextAdapter, filePath, {
    chunks: lexicalChunks(content),
    domainMetadata: {
      extension,
      basename: basenameFromPath(filePath),
      byteLength: Buffer.byteLength(String(content), 'utf8'),
    },
  }, {
    confidence: 'low',
  });
}
