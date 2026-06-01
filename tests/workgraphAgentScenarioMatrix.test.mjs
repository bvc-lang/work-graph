import assert from 'node:assert/strict';
import { readFile, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';

import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

import {
  createWorkgraphMcpScenarioFixture,
  parseMcpToolJsonResult,
} from './fixtures/workgraphMcpScenarioFixture.mjs';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const serverEntry = join(repoRoot, 'packages/workgraph-mcp/src/index.mjs');
const matrixPath = join(repoRoot, 'e2e/workgraph-agent-matrix.json');

describe('workgraph agent scenario matrix', () => {
  it('matrix JSON defines at least three stdio scenarios', async () => {
    const matrix = JSON.parse(await readFile(matrixPath, 'utf8'));
    assert.equal(matrix.schema, 'workgraph.agent-scenario-matrix.v1');
    assert.ok(matrix.scenarios.length >= 3);
  });

  it('runs W1–W4 MCP stdio scenarios green', async () => {
    const matrix = JSON.parse(await readFile(matrixPath, 'utf8'));
    const root = await createWorkgraphMcpScenarioFixture();
    let client;

    try {
      const transport = new StdioClientTransport({
        command: process.execPath,
        args: [serverEntry],
        env: { ...process.env, WORKGRAPH_ROOT: root },
        stderr: 'pipe',
      });

      client = new Client({ name: 'workgraph-matrix-client', version: '1.0.0' });
      await client.connect(transport);

      for (const scenario of matrix.scenarios) {
        const result = await client.callTool({
          name: scenario.tool,
          arguments: scenario.arguments ?? {},
        });
        const payload = parseMcpToolJsonResult(result);
        assertScenario(scenario, payload);
      }
    } finally {
      if (client) {
        await client.close();
      }
      await rm(root, { recursive: true, force: true });
    }
  });
});

function assertScenario(scenario, payload) {
  if (scenario.expectSchema) {
    assert.equal(payload.schema, scenario.expectSchema, `${scenario.id} schema`);
  }

  if (scenario.expectReadyQueue) {
    assert.deepEqual(payload.readyQueue, scenario.expectReadyQueue, `${scenario.id} readyQueue`);
  }

  if (scenario.expectField && scenario.expectValue !== undefined) {
    assert.equal(payload[scenario.expectField], scenario.expectValue, `${scenario.id} ${scenario.expectField}`);
  }

  if (scenario.expectField && scenario.expectMin !== undefined) {
    assert.ok(Number(payload[scenario.expectField]) >= scenario.expectMin, `${scenario.id} ${scenario.expectField}`);
  }

  if (scenario.expectHitWorkId) {
    assert.ok(
      Array.isArray(payload.hits) && payload.hits.some((hit) => hit.workId === scenario.expectHitWorkId),
      `${scenario.id} hit ${scenario.expectHitWorkId}`,
    );
  }
}
