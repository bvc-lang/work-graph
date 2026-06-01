import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildStepGraphProjectionV1,
  buildStepGraphSliceV1,
  STEP_GRAPH_SLICE_SCHEMA,
  STEP_GRAPH_PROJECTION_SCHEMA,
} from '../src/stepGraphSlice.mjs';

const FIXTURE = `#Root<[
Базис:
  Root block.
Вектор:
  See #Child in same file.
Цель:
  Test.

Метки:
  atom.profile: trace
]>

#Child<[
Базис:
  Child block.
Вектор:
  Leaf.
Цель:
  Test.

Метки:
  atom.profile: trace
]>
`;

describe('stepGraphSlice', () => {
  it('builds projection and slice from step refs', () => {
    const files = [{ logicalPath: 'protocols/alpha.bvc', text: FIXTURE }];
    const projection = buildStepGraphProjectionV1(files);
    assert.equal(projection.schema, STEP_GRAPH_PROJECTION_SCHEMA);
    assert.equal(projection.nodeCount, 2);
    assert.ok(projection.edgeCount >= 1);

    const slice = buildStepGraphSliceV1(projection, {
      seedStepName: 'Root',
      seedPath: 'protocols/alpha.bvc',
    });
    assert.equal(slice.schema, STEP_GRAPH_SLICE_SCHEMA);
    assert.equal(slice.nodeCount, 2);
    assert.ok(slice.edges.some((edge) => edge.relation === 'step_ref'));
  });

  it('slice maxNodes limits output, not projection seed lookup', () => {
    const files = [
      {
        logicalPath: 'aaa.bvc',
        text: `#AAA<[
Базис:
  First.
Вектор:
  Alpha.
Цель:
  Test.

Метки:
  atom.profile: trace
]>`,
      },
      { logicalPath: 'protocols/alpha.bvc', text: FIXTURE },
    ];
    const truncatedProjection = buildStepGraphProjectionV1(files, { maxNodes: 1 });
    assert.throws(
      () => buildStepGraphSliceV1(truncatedProjection, { seedStepName: 'Root' }),
      /unknown seedStepName/,
    );

    const fullProjection = buildStepGraphProjectionV1(files);
    const slice = buildStepGraphSliceV1(fullProjection, {
      seedStepName: 'Root',
      maxNodes: 2,
    });
    assert.equal(slice.nodeCount, 2);
  });
});
