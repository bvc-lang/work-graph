import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';

import {
  CANON_LAYOUT_MIGRATION_EVIDENCE_REL,
  CANON_LAYOUT_MIGRATION_SCHEMA,
  migrateRootIntentToDotCanon,
  planRootIntentToDotCanonMigration,
} from '../src/canonLayoutMigration.mjs';
import { CANON_LAYOUT_DOT_CANON } from '../src/canonPaths.mjs';
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';

const SAMPLE_TASK = `#Задача_sample_migrate_task<[
Базис:
  Migration fixture task.
Вектор:
  Verify dot-canon after migrate.
Цель:
  readWorkItemsFromRepo finds sample-migrate-task.

Метки:
  work.id: sample-migrate-task
  work.status: backlog
  atom.profile: work_item
]>
`;

async function createRootIntentFixture(dir) {
  const projectRoot = join(dir, 'project');
  await mkdir(join(projectRoot, '.work-graph'), { recursive: true });
  await mkdir(join(projectRoot, 'intent/system/runtime/work'), { recursive: true });
  await mkdir(join(projectRoot, 'architecture'), { recursive: true });
  await writeFile(join(projectRoot, '.work-graph/config.json'), `${JSON.stringify({
    schema: 'workgraph.project.config.v2',
    projectRoot,
    projectId: 'migrate-fixture',
    label: 'Migrate fixture',
    uiPort: 4177,
    createdAt: '2026-06-05T00:00:00.000Z',
  }, null, 2)}\n`, 'utf8');
  await writeFile(join(projectRoot, 'intent/index.bvc'), `#Index<[
WorkItems:
  - sample-migrate-task: intent/system/runtime/work/sample-migrate-task.work.bvc
]>
`, 'utf8');
  await writeFile(join(projectRoot, 'intent/system/runtime/work/sample-migrate-task.work.bvc'), SAMPLE_TASK, 'utf8');
  await writeFile(join(projectRoot, 'architecture/main.bvc'), '#Architecture_Main<[\n]>\n', 'utf8');
  return projectRoot;
}

describe('canonLayoutMigration', () => {
  it('planRootIntentToDotCanonMigration describes copy targets', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wg-migrate-plan-'));
    try {
      const projectRoot = await createRootIntentFixture(dir);
      const plan = await planRootIntentToDotCanonMigration({ repoRoot: projectRoot });
      assert.equal(plan.toLayout, CANON_LAYOUT_DOT_CANON);
      assert.deepEqual(plan.sourceDirs.map((entry) => entry.dirName), ['intent', 'architecture']);
      assert.equal(plan.nextConfig.canonLayout, CANON_LAYOUT_DOT_CANON);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('migrateRootIntentToDotCanon copies tree, updates config, and writes evidence', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wg-migrate-run-'));
    try {
      const projectRoot = await createRootIntentFixture(dir);
      const dry = await migrateRootIntentToDotCanon({ repoRoot: projectRoot, dryRun: true });
      assert.equal(dry.dryRun, true);
      assert.deepEqual(dry.copiedDirs, ['intent', 'architecture']);

      const result = await migrateRootIntentToDotCanon({ repoRoot: projectRoot });
      assert.equal(result.ok, true);
      assert.equal(result.removedSource, false);

      const config = JSON.parse(await readFile(result.configPath, 'utf8'));
      assert.equal(config.schema, 'workgraph.project.config.v3');
      assert.equal(config.canonLayout, CANON_LAYOUT_DOT_CANON);

      const evidence = JSON.parse(await readFile(result.evidencePath, 'utf8'));
      assert.equal(evidence.schema, CANON_LAYOUT_MIGRATION_SCHEMA);
      assert.deepEqual(evidence.copiedDirs, ['intent', 'architecture']);

      const items = await readWorkItemsFromRepo({ repoRoot: projectRoot });
      assert.deepEqual(items.map((item) => item.id), ['sample-migrate-task']);

      await assert.rejects(
        () => migrateRootIntentToDotCanon({ repoRoot: projectRoot }),
        /already uses canonLayout=dot-canon/u,
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('rejects migration when evidence file already exists', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wg-migrate-evidence-'));
    try {
      const projectRoot = await createRootIntentFixture(dir);
      await mkdir(join(projectRoot, '.work-graph/migration'), { recursive: true });
      await writeFile(join(projectRoot, CANON_LAYOUT_MIGRATION_EVIDENCE_REL), '{}\n', 'utf8');
      await assert.rejects(
        () => planRootIntentToDotCanonMigration({ repoRoot: projectRoot }),
        /migration evidence already exists/u,
      );
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
