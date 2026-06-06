import assert from 'node:assert/strict';
import fs from 'node:fs';
import { cp, mkdir, mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  getArchitectureL1Blocks,
  ARCHITECTURE_L2_MAX_NODES,
  L2_CONTAINER_HEIGHT,
  L2_CONTAINER_WIDTH,
  L2_COLUMN_GAP,
  L2_FILE_HEIGHT,
  L2_FILE_WIDTH,
  L2_ROW_GAP,
  buildArchitectureBlockL2Graph,
  buildArchitectureSnapshot,
  buildCanonBlockPathIndex,
  classifyWorkItemBlock,
  classifyWorkItemForCanon,
  layoutArchitectureL2Graph,
  UNCLASSIFIED_BLOCK_ID,
} from '../src/architectureSnapshot.mjs';
import { loadArchitectureL1Canon } from '../src/architectureL1Canon.mjs';
import { buildSnapshot, parseWorkItems } from '../src/workGraphRuntime.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(testDir, '..');

const SAMPLE_ITEMS = `#Задача_ui<[
Базис: UI.
Вектор: UI.
Цель: UI.
Метки:
  atom.profile: work_item
  work.id: design-workgraph-backlog-ui
  work.title: UI board
  work.status: done
  work.department: frontend-ui
  work.target_files: src/workGraphBacklogUiServer.mjs
  trace.status: verified
]>

#Задача_onebase<[
Базис: OneBase.
Вектор: OneBase.
Цель: OneBase.
Метки:
  atom.profile: work_item
  work.id: onebase-artifact-mapping
  work.title: OneBase mapping
  work.status: backlog
  work.department: product-architecture
  work.target_files: domains/onebase/artifact-mapping.bvc
  trace.status: pending
]>

#Задача_runtime<[
Базис: Runtime.
Вектор: Runtime.
Цель: Runtime.
Метки:
  atom.profile: work_item
  work.id: implement-workgraph-minimal-runtime
  work.title: Work Graph runtime
  work.status: done
  work.department: agent-platform
  work.target_files: src/workGraphRuntime.mjs
  trace.status: verified
]>
`;

describe('classifyWorkItemBlock', () => {
  it('maps UI and graph tasks to derived-projections', () => {
    const [uiItem] = parseWorkItems(SAMPLE_ITEMS).filter((item) => item.id === 'design-workgraph-backlog-ui');
    assert.equal(classifyWorkItemBlock(uiItem), 'derived-projections');
  });

  it('maps OneBase tasks to domains L1 block', () => {
    const [onebaseItem] = parseWorkItems(SAMPLE_ITEMS).filter((item) => item.id === 'onebase-artifact-mapping');
    assert.equal(classifyWorkItemBlock(onebaseItem), 'domains');
  });

  it('maps Marketplace tasks to domains L1 block', () => {
    const marketplaceItems = `#Задача_mp<[
Базис: MP.
Вектор: MP.
Цель: MP.
Метки:
  atom.profile: work_item
  work.id: intent-marketplace-backlog-bootstrap
  work.title: marketplace bootstrap
  work.status: done
  work.department: domain-marketplace
  work.target_files: intent/domains/marketplace/work/
  trace.status: verified
]>`;
    const [item] = parseWorkItems(marketplaceItems);
    assert.equal(classifyWorkItemBlock(item), 'domains');
  });

  it('maps generic runtime tasks to work-graph', () => {
    const [runtimeItem] = parseWorkItems(SAMPLE_ITEMS).filter((item) => item.id === 'implement-workgraph-minimal-runtime');
    assert.equal(classifyWorkItemBlock(runtimeItem), 'work-graph');
  });
});

describe('buildArchitectureSnapshot', () => {
  it('builds deterministic architecture.snapshot.v1 from workgraph snapshot', () => {
    const workGraphSnapshot = buildSnapshot(parseWorkItems(SAMPLE_ITEMS));
    const architectureSnapshot = buildArchitectureSnapshot(workGraphSnapshot, { repoRoot });

    assert.equal(architectureSnapshot.schema, 'architecture.snapshot.v1');
    assert.equal(architectureSnapshot.sourceSchema, 'workgraph.snapshot.v1');
    assert.equal(architectureSnapshot.blocks.length, getArchitectureL1Blocks().length);
    assert.equal(architectureSnapshot.l1Canon?.sourcePath, 'architecture/main.bvc');
    assert.ok(architectureSnapshot.blocks.every((block) => typeof block.basis === 'string'));
    assert.ok(architectureSnapshot.blocks.every((block) => typeof block.analysis === 'string'));
    assert.ok(architectureSnapshot.blocks.some((block) => block.analysis.includes('Целесообразность')));
    assert.equal(architectureSnapshot.counts.tasks, 3);
    assert.ok(architectureSnapshot.edges.some((edge) => edge.from === 'step-canon' && edge.to === 'work-graph'));
    assert.ok(architectureSnapshot.blocks.some((block) => block.id === 'derived-projections' && block.taskIds.includes('design-workgraph-backlog-ui')));
    assert.ok(architectureSnapshot.blocks.some((block) => block.id === 'domains' && block.taskIds.includes('onebase-artifact-mapping')));
    assert.ok(architectureSnapshot.blocks.some((block) => block.id === 'domains' && block.containers.some((c) => c.id === 'onebase-domain')));
    assert.ok(architectureSnapshot.edges.some((edge) => edge.from === 'domains' && edge.to === 'work-graph'));
  });

  it('includes OneBase catalog/document nodes on domains block', () => {
    const workGraphSnapshot = buildSnapshot(parseWorkItems(SAMPLE_ITEMS));
    const architectureSnapshot = buildArchitectureSnapshot(workGraphSnapshot, { repoRoot });
    const domainsBlock = architectureSnapshot.blocks.find((block) => block.id === 'domains');

    assert.ok(domainsBlock);
    assert.equal(domainsBlock.onebaseGraph.schema, 'onebase.pvrg_graph_nodes.v1');
    assert.ok(domainsBlock.onebaseGraph.nodes.some((node) => node.onebaseKind === 'document'));
    assert.ok(domainsBlock.onebaseGraph.nodes.some((node) => node.onebaseKind === 'catalog'));
    assert.ok(domainsBlock.l2Graph.nodes.some((node) => node.onebaseKind === 'document'));
    assert.ok(domainsBlock.l2Graph.edges.some((edge) => edge.type === 'hosts_onebase'));
  });

  it('matches architecture-snapshot.v1 schema including L2 graph payload', () => {
    const schema = JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'schemas/architecture-snapshot.v1.json'), 'utf8'),
    );
    const workGraphSnapshot = buildSnapshot(parseWorkItems(SAMPLE_ITEMS));
    const architectureSnapshot = buildArchitectureSnapshot(workGraphSnapshot, { repoRoot });

    assert.deepEqual(validateSubsetJsonSchema(architectureSnapshot, schema, schema), []);
  });

  it('rejects unknown focusBlockId', () => {
    const workGraphSnapshot = buildSnapshot(parseWorkItems(SAMPLE_ITEMS));
    assert.throws(
      () => buildArchitectureSnapshot(workGraphSnapshot, { focusBlockId: 'missing-block' }),
      /Unknown focusBlockId/,
    );
  });

  it('reads architecture canon from foreign repoRoot (multiproject host)', async () => {
    const foreignRoot = await mkdtemp(path.join(os.tmpdir(), 'wg-arch-foreign-'));
    try {
      await mkdir(path.join(foreignRoot, 'architecture'), { recursive: true });
      await cp(
        path.join(repoRoot, 'architecture/main.bvc'),
        path.join(foreignRoot, 'architecture/main.bvc'),
      );
      const workGraphSnapshot = buildSnapshot(parseWorkItems(SAMPLE_ITEMS));
      const architectureSnapshot = buildArchitectureSnapshot(workGraphSnapshot, { repoRoot: foreignRoot });
      assert.equal(architectureSnapshot.l1Canon?.sourcePath, 'architecture/main.bvc');
      assert.equal(architectureSnapshot.blocks.length, getArchitectureL1Blocks().length);
    } finally {
      await rm(foreignRoot, { recursive: true, force: true });
    }
  });
});

function validateSubsetJsonSchema(value, schema, rootSchema, pathLabel = '$') {
  const resolvedSchema = resolveRef(schema, rootSchema);
  const errors = [];

  if (resolvedSchema.const !== undefined && value !== resolvedSchema.const) {
    errors.push(`${pathLabel}: expected const ${JSON.stringify(resolvedSchema.const)}`);
  }

  if (resolvedSchema.enum && !resolvedSchema.enum.includes(value)) {
    errors.push(`${pathLabel}: expected one of ${resolvedSchema.enum.join(', ')}`);
  }

  if (resolvedSchema.anyOf) {
    const anyOfErrors = resolvedSchema.anyOf.map((candidate) =>
      validateSubsetJsonSchema(value, candidate, rootSchema, pathLabel),
    );
    if (anyOfErrors.every((candidateErrors) => candidateErrors.length > 0)) {
      errors.push(`${pathLabel}: did not match anyOf`);
    }
    return errors;
  }

  if (resolvedSchema.type) {
    const typeOk =
      (resolvedSchema.type === 'array' && Array.isArray(value)) ||
      (resolvedSchema.type === 'null' && value === null) ||
      (resolvedSchema.type === 'object' && value !== null && typeof value === 'object' && !Array.isArray(value)) ||
      (resolvedSchema.type === 'integer' && Number.isInteger(value)) ||
      (resolvedSchema.type !== 'array' &&
        resolvedSchema.type !== 'null' &&
        resolvedSchema.type !== 'object' &&
        resolvedSchema.type !== 'integer' &&
        typeof value === resolvedSchema.type);

    if (!typeOk) {
      errors.push(`${pathLabel}: expected type ${resolvedSchema.type}`);
      return errors;
    }
  }

  if (Number.isInteger(value) && resolvedSchema.minimum !== undefined && value < resolvedSchema.minimum) {
    errors.push(`${pathLabel}: expected minimum ${resolvedSchema.minimum}`);
  }

  if (typeof value === 'string' && resolvedSchema.minLength !== undefined && value.length < resolvedSchema.minLength) {
    errors.push(`${pathLabel}: expected minLength ${resolvedSchema.minLength}`);
  }

  if (Array.isArray(value) && resolvedSchema.items) {
    value.forEach((item, index) => {
      errors.push(...validateSubsetJsonSchema(item, resolvedSchema.items, rootSchema, `${pathLabel}[${index}]`));
    });
  }

  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const required = resolvedSchema.required ?? [];
    for (const key of required) {
      if (!Object.hasOwn(value, key)) {
        errors.push(`${pathLabel}: missing required ${key}`);
      }
    }

    const properties = resolvedSchema.properties ?? {};
    if (resolvedSchema.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!Object.hasOwn(properties, key)) {
          errors.push(`${pathLabel}: unexpected property ${key}`);
        }
      }
    }

    for (const [key, childSchema] of Object.entries(properties)) {
      if (Object.hasOwn(value, key)) {
        errors.push(...validateSubsetJsonSchema(value[key], childSchema, rootSchema, `${pathLabel}.${key}`));
      }
    }
  }

  return errors;
}

function resolveRef(schema, rootSchema) {
  if (!schema?.$ref) {
    return schema;
  }

  const prefix = '#/$defs/';
  if (!schema.$ref.startsWith(prefix)) {
    throw new Error(`Unsupported schema ref: ${schema.$ref}`);
  }

  const defName = schema.$ref.slice(prefix.length);
  return rootSchema.$defs[defName];
}

const GRIPE_LIKE_FIXTURE = 'tests/fixtures/architecture-gripe-like/main.bvc';

const GRIPE_LIKE_ITEMS = `#Задача_facet<[
Базис: Facets.
Вектор: Facets.
Цель: Facets.
Метки:
  atom.profile: work_item
  work.id: import-zhivotnye-catalog-facets
  work.title: Import zhivotnye facets
  work.status: backlog
  work.department: domain-onebase
  work.target_files: config/catalog-facets.php, app/Support/Avito/AvitoFacetsConfigMerger.php
  trace.status: pending
]>

#Задача_ui<[
Базис: UI kit.
Вектор: UI kit.
Цель: UI kit.
Метки:
  atom.profile: work_item
  work.id: ui-kit-theme-preview-switcher
  work.title: Theme preview switcher
  work.status: backlog
  work.department: frontend-ui
  work.target_files: resources/css/tokens.css, src/ui/theme-preview.mjs
  trace.status: pending
]>

#Задача_hub<[
Базис: Hub.
Вектор: Hub.
Цель: Hub.
Метки:
  atom.profile: work_item
  work.id: resolve-facets-hub-template-conflict
  work.title: Resolve hub template conflict
  work.status: backlog
  work.department: domain-onebase
  work.target_files: packages/marketplace-core/src/Support/CatalogCategoryFacets.php
  trace.status: pending
]>
`;

describe('canon-aware work item block classifier', () => {
  it('maps Gripe-like tasks to catalog-pipeline, presentation, marketplace-core via path index', () => {
    const canon = loadArchitectureL1Canon(repoRoot, { canonPath: GRIPE_LIKE_FIXTURE });
    const pathIndex = buildCanonBlockPathIndex(canon);
    const items = parseWorkItems(GRIPE_LIKE_ITEMS);

    const facet = items.find((item) => item.id === 'import-zhivotnye-catalog-facets');
    const ui = items.find((item) => item.id === 'ui-kit-theme-preview-switcher');
    const hub = items.find((item) => item.id === 'resolve-facets-hub-template-conflict');

    assert.equal(classifyWorkItemForCanon(facet, canon, { pathIndex }).blockId, 'catalog-pipeline');
    assert.equal(classifyWorkItemForCanon(ui, canon, { pathIndex }).blockId, 'presentation');
    assert.equal(classifyWorkItemForCanon(hub, canon, { pathIndex }).blockId, 'marketplace-core');
  });

  it('returns unclassified for domain-onebase task without matching canon paths', () => {
    const canon = loadArchitectureL1Canon(repoRoot, { canonPath: GRIPE_LIKE_FIXTURE });
    const orphan = `#Задача_orphan<[
Базис: Orphan.
Вектор: Orphan.
Цель: Orphan.
Метки:
  atom.profile: work_item
  work.id: gripe-meta-analytics-only
  work.title: Analytics only
  work.status: backlog
  work.department: domain-onebase
  work.target_files: work/analytics/some-note.md
  trace.status: pending
]>`;
    const [item] = parseWorkItems(orphan);
    assert.equal(classifyWorkItemForCanon(item, canon).blockId, UNCLASSIFIED_BLOCK_ID);
  });

  it('builds architecture snapshot with Gripe-like fixture taskIds on L1 blocks', () => {
    const workGraphSnapshot = buildSnapshot(parseWorkItems(GRIPE_LIKE_ITEMS));
    const architectureSnapshot = buildArchitectureSnapshot(workGraphSnapshot, {
      repoRoot,
      canonPath: GRIPE_LIKE_FIXTURE,
    });

    const catalog = architectureSnapshot.blocks.find((block) => block.id === 'catalog-pipeline');
    const presentation = architectureSnapshot.blocks.find((block) => block.id === 'presentation');
    const core = architectureSnapshot.blocks.find((block) => block.id === 'marketplace-core');

    assert.ok(catalog?.taskIds.includes('import-zhivotnye-catalog-facets'));
    assert.ok(presentation?.taskIds.includes('ui-kit-theme-preview-switcher'));
    assert.ok(core?.taskIds.includes('resolve-facets-hub-template-conflict'));
    assert.equal(catalog.taskIds.includes('ui-kit-theme-preview-switcher'), false);
    assert.equal(architectureSnapshot.counts.unclassified, 0);
    assert.deepEqual(architectureSnapshot.unclassified.taskIds, []);
  });

  it('exposes unclassified bucket and counts for tasks outside L1 canon paths', () => {
    const orphan = `#Задача_orphan<[
Базис: Orphan.
Вектор: Orphan.
Цель: Orphan.
Метки:
  atom.profile: work_item
  work.id: gripe-meta-analytics-only
  work.title: Analytics only
  work.status: backlog
  work.department: domain-onebase
  work.target_files: work/analytics/some-note.md
  trace.status: pending
]>`;
    const workGraphSnapshot = buildSnapshot(parseWorkItems(`${GRIPE_LIKE_ITEMS}\n${orphan}`));
    const architectureSnapshot = buildArchitectureSnapshot(workGraphSnapshot, {
      repoRoot,
      canonPath: GRIPE_LIKE_FIXTURE,
    });

    assert.equal(architectureSnapshot.counts.unclassified, 1);
    assert.deepEqual(architectureSnapshot.unclassified.taskIds, ['gripe-meta-analytics-only']);
    assert.equal(architectureSnapshot.unclassified.taskCounts.backlog, 1);
  });

  it('keeps WG-engine snapshot classification via legacy ids present in canon', () => {
    const workGraphSnapshot = buildSnapshot(parseWorkItems(SAMPLE_ITEMS));
    const architectureSnapshot = buildArchitectureSnapshot(workGraphSnapshot, { repoRoot });

    assert.ok(architectureSnapshot.blocks.some((block) => block.id === 'derived-projections' && block.taskIds.includes('design-workgraph-backlog-ui')));
    assert.ok(architectureSnapshot.blocks.some((block) => block.id === 'domains' && block.taskIds.includes('onebase-artifact-mapping')));
    const runtimeBlockIds = architectureSnapshot.blocks
      .filter((block) => block.taskIds.includes('implement-workgraph-minimal-runtime'))
      .map((block) => block.id);
    assert.ok(runtimeBlockIds.some((id) => id === 'work-graph' || id === 'trace-evidence'));
  });
});

describe('buildArchitectureBlockL2Graph', () => {
  it('builds scoped L2 nodes and edges without depends_on', () => {
    const workGraphSnapshot = buildSnapshot(parseWorkItems(SAMPLE_ITEMS));
    const architectureSnapshot = buildArchitectureSnapshot(workGraphSnapshot);
    const block = architectureSnapshot.blocks.find((candidate) => candidate.id === 'derived-projections');
    assert.ok(block);
    assert.ok(block.l2Graph);
    assert.equal(block.l2Graph.schema, 'architecture.block_l2_graph.v1');
    assert.ok(block.l2Graph.counts.nodes <= ARCHITECTURE_L2_MAX_NODES);
    assert.ok(block.l2Graph.layoutNodes.length > 0);
    assert.ok(block.l2Graph.layoutNodes.every((node) => node.width >= (node.kind === 'file' ? L2_FILE_WIDTH : L2_CONTAINER_WIDTH)));
    assert.ok(block.l2Graph.layoutNodes.every((node) => node.height >= (node.kind === 'file' ? L2_FILE_HEIGHT : L2_CONTAINER_HEIGHT)));
    assert.ok(block.l2Graph.layoutEdges.every((edge) => edge.type !== 'depends_on'));
    assert.ok(block.l2Graph.layoutEdges.some((edge) => ['defines', 'implements', 'uses', 'relates_file'].includes(edge.type)));
    const backlogUi = block.l2Graph.layoutNodes.find((node) => node.id === 'container:backlog-ui');
    assert.ok(backlogUi?.basis?.includes('backlog UI'));
    assert.ok(backlogUi?.analysis?.includes('Контекст и границы:'));
    assert.ok(backlogUi?.labels?.['architecture.decision.verdict'] === 'useful');
  });

  it('caps visible nodes at ARCHITECTURE_L2_MAX_NODES', () => {
    const block = {
      id: 'work-graph',
      containers: [{ id: 'runtime', title: 'Runtime', kind: 'runtime', paths: ['src/'] }],
      artifactPaths: Array.from({ length: 30 }, (_, index) => `src/file-${index}.mjs`),
    };
    const graph = buildArchitectureBlockL2Graph(block, []);
    assert.equal(graph.counts.nodes, ARCHITECTURE_L2_MAX_NODES);
    assert.equal(graph.capped, true);
    assert.ok(graph.hiddenCount > 0);
    const layout = layoutArchitectureL2Graph(graph);
    const fileNodes = layout.layoutNodes.filter((node) => node.kind === 'file');
    for (let index = 1; index < fileNodes.length; index += 1) {
      const previous = fileNodes[index - 1];
      const current = fileNodes[index];
      assert.ok(current.y >= previous.y + previous.height + L2_ROW_GAP - 1);
    }
    assert.ok(layout.height >= fileNodes.length * (L2_FILE_HEIGHT + L2_ROW_GAP));
  });

  it('centers container column vertically against the file stack', () => {
    const block = {
      id: 'work-graph',
      containers: [{ id: 'intent-tree', title: 'Intent tree', kind: 'storage', paths: ['intent/'] }],
      artifactPaths: [
        'work/backlog.bvc',
        'intent/index.bvc',
        'src/intentTreeMigration.mjs',
        'intent/domains/onebase/work/example.work.bvc',
        'intent/system/runtime/work/example.work.bvc',
      ],
    };
    const layout = layoutArchitectureL2Graph(buildArchitectureBlockL2Graph(block, []));
    const container = layout.layoutNodes.find((node) => node.kind === 'container');
    const files = layout.layoutNodes.filter((node) => node.kind === 'file');
    assert.ok(container);
    assert.ok(files.length >= 3);

    const fileTop = Math.min(...files.map((node) => node.y));
    const fileBottom = Math.max(...files.map((node) => node.y + node.height));
    const fileCenter = (fileTop + fileBottom) / 2;
    const containerCenter = container.y + container.height / 2;

    assert.ok(Math.abs(containerCenter - fileCenter) <= 1);
    assert.ok(files[0].x - (container.x + container.width) >= L2_COLUMN_GAP - 1);
  });

  it('expands L2 node height for long labels', () => {
    const block = {
      id: 'work-graph',
      containers: [{
        id: 'runtime',
        title: 'Very long runtime container title that should require more than one visual line',
        kind: 'runtime',
        paths: ['src/'],
      }],
      artifactPaths: ['src/very/deep/path/with/a/long/file/name/that-should-wrap-in-l2-layout.mjs'],
    };
    const layout = layoutArchitectureL2Graph(buildArchitectureBlockL2Graph(block, []));
    const containerNode = layout.layoutNodes.find((node) => node.kind === 'container');
    const fileNode = layout.layoutNodes.find((node) => node.kind === 'file' && node.path?.includes('that-should-wrap'));

    assert.ok(containerNode.height > L2_CONTAINER_HEIGHT);
    assert.ok(fileNode.height > L2_FILE_HEIGHT);
  });
});
