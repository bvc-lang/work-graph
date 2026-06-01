import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { describe, it } from 'node:test';

import {
  bvcParseResultsEquivalent,
  formatBvcFileContent,
  parseBvcFileContent,
} from '../src/bvcFileFormat.mjs';
import { runBvcFormat } from '../src/bvcFormatCli.mjs';
import { intentPathForNewWorkItem } from '../src/bvcNewWritePolicy.mjs';

describe('bvc format CLI', () => {
  it('formatBvcFileContent round-trips conformance EN fixture preserving lang', async () => {
    const { readFile: readFixture } = await import('node:fs/promises');
    const { dirname, join: joinPath } = await import('node:path');
    const { fileURLToPath } = await import('node:url');
    const dir = joinPath(dirname(fileURLToPath(import.meta.url)), 'conformance');
    const source = await readFixture(joinPath(dir, 'minimal.en.bvc'), 'utf8');
    const formatted = formatBvcFileContent(source, { filePath: 'minimal.en.bvc' });
    const reparsed = parseBvcFileContent(formatted, { filePath: 'minimal.en.bvc' });
    const original = parseBvcFileContent(source, { filePath: 'minimal.en.bvc' });

    assert.equal(reparsed.atoms[0].draft.lang, 'en');
    assert.ok(bvcParseResultsEquivalent(original, reparsed));
  });

  it('runBvcFormat writes sibling .bvc for legacy .step input', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'bvc-format-'));
    const stepPath = join(dir, 'sample.step');
    const atom = `#Sample_task@en<[
Basis:
  Seed atom for format CLI.
Vector:
  Write canonical .bvc sibling from .step input.
Goal:
  Verify runBvcFormat default output path.
Checks:
  output file exists

Labels:
  atom.profile: work_item
  work.id: sample-task
  work.status: backlog
]>
`;
    await writeFile(stepPath, atom, 'utf8');

    const code = await runBvcFormat(stepPath, { cwd: dir });
    assert.equal(code, 0);

    const bvcPath = join(dir, 'sample.bvc');
    const written = await readFile(bvcPath, 'utf8');
    assert.match(written, /#Sample_task@en<\[/u);
    assert.equal(parseBvcFileContent(written, { filePath: bvcPath }).atoms[0].draft.lang, 'en');
  });
});

describe('bvc new-write policy', () => {
  it('intentPathForNewWorkItem uses .work.bvc suffix', () => {
    const path = intentPathForNewWorkItem({
      id: 'bvc-phase2-new-write',
      department: 'product',
    });
    assert.equal(path, 'intent/system/runtime/work/bvc-phase2-new-write.work.bvc');
  });
});
