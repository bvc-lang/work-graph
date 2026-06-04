import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { buildIntentPlaneGraphResponse } from '../src/intentPlaneApi.mjs';
import { buildSemanticDriftBatch } from '../src/semanticDrift.mjs';
import { findSemanticVoids } from '../src/semanticVoids.mjs';
import { parseWorkItems } from '../src/workGraphRuntime.mjs';

const ITEMS = parseWorkItems(`#Задача_parent<[
Базис: Parent basis.
Вектор: Parent vector.
Цель: Parent goal.
Свидетельства:
  - npm test passed
Метки:
  atom.profile: work_item
  work.id: parent-task
  work.title: Parent
  work.status: done
  work.target_files: src/parent.mjs
  trace.status: verified
]>

#Задача_child<[
Базис: Child basis.
Вектор: Child vector.
Цель: Child goal.
Метки:
  atom.profile: work_item
  work.id: child-task
  work.title: Child
  work.status: backlog
  work.target_files: src/other.mjs
  work.depends_on: parent-task
  work.parent_id: epic-sample
]>
`);

describe('intentPlaneApi', () => {
  it('builds graph response with projection nodes', () => {
    const result = buildIntentPlaneGraphResponse(ITEMS, {
      start: 'child-task',
      direction: 'downstream',
      depth: 1,
      drift: true,
    });

    assert.equal(result.schema, 'intent.plane.graph.v1');
    assert.ok(result.projection.nodes.length >= 1);
    assert.equal(result.projection.viewId, 'intent-plane');
    assert.ok(result.driftBatch?.entries?.length >= 1);
  });
});

describe('semanticDrift batch', () => {
  it('returns drift tiers sorted by score', () => {
    const batch = buildSemanticDriftBatch(ITEMS);
    assert.equal(batch.schema, 'semantic.drift.batch.v1');
    assert.ok(batch.entries.every((entry) => entry.driftTier));
  });
});

describe('semanticVoids', () => {
  it('finds work without evidence', () => {
    const voids = findSemanticVoids(ITEMS, {
      analyticsRecords: [{ key: 'AN-1', title: 'Orphan', relatedWorkItems: [] }],
    });
    assert.equal(voids.schema, 'semantic.voids.result.v1');
    assert.ok(voids.work_without_evidence.some((entry) => entry.workId === 'child-task'));
    assert.equal(voids.orphan_analytics.length, 1);
  });
});
