import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';

export const MATRIX_DONE_TASK = `#Задача_matrix_done<[
Базис:
  Done dependency for matrix scenarios.
Вектор:
  Done.
Цель:
  Unblock matrix-ready.

Свидетельства:
  fixture.

Метки:
  atom.profile: work_item
  migration.strategy: rebuild
  work.id: matrix-done
  work.title: Matrix done task
  work.status: done
  trace.status: verified
]>`;

export const MATRIX_READY_TASK = `#Задача_matrix_ready<[
Базис:
  Ready task for MCP agent scenario matrix W1–W4.
Вектор:
  Claim, evidence, semantic_search flows.
Цель:
  Regression gate for stdio MCP.
Анализ:
  Fixture analysis
Решение:
  Verdict: useful

Метки:
  atom.profile: work_item
  migration.strategy: rebuild
  work.id: matrix-ready
  work.title: Matrix ready task
  work.status: ready
  work.owner_role: engineer
  work.department: agent-platform
  work.depends_on: matrix-done
  work.target_files: e2e/workgraph-agent-matrix.json, packages/workgraph-mcp/src/handlers.mjs
  work.decision.verdict: useful
  trace.status: pending
]>`;

export async function createWorkgraphMcpScenarioFixture() {
  const root = await mkdtemp(join(tmpdir(), 'wg-agent-matrix-'));
  const base = join(root, 'intent/system/runtime/work');
  await mkdir(base, { recursive: true });
  await writeFile(join(root, 'intent/index.bvc'), `#Индекс<[
WorkItems:
  - matrix-done: intent/system/runtime/work/matrix-done.work.bvc
  - matrix-ready: intent/system/runtime/work/matrix-ready.work.bvc
Метки:
  atom.profile: trace
  trace.status: pending
]>
`, 'utf8');
  await writeFile(join(base, 'matrix-done.work.bvc'), MATRIX_DONE_TASK, 'utf8');
  await writeFile(join(base, 'matrix-ready.work.bvc'), MATRIX_READY_TASK, 'utf8');
  return root;
}

export function parseMcpToolJsonResult(toolResult) {
  const text = toolResult.content?.[0]?.text ?? '';
  return JSON.parse(text);
}
