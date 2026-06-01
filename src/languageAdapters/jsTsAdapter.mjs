import { buildFileFactsEnvelope, createCapabilities } from './shared.mjs';

export const jsTsAdapter = {
  id: 'js-ts-v1',
  languageId: 'typescript',
  extensions: ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'],
  artifactProfiles: ['javascript-module'],
  capabilities: createCapabilities({
    syntax: 'structured',
    symbols: true,
    imports: true,
    tests: true,
    semanticChunks: true,
  }),
  confidence: 'medium',
  fallback: 'plaintext-v1',
  owner: 'work-graph',
};

const IMPORT_PATTERN = /^\s*import\s+(?:type\s+)?(?:[\w*{}\s,$]+\s+from\s+)?['"]([^'"]+)['"]/gmu;
const EXPORT_PATTERN = /^\s*export\s+(?:async\s+)?(?:function|class|const|let|var|type|interface)\s+([\w$]+)/gmu;
const FUNCTION_PATTERN = /^\s*(?:export\s+)?(?:async\s+)?function\s+([\w$]+)/gmu;
const TEST_HINT_PATTERN = /\.(?:test|spec)\.(?:js|mjs|cjs|ts|tsx)$/iu;

export function extractJsTsFacts(content, context = {}) {
  const filePath = context.filePath ?? '';
  const text = String(content);
  const imports = [...text.matchAll(IMPORT_PATTERN)].map((match) => ({ module: match[1] }));
  const symbols = [];
  const seen = new Set();

  for (const pattern of [EXPORT_PATTERN, FUNCTION_PATTERN]) {
    for (const match of text.matchAll(pattern)) {
      const name = match[1];
      if (seen.has(name)) {
        continue;
      }

      seen.add(name);
      symbols.push({ kind: 'declaration', name });
    }
  }

  const testHints = TEST_HINT_PATTERN.test(filePath)
    ? [{ kind: 'test-file', commandHint: 'npm run test:deterministic' }]
    : text.includes('describe(') || text.includes('it(')
      ? [{ kind: 'test-suite', commandHint: 'npm run test:deterministic' }]
      : [];

  return buildFileFactsEnvelope(jsTsAdapter, filePath, {
    imports,
    symbols,
    testHints,
    chunks: symbols.slice(0, 12).map((symbol) => ({
      ref: `symbol:${symbol.name}`,
      kind: 'declaration',
      text: symbol.name,
    })),
  });
}
