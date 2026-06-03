import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import spec, {
  BVC_EXTENSION_CANON,
  BVC_EXTENSION_LEGACY,
  BVC_SPEC_VERSION,
  dialects,
  schemas,
} from '../packages/bvc-spec/index.js';

describe('@bvc-lang/spec package', () => {
  it('exports version and extensions', () => {
    assert.equal(BVC_SPEC_VERSION, '0.0.6');
    assert.equal(BVC_EXTENSION_CANON, '.bvc');
    assert.equal(BVC_EXTENSION_LEGACY, '.step');
  });

  it('loads dialect registry', () => {
    assert.equal(dialects.en.bvc.basis, 'Basis');
    assert.equal(dialects.ru.bvc.basis, 'Базис');
  });

  it('loads bvc-atom-draft schema with lang field', () => {
    assert.equal(schemas.bvcAtomDraftV1.$id, 'https://bvc-lang.dev/schemas/bvc-atom-draft.v1.json');
    assert.deepEqual(schemas.bvcAtomDraftV1.properties.lang.enum, ['en', 'ru']);
    assert.ok(schemas.bvcAtomDraftV1.properties.structuredEvidence);
    assert.ok(schemas.bvcAtomDraftV1.$defs?.evidenceRecordV1);
  });

  it('default export bundles artifacts', () => {
    assert.equal(spec.version, '0.0.6');
    assert.ok(spec.dialects.en);
    assert.ok(spec.schemas.bvcAtomDraftV1);
  });
});
