import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { extractBladeUiComponentRefs, isBladeFile, parseBladeFileForPvrg } from '../src/pvrg/bladeAdapter.mjs';

describe('bladeAdapter', () => {
  it('detects blade paths', () => {
    assert.equal(isBladeFile('foo/bar.blade.php'), true);
    assert.equal(isBladeFile('foo.php'), false);
  });

  it('extracts x-ui component refs', () => {
    const refs = extractBladeUiComponentRefs('<x-ui.atoms.button variant="primary"><x-ui.molecules.tabs>');
    assert.deepEqual(refs, ['x-ui.atoms.button', 'x-ui.molecules.tabs']);
  });

  it('parses blade file for PVRG stub', () => {
    const parsed = parseBladeFileForPvrg({
      filePath: 'resources/views/foo.blade.php',
      content: '<x-ui.atoms.badge />',
    });
    assert.equal(parsed.adapter, 'blade');
    assert.deepEqual(parsed.uiComponentRefs, ['x-ui.atoms.badge']);
  });
});
