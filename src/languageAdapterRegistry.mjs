import { extractGoFacts, goAdapter } from './languageAdapters/goAdapter.mjs';
import { extractJsonYamlFacts, jsonYamlAdapter } from './languageAdapters/jsonYamlAdapter.mjs';
import { extractJsTsFacts, jsTsAdapter } from './languageAdapters/jsTsAdapter.mjs';
import { extractOnebaseOsFacts, onebaseOsAdapter } from './languageAdapters/onebaseOsAdapter.mjs';
import { extractPlaintextFacts, plaintextAdapter } from './languageAdapters/plaintextAdapter.mjs';
import { extensionFromPath } from './languageAdapters/shared.mjs';
import { extractStepFacts, stepAdapter } from './languageAdapters/stepAdapter.mjs';

export const LANGUAGE_ADAPTER_REGISTRY_SCHEMA = 'workgraph.language-adapter-registry.v1';

const ADAPTERS = [
  stepAdapter,
  jsonYamlAdapter,
  jsTsAdapter,
  goAdapter,
  onebaseOsAdapter,
];

const EXTRACTORS = new Map([
  [stepAdapter.id, extractStepFacts],
  [jsonYamlAdapter.id, extractJsonYamlFacts],
  [jsTsAdapter.id, extractJsTsFacts],
  [goAdapter.id, extractGoFacts],
  [onebaseOsAdapter.id, extractOnebaseOsFacts],
  [plaintextAdapter.id, extractPlaintextFacts],
]);

const ADAPTER_BY_ID = new Map([
  ...ADAPTERS.map((adapter) => [adapter.id, adapter]),
  [plaintextAdapter.id, plaintextAdapter],
]);

export function buildLanguageAdapterRegistry() {
  return {
    schema: LANGUAGE_ADAPTER_REGISTRY_SCHEMA,
    adapters: [...ADAPTERS, plaintextAdapter].map(toRegistryRecord),
    fallbackAdapterId: plaintextAdapter.id,
  };
}

export function resolveLanguageAdapter(input = {}) {
  const filePath = String(input.filePath ?? '');
  const languageId = input.languageId ? String(input.languageId) : null;
  const extension = String(input.extension ?? extensionFromPath(filePath)).toLowerCase();

  if (languageId) {
    const byLanguage = ADAPTERS.find((adapter) => adapter.languageId === languageId);
    if (byLanguage) {
      return {
        adapter: byLanguage,
        match: 'languageId',
        extension,
      };
    }
  }

  for (const adapter of ADAPTERS) {
    if (adapter.extensions.includes(extension)) {
      return {
        adapter,
        match: 'extension',
        extension,
      };
    }
  }

  return {
    adapter: plaintextAdapter,
    match: 'fallback',
    extension,
  };
}

export function getAdapterCapabilities(input = {}) {
  const resolved = resolveLanguageAdapter(input);
  return {
    adapterId: resolved.adapter.id,
    languageId: resolved.adapter.languageId,
    extension: resolved.extension,
    match: resolved.match,
    capabilities: { ...resolved.adapter.capabilities },
    confidence: resolved.adapter.confidence,
    fallback: resolved.adapter.fallback,
  };
}

export function extractFileFacts(filePath, content, options = {}) {
  const resolved = resolveLanguageAdapter({
    filePath,
    extension: options.extension,
    languageId: options.languageId,
  });
  const extractor = EXTRACTORS.get(resolved.adapter.id) ?? extractPlaintextFacts;
  const context = {
    filePath,
    extension: resolved.extension,
  };

  try {
    return extractor(content, context);
  } catch (error) {
    const fallback = extractPlaintextFacts(content, context);
    fallback.status = 'degraded';
    fallback.confidence = 'low';
    fallback.adapterId = plaintextAdapter.id;
    fallback.languageId = plaintextAdapter.languageId;
    fallback.diagnostics = [
      ...(fallback.diagnostics ?? []),
      error instanceof Error ? error.message : String(error),
    ];
    return fallback;
  }
}

export function extractFileFactsBatch(entries, options = {}) {
  const facts = (entries ?? []).map((entry) => extractFileFacts(entry.filePath, entry.content, options));
  return {
    schema: 'workgraph.language-file-facts.batch.v1',
    facts,
    summary: {
      total: facts.length,
      degraded: facts.filter((fact) => fact.status === 'degraded').length,
      languages: [...new Set(facts.map((fact) => fact.languageId))].sort(),
    },
  };
}

export function buildTargetFileFactsProjection(readResult) {
  const entries = (readResult?.files ?? [])
    .filter((entry) => entry.ok)
    .map((entry) => ({ filePath: entry.path, content: entry.content }));

  return extractFileFactsBatch(entries);
}

export function formatLanguageFileFactsForPrompt(batch) {
  if (!batch?.facts?.length) {
    return '';
  }

  return batch.facts.map((fact) => {
    const symbolNames = fact.symbols.slice(0, 8).map((symbol) => symbol.name).join(', ');
    const importNames = fact.imports.slice(0, 6).map((entry) => entry.module).join(', ');
    const domainSummary = Object.entries(fact.domainMetadata ?? {})
      .filter(([, value]) => value !== null && value !== undefined && value !== '')
      .slice(0, 6)
      .map(([key, value]) => `${key}=${Array.isArray(value) ? value.join('|') : value}`)
      .join('; ');

    return [
      `# facts:${fact.filePath}`,
      `adapter=${fact.adapterId} language=${fact.languageId} status=${fact.status} confidence=${fact.confidence}`,
      symbolNames ? `symbols: ${symbolNames}` : '',
      importNames ? `imports: ${importNames}` : '',
      domainSummary ? `domain: ${domainSummary}` : '',
    ].filter(Boolean).join('\n');
  }).join('\n\n');
}

function toRegistryRecord(adapter) {
  return {
    id: adapter.id,
    languageId: adapter.languageId,
    extensions: [...adapter.extensions],
    artifactProfiles: [...adapter.artifactProfiles],
    capabilities: { ...adapter.capabilities },
    confidence: adapter.confidence,
    fallback: adapter.fallback,
    owner: adapter.owner,
  };
}

export {
  goAdapter,
  jsonYamlAdapter,
  jsTsAdapter,
  onebaseOsAdapter,
  plaintextAdapter,
  stepAdapter,
};
