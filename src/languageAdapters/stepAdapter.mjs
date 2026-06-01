import { parseStepAtomDrafts } from '../stepAtomFormatter.mjs';
import { lintBvcFilePath } from '../bvcFileFormat.mjs';
import { buildFileFactsEnvelope, createCapabilities, lexicalChunks } from './shared.mjs';

export const stepAdapter = {
  id: 'bvc-v1',
  languageId: 'bvc',
  legacyLanguageIds: ['step'],
  extensions: ['.bvc', '.bvc'],
  artifactProfiles: ['bvc-atom', 'step-atom', 'work-item', 'protocol'],
  capabilities: createCapabilities({
    syntax: 'structured',
    symbols: true,
    semanticChunks: true,
    traceLinks: true,
  }),
  confidence: 'high',
  fallback: 'plaintext-v1',
  owner: 'work-graph',
};

export function extractStepFacts(content, context = {}) {
  const filePath = context.filePath ?? '';
  const parsedAtoms = parseStepAtomDrafts(String(content));
  const pathLints = filePath ? lintBvcFilePath(filePath) : [];
  const symbols = [];
  const traceRefs = [];
  const chunks = [];

  for (const parsed of parsedAtoms) {
    const labels = parsed.draft.labels ?? {};
    symbols.push({
      kind: labels['atom.profile'] ?? 'bvc-atom',
      name: parsed.draft.name,
      profile: parsed.draft.profile,
      lang: parsed.draft.lang ?? null,
    });

    if (labels['work.id']) {
      traceRefs.push({ kind: 'work.id', value: labels['work.id'] });
    }

    if (labels['protocol.id']) {
      traceRefs.push({ kind: 'protocol.id', value: labels['protocol.id'] });
    }

    if (labels['rule.id']) {
      traceRefs.push({ kind: 'rule.id', value: labels['rule.id'] });
    }

    chunks.push({
      ref: `atom:${parsed.draft.name}`,
      kind: 'step-atom',
      text: [
        parsed.draft.basis.join(' '),
        parsed.draft.vector.join(' '),
        parsed.draft.goal.join(' '),
      ].filter(Boolean).join('\n'),
    });
  }

  if (chunks.length === 0) {
    chunks.push(...lexicalChunks(content, { maxLines: 24 }));
  }

  const diagnostics = [
    ...pathLints.map((lint) => `${lint.code}: ${lint.message}`),
    ...parsedAtoms.flatMap((parsed) => parsed.errors ?? []),
    ...parsedAtoms.flatMap((parsed) => (parsed.lints ?? []).map((lint) => `${lint.code}: ${lint.message}`)),
  ];

  return buildFileFactsEnvelope(stepAdapter, filePath, {
    symbols,
    traceRefs,
    chunks,
    diagnostics,
  }, {
    status: diagnostics.length > 0 ? 'degraded' : 'ok',
    confidence: diagnostics.length > 0 ? 'medium' : 'high',
  });
}
