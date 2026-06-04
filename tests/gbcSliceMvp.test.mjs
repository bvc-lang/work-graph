import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mkdtemp, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { buildLinkageMetricsSlice, roundTripGbcSlice } from '../src/gbcSliceMvp.mjs';

describe('gbcSliceMvp', () => {
  it('builds linkage metrics slice', () => {
    const slice = buildLinkageMetricsSlice({
      links: [
        { sourceWorkId: 'a', from: { kind: 'work', id: 'a' }, to: { kind: 'file', id: 'src/a.mjs' } },
        { sourceWorkId: 'b', from: { kind: 'work', id: 'b' }, to: { kind: 'work', id: 'a' } },
      ],
    }, { workId: 'a' });

    assert.equal(slice.schema, 'gbc.slice.mvp.v1');
    assert.equal(slice.metrics.linkCount, 2);
  });

  it('round-trips json cache slice', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'gbc-slice-'));
    const outputPath = join(dir, 'slice.json');
    const result = await roundTripGbcSlice({ links: [] }, { outputPath, cwd: dir });

    assert.equal(result.ok, true);
    const text = await readFile(outputPath, 'utf8');
    assert.ok(text.includes('gbc.slice.mvp.v1'));
  });
});
