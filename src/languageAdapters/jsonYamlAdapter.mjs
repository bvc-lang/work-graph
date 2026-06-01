import { basenameFromPath, buildFileFactsEnvelope, createCapabilities } from './shared.mjs';

export const jsonYamlAdapter = {
  id: 'json-yaml-v1',
  languageId: 'yaml',
  extensions: ['.json', '.yaml', '.yml'],
  artifactProfiles: ['structured-metadata', 'onebase-yaml'],
  capabilities: createCapabilities({
    syntax: 'structured',
    symbols: true,
    domainMetadata: true,
    semanticChunks: true,
  }),
  confidence: 'medium',
  fallback: 'plaintext-v1',
  owner: 'work-graph',
};

export function extractJsonYamlFacts(content, context = {}) {
  const filePath = context.filePath ?? '';
  const extension = context.extension ?? '';
  const text = String(content);
  const domainMetadata = inferOnebaseYamlMetadata(filePath, text);
  const symbols = [];

  if (domainMetadata.name) {
    symbols.push({
      kind: 'artifact',
      name: domainMetadata.name,
      profile: domainMetadata.artifactKind ?? 'yaml',
    });
  }

  for (const field of domainMetadata.fields ?? []) {
    symbols.push({ kind: 'field', name: field.name, type: field.type ?? 'unknown' });
  }

  if (extension === '.json') {
    try {
      const parsed = JSON.parse(text);
      domainMetadata.jsonKeys = parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? Object.keys(parsed).sort()
        : [];
    } catch (error) {
      return buildFileFactsEnvelope(jsonYamlAdapter, filePath, {
        symbols,
        domainMetadata,
        diagnostics: [error instanceof Error ? error.message : String(error)],
        chunks: [{ ref: 'json:invalid', kind: 'json', text: text.slice(0, 500) }],
      }, { status: 'degraded', confidence: 'low' });
    }
  }

  return buildFileFactsEnvelope(jsonYamlAdapter, filePath, {
    symbols,
    domainMetadata,
    chunks: [{
      ref: 'metadata:summary',
      kind: 'yaml-metadata',
      text: summarizeYamlMetadata(domainMetadata),
    }],
  });
}

function inferOnebaseYamlMetadata(filePath, text) {
  const normalizedPath = String(filePath).replace(/\\/gu, '/').toLowerCase();
  const artifactKind = normalizedPath.includes('/catalogs/')
    ? 'catalog'
    : normalizedPath.includes('/documents/')
      ? 'document'
      : normalizedPath.includes('/reports/')
        ? 'report'
        : normalizedPath.includes('/widgets/')
          ? 'widget'
          : normalizedPath.includes('/registers/')
            ? 'register'
            : 'yaml';

  const nameMatch = text.match(/^name:\s*(.+)$/mu);
  const postingMatch = text.match(/^posting:\s*(.+)$/mu);
  const fields = [...text.matchAll(/-\s*\{\s*name:\s*([^,]+),\s*type:\s*([^}]+)\}/gu)]
    .map((match) => ({ name: match[1].trim(), type: match[2].trim() }));

  return {
    artifactKind,
    basename: basenameFromPath(filePath),
    name: nameMatch?.[1]?.trim() ?? null,
    posting: postingMatch?.[1]?.trim() ?? null,
    fields,
    hierarchical: /^hierarchical:\s*true/mu.test(text),
  };
}

function summarizeYamlMetadata(metadata) {
  const parts = [
    metadata.artifactKind ? `kind=${metadata.artifactKind}` : '',
    metadata.name ? `name=${metadata.name}` : '',
    metadata.posting ? `posting=${metadata.posting}` : '',
    metadata.fields?.length ? `fields=${metadata.fields.length}` : '',
  ].filter(Boolean);

  return parts.join(' ');
}
