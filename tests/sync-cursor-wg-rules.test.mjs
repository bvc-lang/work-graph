import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test } from 'node:test';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const canonDir = join(repoRoot, 'docs/cursor-rules');

test('docs/cursor-rules contains canonical WG alwaysApply rules', async () => {
  const files = (await readdir(canonDir)).filter((name) => name.endsWith('.mdc')).sort();
  assert.ok(files.length >= 6, `expected >= 6 .mdc files, got ${files.length}`);
  assert.ok(files.includes('agent-workgraph-single-backlog.mdc'));
  assert.ok(files.includes('work-items-russian.mdc'));
  assert.ok(files.includes('work-item-claim-context.mdc'));

  for (const file of files) {
    const text = await readFile(join(canonDir, file), 'utf8');
    assert.match(text, /^---\n/u, `${file} must have YAML frontmatter`);
  }
});
