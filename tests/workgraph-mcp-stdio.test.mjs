import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const serverEntry = join(repoRoot, 'packages/workgraph-mcp/src/index.mjs');

const READY_TASK = `#Задача_stdio_ready<[
Базис:
  Ready for stdio MCP.
Вектор:
  Stdio transport.
Цель:
  MCP roundtrip.

Метки:
  atom.profile: work_item
  work.id: stdio-ready
  work.title: Stdio ready task
  work.status: ready
  work.owner_role: engineer
  work.department: agent-platform
  work.depends_on: stdio-done
  trace.status: pending
]>`;

const DONE_TASK = `#Задача_stdio_done<[
Базис:
  Done dependency.
Вектор:
  Done.
Цель:
  Unblock ready.

Свидетельства:
  done.

Метки:
  atom.profile: work_item
  work.id: stdio-done
  work.title: Stdio done task
  work.status: done
  trace.status: verified
]>`;

describe('workgraph MCP stdio integration', () => {
  it('lists tools and calls get_current_cycle over stdio transport', async () => {
    const root = await createFixture();
    let client;

    try {
      const transport = new StdioClientTransport({
        command: process.execPath,
        args: [serverEntry],
        env: {
          ...process.env,
          WORKGRAPH_ROOT: root,
        },
        stderr: 'pipe',
      });

      client = new Client({ name: 'workgraph-test-client', version: '1.0.0' });
      await client.connect(transport);

      const tools = await client.listTools();
      const toolNames = tools.tools.map((tool) => tool.name);
      assert.ok(toolNames.includes('get_current_cycle'));
      assert.ok(toolNames.includes('get_promote_ready_queue'));
      assert.ok(toolNames.includes('semantic_search'));
      assert.ok(toolNames.includes('get_intent_hierarchy'));
      assert.ok(toolNames.includes('get_pvrg_task_scope'));
      assert.ok(toolNames.includes('get_graph_rag_context'));
      assert.ok(toolNames.includes('list_memory_records'));
      assert.ok(toolNames.includes('list_evidence_records'));
      assert.ok(toolNames.includes('get_step_graph_slice'));

      const cycleResult = await client.callTool({ name: 'get_current_cycle', arguments: {} });
      const cycleText = cycleResult.content?.[0]?.text ?? '';
      const cycle = JSON.parse(cycleText);
      assert.equal(cycle.schema, 'workgraph.current-cycle.v1');
      assert.deepEqual(cycle.readyQueue, ['stdio-ready']);
    } finally {
      if (client) {
        await client.close();
      }
      await rm(root, { recursive: true, force: true });
    }
  });
});

async function createFixture() {
  const root = await mkdtemp(join(tmpdir(), 'wg-mcp-stdio-'));
  const base = join(root, 'intent/system/runtime/work');
  await mkdir(base, { recursive: true });
  await writeFile(join(root, 'intent/index.bvc'), `#Индекс<[
WorkItems:
  - stdio-done: intent/system/runtime/work/stdio-done.work.bvc
  - stdio-ready: intent/system/runtime/work/stdio-ready.work.bvc
Метки:
  atom.profile: trace
  trace.status: pending
]>
`, 'utf8');
  await writeFile(join(base, 'stdio-done.work.bvc'), DONE_TASK, 'utf8');
  await writeFile(join(base, 'stdio-ready.work.bvc'), READY_TASK, 'utf8');
  return root;
}
