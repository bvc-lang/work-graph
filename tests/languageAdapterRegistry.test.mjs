import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import {
  buildLanguageAdapterRegistry,
  extractFileFacts,
  extractFileFactsBatch,
  formatLanguageFileFactsForPrompt,
  getAdapterCapabilities,
  resolveLanguageAdapter,
} from '../src/languageAdapterRegistry.mjs';

const SAMPLE_STEP = `#Задача_sample<[
Базис:
  Basis.
Вектор:
  Vector.
Цель:
  Goal.

Метки:
  atom.profile: work_item
  work.id: sample-task
]>
`;

const SAMPLE_GO = `package trade

import "testing"

func GrossProfit(t *testing.T) {
}
`;

describe('buildLanguageAdapterRegistry', () => {
  it('lists MVP adapters plus plaintext fallback', () => {
    const registry = buildLanguageAdapterRegistry();

    assert.equal(registry.schema, 'workgraph.language-adapter-registry.v1');
    assert.equal(registry.fallbackAdapterId, 'plaintext-v1');
    assert.ok(registry.adapters.some((adapter) => adapter.id === 'bvc-v1'));
    assert.ok(registry.adapters.some((adapter) => adapter.id === 'onebase-os-v1'));
  });
});

describe('resolveLanguageAdapter', () => {
  it('resolves by extension and falls back to plaintext', () => {
    assert.equal(resolveLanguageAdapter({ filePath: 'work/backlog.bvc' }).adapter.id, 'bvc-v1');
    assert.equal(resolveLanguageAdapter({ filePath: 'protocols/rule.bvc' }).adapter.id, 'bvc-v1');
    assert.equal(resolveLanguageAdapter({ filePath: 'src/foo.ts' }).adapter.id, 'js-ts-v1');
    assert.equal(resolveLanguageAdapter({ filePath: 'README.unknown' }).adapter.id, 'plaintext-v1');
  });

  it('returns capabilities without throwing for unknown extension', () => {
    const caps = getAdapterCapabilities({ filePath: 'notes.txt' });

    assert.equal(caps.adapterId, 'plaintext-v1');
    assert.equal(caps.capabilities.semanticChunks, true);
    assert.equal(caps.capabilities.symbols, false);
  });
});

describe('extractFileFacts', () => {
  it('extracts step atoms and trace refs', () => {
    const facts = extractFileFacts('work/backlog.bvc', SAMPLE_STEP);

    assert.equal(facts.languageId, 'bvc');
    assert.equal(facts.symbols.length, 1);
    assert.ok(facts.traceRefs.some((ref) => ref.value === 'sample-task'));
  });

  it('extracts go package, imports and test hints', () => {
    const facts = extractFileFacts('internal/project/trade_gross_profit_test.go', SAMPLE_GO);

    assert.equal(facts.languageId, 'go');
    assert.equal(facts.domainMetadata.package, 'trade');
    assert.ok(facts.imports.some((entry) => entry.module === 'testing'));
    assert.ok(facts.testHints.length >= 1);
  });

  it('extracts onebase yaml document metadata from fixture', async () => {
    const filePath = 'tests/fixtures/onebase/documents/РеализацияТоваров.yaml';
    const content = await readFile(join(process.cwd(), filePath), 'utf8');
    const facts = extractFileFacts(filePath, content);

    assert.equal(facts.domainMetadata.artifactKind, 'document');
    assert.equal(facts.domainMetadata.name, 'РеализацияТоваров');
    assert.equal(facts.domainMetadata.posting, 'true');
    assert.ok(facts.symbols.some((symbol) => symbol.name === 'РеализацияТоваров'));
  });

  it('extracts onebase posting script facts from fixture', async () => {
    const filePath = 'tests/fixtures/onebase/src/РеализацияТоваров.posting.os';
    const content = await readFile(join(process.cwd(), filePath), 'utf8');
    const facts = extractFileFacts(filePath, content);

    assert.equal(facts.languageId, 'onebase-os');
    assert.ok(facts.domainMetadata.registers.includes('ОстаткиТоваров'));
    assert.ok(facts.symbols.some((symbol) => symbol.name === 'ОбработкаПроведения'));
    assert.equal(facts.domainMetadata.clearsMovements, true);
  });

  it('degrades to plaintext for unknown extensions in batch projection', () => {
    const batch = extractFileFactsBatch([
      { filePath: 'notes/readme.txt', content: 'plain notes' },
      { filePath: 'src/a.mjs', content: 'export function ok() {}' },
    ]);

    assert.equal(batch.summary.total, 2);
    assert.equal(batch.facts[0].adapterId, 'plaintext-v1');
    assert.equal(batch.facts[1].adapterId, 'js-ts-v1');
    assert.ok(formatLanguageFileFactsForPrompt(batch).includes('facts:src/a.mjs'));
  });
});
