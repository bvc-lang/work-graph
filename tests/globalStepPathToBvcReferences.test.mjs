import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { replaceStepPathReferencesInText } from '../src/globalStepPathToBvcReferences.mjs';

describe('globalStepPathToBvcReferences', () => {
  it('replaces repo path suffixes .step with .bvc', () => {
    const out = replaceStepPathReferencesInText('charter/main.step and protocols/pipeline.bvc');
    assert.match(out, /charter\/main\.bvc/);
  });

  it('preserves ../project ioHasC paths on .step', () => {
    const out = replaceStepPathReferencesInText('../project/rules/agent-behavior/tool-rules-migrated.step');
    assert.match(out, /tool-rules-migrated\.step/);
    assert.doesNotMatch(out, /tool-rules-migrated\.bvc/);
  });

  it('maps .work.step to .work.bvc', () => {
    assert.equal(
      replaceStepPathReferencesInText('intent/x/work/foo.work.step'),
      'intent/x/work/foo.work.bvc',
    );
  });
});
