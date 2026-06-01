import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';

import {
  COMPILER_ROUNDTRIP_RESULT_SCHEMA,
  runCompilerRoundTrip,
} from '../src/compilerRoundTripCli.mjs';

const fixtureRoot = join(dirname(fileURLToPath(import.meta.url)), 'fixtures', 'compiler-roundtrip');

describe('runCompilerRoundTrip', () => {
  it('passes format(parse(format)) invariant for compiler fixture step', async () => {
    const output = await runCompilerRoundTrip({
      stepPath: 'tests/fixtures/compiler-roundtrip/sample.compiler.bvc',
    });

    assert.equal(output.result.schema, COMPILER_ROUNDTRIP_RESULT_SCHEMA);
    assert.equal(output.result.status, 'passed');
    assert.equal(output.evidence.kind, 'roundtrip');
    assert.equal(output.evidence.status, 'succeeded');
  });

  it('skips non-compiler steps', async () => {
    const output = await runCompilerRoundTrip({
      stepPath: 'charter/main.bvc',
    });

    assert.equal(output.result.status, 'skipped');
    assert.equal(output.evidence.status, 'skipped');
  });
});
