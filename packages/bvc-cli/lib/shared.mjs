export const LANGUAGE_FILE_FACTS_SCHEMA = 'workgraph.language-file-facts.v1';

export function createCapabilities(partial = {}) {
  return {
    syntax: partial.syntax ?? 'none',
    symbols: Boolean(partial.symbols),
    imports: Boolean(partial.imports),
    tests: Boolean(partial.tests),
    semanticChunks: Boolean(partial.semanticChunks),
    domainMetadata: Boolean(partial.domainMetadata),
    traceLinks: Boolean(partial.traceLinks),
    verificationHints: Boolean(partial.verificationHints),
  };
}

export function buildFileFactsEnvelope(adapter, filePath, payload, options = {}) {
  return {
    schema: LANGUAGE_FILE_FACTS_SCHEMA,
    filePath,
    languageId: adapter.languageId,
    adapterId: adapter.id,
    status: options.status ?? 'ok',
    confidence: options.confidence ?? adapter.confidence,
    capabilities: { ...adapter.capabilities },
    symbols: payload.symbols ?? [],
    imports: payload.imports ?? [],
    chunks: payload.chunks ?? [],
    domainMetadata: payload.domainMetadata ?? {},
    testHints: payload.testHints ?? [],
    traceRefs: payload.traceRefs ?? [],
    diagnostics: payload.diagnostics ?? [],
  };
}

export function lexicalChunks(content, options = {}) {
  const lines = String(content).split(/\r?\n/u);
  const maxLines = options.maxLines ?? 40;
  const chunks = [];

  for (let index = 0; index < lines.length; index += maxLines) {
    const slice = lines.slice(index, index + maxLines);
    chunks.push({
      ref: `lines:${index + 1}-${index + slice.length}`,
      kind: 'lexical',
      text: slice.join('\n'),
    });
  }

  if (chunks.length === 0) {
    chunks.push({ ref: 'lines:1-1', kind: 'lexical', text: '' });
  }

  return chunks;
}

export function extensionFromPath(filePath) {
  const normalized = String(filePath ?? '').replace(/\\/gu, '/');
  const index = normalized.lastIndexOf('.');
  if (index === -1) {
    return '';
  }

  return normalized.slice(index).toLowerCase();
}

export function basenameFromPath(filePath) {
  return String(filePath ?? '').replace(/\\/gu, '/').split('/').pop() ?? '';
}
