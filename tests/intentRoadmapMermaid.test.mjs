import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { join } from 'node:path';

import { readIntentNodesFromRepo } from '../src/intentNodeRuntime.mjs';
import {
  INTENT_ROADMAP_MERMAID_SCHEMA,
  buildIntentRoadmapMermaidSource,
  enrichIntentRoadmapBranchWithMermaid,
  findAllOptionsForQuestion,
} from '../src/intentRoadmapMermaid.mjs';
import { buildIntentRoadmapProjection } from '../src/intentRoadmapProjection.mjs';
import { readWorkItemsFromRepo } from '../src/intentTreeWorkItems.mjs';

describe('intentRoadmapMermaid', () => {
  it('builds flowchart TB like analytics reference with all options', () => {
    const source = buildIntentRoadmapMermaidSource({
      decisionId: 'decision:test-v1',
      decisionTitle: 'Selected path',
      analyticsRef: 'analytics:intent-graph-storage-roadmap',
      question: { id: 'iq:test', title: 'Как хранить граф намерений?' },
      selectedOption: { id: 'option-b', title: 'Вариант B' },
      allOptions: [
        { id: 'option-a', title: 'Вариант A' },
        { id: 'option-b', title: 'Вариант B', selected: true },
        { id: 'option-c', title: 'Вариант C' },
      ],
      decision: { id: 'decision:test-v1', title: 'Selected path' },
      roots: [{
        workId: 'epic-1',
        title: 'Эпик',
        status: 'done',
        childCount: 2,
        doneChildCount: 2,
        children: [
          { workId: 'sub-1', title: 'Подзадача 1', status: 'done', childCount: 0, doneChildCount: 0, children: [] },
          { workId: 'sub-2', title: 'Подзадача 2', status: 'done', childCount: 0, doneChildCount: 0, children: [] },
        ],
      }],
    });

    assert.equal(source.schema, INTENT_ROADMAP_MERMAID_SCHEMA);
    assert.match(source.source, /^flowchart TB/m);
    assert.match(source.source, /option_a/);
    assert.match(source.source, /option_b/);
    assert.match(source.source, /option_c/);
    assert.match(source.source, /option_b --> dec_/);
    assert.doesNotMatch(source.source, /option_a --> dec_/);
    assert.match(source.source, /dec_.*--> epic_/);
    assert.match(source.source, /classDef selected/);
    assert.match(source.source, /classDef rejected/);
  });

  it('includes four AN-3 options in reference mermaid source', async () => {
    const repoRoot = join(import.meta.dirname, '..');
    const intentNodes = await readIntentNodesFromRepo({ cwd: repoRoot });
    const workItems = await readWorkItemsFromRepo({ cwd: repoRoot });
    const projection = buildIntentRoadmapProjection(intentNodes, workItems);
    const branch = projection.branches.find((entry) => entry.decisionId === 'decision:intent-graph-storage-v1');

    assert.ok(branch);
    const mermaid = buildIntentRoadmapMermaidSource({
      ...branch,
      allOptions: findAllOptionsForQuestion(branch.question, intentNodes).map((option) => ({
        id: option.id,
        title: option.title,
        selected: option.id === branch.selectedOption?.id,
      })),
    });

    assert.match(mermaid.source, /option_a_markdown_only/);
    assert.match(mermaid.source, /option_c_intent_node_canon --> dec_/);
    assert.equal(findAllOptionsForQuestion(branch.question, intentNodes).length, 4);
  });

  it('enriches branch with mermaid block', () => {
    const enriched = enrichIntentRoadmapBranchWithMermaid({
      decisionId: 'decision:test-v1',
      question: { id: 'iq:test', title: 'Q' },
      selectedOption: { id: 'option-a', title: 'A' },
      roots: [],
    }, [
      { id: 'iq:test', nodeKind: 'question', parentId: '', title: 'Q', childIds: ['option-a'] },
      { id: 'option-a', nodeKind: 'option', parentId: 'iq:test', title: 'A' },
    ]);

    assert.ok(enriched.mermaid?.source.includes('flowchart TB'));
    assert.equal(enriched.allOptions.length, 1);
  });
});
