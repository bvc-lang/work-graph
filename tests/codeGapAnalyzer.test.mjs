import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';

import { analyzeCodeGaps } from '../src/codeGapAnalyzer.mjs';
import { buildCodeGapBacklogFeed } from '../src/codeGapBacklogFeeder.mjs';

const fixtureRoot = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'code-gap-mini-repo');

describe('analyzeCodeGaps', () => {
  it('detects missing implementation, orphaned tur and untracked export on fixture repo', () => {
    const report = analyzeCodeGaps({
      repoRoot: fixtureRoot,
      codeRelDirs: ['src'],
      stepSearchRelDirs: ['steps'],
    });

    assert.equal(report.schema, 'code-gap.report.v1');
    assert.ok(report.summary.total >= 3);
    assert.ok(report.entries.some((entry) => entry.kind === 'missing_implementation'));
    assert.ok(report.entries.some((entry) => entry.kind === 'orphaned_tur'));
    assert.ok(report.entries.some((entry) => entry.kind === 'untracked_export' && entry.symbol === 'untrackedExport'));
  });

  it('feeds backlog suggestions compatible with code-gap.report.v1 fixture shape', () => {
    const report = analyzeCodeGaps({
      repoRoot: fixtureRoot,
      codeRelDirs: ['src'],
      stepSearchRelDirs: ['steps'],
    });
    const feed = buildCodeGapBacklogFeed(report);

    assert.equal(feed.schema, 'code-gap.backlog-feed.v1');
    assert.ok(feed.suggestionCount >= 1);
    assert.equal(feed.suggestions[0].provenance.source, 'code-gap-analyzer');
  });
});
