import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  ARCHITECTURE_L1_BLOCK_COUNT,
  ARCHITECTURE_L1_CANON_ID,
  loadArchitectureL1Canon,
  parseArchitectureL1CanonContent,
  validateArchitectureL1Canon,
} from '../src/architectureL1Canon.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '..');
const canonPath = path.join(repoRoot, 'architecture/main.bvc');

describe('architectureL1Canon', () => {
  it('loads architecture/main.bvc with passport, 7 blocks and 8 edges', () => {
    const canon = loadArchitectureL1Canon(repoRoot);

    assert.equal(canon.passport?.id, ARCHITECTURE_L1_CANON_ID);
    assert.equal(canon.passport?.version, 1);
    assert.equal(canon.blocks.length, ARCHITECTURE_L1_BLOCK_COUNT);
    assert.equal(canon.edges.length, 8);
    assert.match(canon.digest, /^[0-9a-f]{8}$/);
    assert.ok(canon.blocks.some((block) => block.id === 'derived-projections' && block.basis.includes('ADR')));
    assert.ok(canon.blocks.find((block) => block.id === 'step-canon')?.containers.length >= 2);
  });

  it('parses intent roots and container paths from labels', () => {
    const content = fs.readFileSync(canonPath, 'utf8');
    const canon = parseArchitectureL1CanonContent(content, { filePath: 'architecture/main.bvc' });
    validateArchitectureL1Canon(canon);

    const workGraph = canon.blocks.find((block) => block.id === 'work-graph');
    assert.ok(workGraph?.intentRoots.includes('intent/system/runtime'));
    assert.ok(workGraph?.containers.some((container) => container.paths.includes('src/workGraphRuntime.mjs')));
    const workerAdapter = canon.blocks
      .find((block) => block.id === 'agent-runtime')
      ?.containers.find((container) => container.id === 'worker-adapter');
    assert.ok(workerAdapter?.basis?.includes('адаптера воркера'));
    assert.ok(workerAdapter?.vector?.includes('protocols/agent-worker-adapter.bvc'));
    assert.ok(workerAdapter?.goal?.includes('оркестратор'));
    assert.ok(workerAdapter?.analysis?.includes('Целесообразность:'));
    assert.ok(workerAdapter?.analysis?.includes('Контекст и границы:'));
    assert.match(workerAdapter?.decision ?? '', /L2-контейнер worker-adapter принят/);
    assert.equal(workerAdapter?.labels?.['architecture.decision.verdict'], 'useful');
  });

  it('rejects L2 container with short analysis/decision', () => {
    const canon = loadArchitectureL1Canon(repoRoot);
    const broken = structuredClone(canon);
    const block = broken.blocks.find((entry) => entry.id === 'agent-runtime');
    const container = block?.containers.find((entry) => entry.id === 'worker-adapter');
    if (container) {
      container.analysis = 'Целесообразность: коротко.';
      container.decision = 'Вердикт: полезно';
    }

    assert.throws(() => validateArchitectureL1Canon(broken), /analysis too short/);
  });

  it('keeps operator-facing block copy in Russian', () => {
    const canon = loadArchitectureL1Canon(repoRoot);
    const agentRuntime = canon.blocks.find((block) => block.id === 'agent-runtime');
    const derived = canon.blocks.find((block) => block.id === 'derived-projections');
    const projectMemory = canon.blocks.find((block) => block.id === 'project-memory');

    assert.match(agentRuntime?.summary ?? '', /адаптер воркера/i);
    assert.doesNotMatch(agentRuntime?.summary ?? '', /Worker adapter/i);
    assert.match(agentRuntime?.basis ?? '', /Цикл исполнения агента/i);
    assert.match(derived?.summary ?? '', /Доска UI/i);
    assert.doesNotMatch(derived?.summary ?? '', /UI board/i);
    assert.match(projectMemory?.summary ?? '', /Долговременные факты/i);
    assert.equal(projectMemory?.title, 'Память проекта');
    assert.match(agentRuntime?.analysis ?? '', /Целесообразность/i);
    assert.doesNotMatch(agentRuntime?.analysis ?? '', /Решение:/);
    assert.match(agentRuntime?.decision ?? '', /Вердикт: полезно/i);
    assert.match(agentRuntime?.analysis ?? '', /Исполнение агента/i);
    assert.doesNotMatch(agentRuntime?.analysis ?? '', /Agent execution/i);
    assert.equal(agentRuntime?.labels?.['architecture.decision.verdict'], 'useful');

    const domains = canon.blocks.find((block) => block.id === 'domains');
    assert.equal(domains?.title, 'Домены');
    assert.ok(domains?.containers.some((container) => container.id === 'onebase-domain' && container.title === 'OneBase'));
    assert.ok(domains?.containers.some((container) => container.id === 'marketplace-domain' && container.title === 'Marketplace'));
  });

  it('rejects canon with unknown edge endpoints', () => {
    const canon = loadArchitectureL1Canon(repoRoot);
    const broken = {
      ...canon,
      edges: [{ from: 'step-canon', to: 'missing-block', type: 'feeds' }],
    };

    assert.throws(() => validateArchitectureL1Canon(broken), /unknown block/);
  });
});
