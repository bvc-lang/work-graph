import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  buildStepToBvcMigrationPlan,
  isStepMigrationCandidate,
  stepToBvcTargetPath,
} from '../src/migrateStepToBvc.mjs';

describe('migrateStepToBvc', () => {
  it('detects .step migration candidates', () => {
    assert.equal(isStepMigrationCandidate('work/foo.step'), true);
    assert.equal(isStepMigrationCandidate('work/foo.bvc'), false);
  });

  it('maps .step to .bvc target path', () => {
    assert.equal(stepToBvcTargetPath('protocols/pipeline.step'), 'protocols/pipeline.bvc');
    assert.equal(stepToBvcTargetPath('protocols/pipeline.bvc'), null);
  });

  it('builds sorted rename plan without duplicates', () => {
    const plan = buildStepToBvcMigrationPlan([
      'work/z.step',
      'work/a.step',
      'work/a.bvc',
      'readme.md',
    ]);

    assert.deepEqual(plan, [
      { from: 'work/a.step', to: 'work/a.bvc' },
      { from: 'work/z.step', to: 'work/z.bvc' },
    ]);
  });
});
