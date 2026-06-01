import { buildFileFactsEnvelope, createCapabilities } from './shared.mjs';

export const goAdapter = {
  id: 'go-v1',
  languageId: 'go',
  extensions: ['.go'],
  artifactProfiles: ['go-package'],
  capabilities: createCapabilities({
    syntax: 'structured',
    symbols: true,
    imports: true,
    tests: true,
    semanticChunks: true,
    verificationHints: true,
  }),
  confidence: 'medium',
  fallback: 'plaintext-v1',
  owner: 'work-graph',
};

const PACKAGE_PATTERN = /^package\s+([\w]+)/mu;
const FUNC_PATTERN = /^func\s+(?:\(\s*[\w*\s]+\s+\*?[\w]+\s*\)\s+)?([\w]+)\s*\(/gmu;

export function extractGoFacts(content, context = {}) {
  const filePath = context.filePath ?? '';
  const text = String(content);
  const packageName = text.match(PACKAGE_PATTERN)?.[1] ?? null;
  const imports = [];

  for (const match of text.matchAll(/^import\s+"([^"]+)"/gmu)) {
    imports.push({ module: match[1] });
  }

  for (const match of text.matchAll(/^import\s+\([\s\S]*?\)/gmu)) {
    for (const inner of match[0].matchAll(/"([^"]+)"/gu)) {
      imports.push({ module: inner[1] });
    }
  }

  const symbols = [...text.matchAll(FUNC_PATTERN)].map((match) => ({
    kind: 'function',
    name: match[1],
  }));

  const testHints = filePath.endsWith('_test.go')
    ? [{ kind: 'go-test', commandHint: 'go test ./...' }]
    : symbols.length > 0
      ? [{ kind: 'go-package', commandHint: 'go test ./...' }]
      : [];

  return buildFileFactsEnvelope(goAdapter, filePath, {
    imports,
    symbols,
    testHints,
    domainMetadata: packageName ? { package: packageName } : {},
    chunks: symbols.slice(0, 12).map((symbol) => ({
      ref: `func:${symbol.name}`,
      kind: 'function',
      text: symbol.name,
    })),
  });
}
