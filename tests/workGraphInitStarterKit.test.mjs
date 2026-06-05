import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { loadArchitectureL1Canon } from '../src/architectureL1Canon.mjs';
import { materializeStarterKitForProject } from '../src/workGraphInitStarterKit.mjs';
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';

const cliModuleUrl = new URL('../packages/work-graph-cli/bin/work-graph.mjs', import.meta.url).href;

describe('workGraphInitStarterKit', () => {
  it('materializes demo canon, task and analytics into a fresh project', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'wg-starter-kit-'));
    const projectRoot = join(dir, 'project');
    try {
      const starterKit = materializeStarterKitForProject({
        cliModuleUrl,
        canonTreeRoot: projectRoot,
        projectRoot,
      });

      assert.equal(starterKit.schema, 'workgraph.init-starter-kit.v1');
      assert.ok(starterKit.files.some((entry) => entry.relativePath === 'architecture/main.bvc' && entry.written));
      assert.ok(starterKit.files.some((entry) => entry.relativePath === 'intent/demo/starter-sample-task.work.bvc' && entry.written));

      const canon = loadArchitectureL1Canon(projectRoot);
      assert.equal(canon.blocks.length, 7);

      const items = await readWorkItemsFromRepo({ repoRoot: projectRoot });
      assert.ok(items.some((item) => item.id === 'starter-sample-task'));

      const analyticsJournal = await readFile(join(projectRoot, 'work/analytics-records.jsonl'), 'utf8');
      assert.match(analyticsJournal, /AN-DEMO-1/);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
