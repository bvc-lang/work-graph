import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { lintBacklogItems, lintBacklogFile } from '../src/backlogSchemaLint.mjs';
import { readWorkItemsFromIntentTree } from '../src/intentTreeWorkItems.mjs';

describe('lintBacklogItems', () => {
  it('reports duplicate ids and missing dependencies', () => {
    const report = lintBacklogItems([
      { id: 'a', status: 'ready', dependsOn: ['missing'], nextAction: 'go' },
      { id: 'a', status: 'backlog', dependsOn: [], nextAction: 'dup' },
      { id: 'b', status: 'invalid-status', dependsOn: [], nextAction: 'x' },
    ]);

    assert.equal(report.ok, false);
    assert.ok(report.issues.some((issue) => issue.code === 'duplicate_work_id'));
    assert.ok(report.issues.some((issue) => issue.code === 'missing_dependency'));
    assert.ok(report.issues.some((issue) => issue.code === 'invalid_status'));
  });

  it('passes valid minimal backlog items', () => {
    const report = lintBacklogItems([
      {
        id: 'done-a',
        status: 'done',
        dependsOn: [],
        evidence: ['ok'],
        nextAction: '',
        labels: { 'migration.strategy': 'rebuild' },
      },
      {
        id: 'ready-b',
        status: 'ready',
        dependsOn: ['done-a'],
        evidence: [],
        nextAction: 'implement',
        labels: { 'migration.strategy': 'port' },
      },
    ]);

    assert.equal(report.ok, true);
    assert.equal(report.errorCount, 0);
  });

  it('reports missing and invalid migration.strategy labels', () => {
    const missing = lintBacklogItems([
      { id: 'no-strategy', status: 'backlog', dependsOn: [], nextAction: 'go', labels: {} },
    ]);
    assert.equal(missing.ok, false);
    assert.ok(missing.issues.some((issue) => issue.code === 'missing_migration_strategy'));

    const invalid = lintBacklogItems([
      {
        id: 'bad-strategy',
        status: 'backlog',
        dependsOn: [],
        nextAction: 'go',
        labels: { 'migration.strategy': 'copy' },
      },
    ]);
    assert.equal(invalid.ok, false);
    assert.ok(invalid.issues.some((issue) => issue.code === 'invalid_migration_strategy'));
  });

  it('lints the repository backlog without schema errors', async () => {
    const report = await lintBacklogFile();
    assert.equal(report.ok, true, report.issues.filter((issue) => issue.severity === 'error').map((issue) => issue.message).join('; '));
  });
});

describe('repository backlog parse + lint', () => {
  it('parses intent tree and produces lint report v1', async () => {
    const items = await readWorkItemsFromIntentTree();
    const report = lintBacklogItems(items);

    assert.equal(report.schema, 'workgraph.backlog.lint.v1');
    assert.ok(items.length >= 80);
  });
});
