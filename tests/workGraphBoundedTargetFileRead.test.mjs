import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatBoundedTargetFilesForPrompt,
  isPathAllowedForTargetFiles,
  normalizeBoundedTargetPath,
  readBoundedTargetFile,
  readBoundedTargetFiles,
} from '../src/workGraphBoundedTargetFileRead.mjs';

describe('normalizeBoundedTargetPath', () => {
  it('rejects traversal and absolute paths', () => {
    assert.equal(normalizeBoundedTargetPath('../secret.txt').ok, false);
    assert.equal(normalizeBoundedTargetPath('/etc/passwd').ok, false);
    assert.equal(normalizeBoundedTargetPath('src/../secret.txt').ok, false);
  });

  it('accepts repo-relative paths', () => {
    const result = normalizeBoundedTargetPath('src/runtime.mjs');
    assert.equal(result.ok, true);
    assert.equal(result.path, 'src/runtime.mjs');
  });
});

describe('readBoundedTargetFile', () => {
  it('allows only targetFiles paths', async () => {
    const allowed = await readBoundedTargetFile('src/allowed.mjs', {
      targetFiles: ['src/allowed.mjs'],
      readFile: async () => 'ok',
    });
    const denied = await readBoundedTargetFile('src/other.mjs', {
      targetFiles: ['src/allowed.mjs'],
      readFile: async () => 'nope',
    });

    assert.equal(allowed.ok, true);
    assert.equal(allowed.content, 'ok');
    assert.equal(denied.ok, false);
    assert.match(denied.error, /allowlist/i);
  });

  it('truncates oversized content', async () => {
    const entry = await readBoundedTargetFile('src/big.mjs', {
      targetFiles: ['src/big.mjs'],
      maxBytesPerFile: 8,
      readFile: async () => '0123456789abcdef',
    });

    assert.equal(entry.ok, true);
    assert.equal(entry.truncated, true);
    assert.equal(Buffer.byteLength(entry.content, 'utf8'), 8);
  });
});

describe('readBoundedTargetFiles', () => {
  it('returns bounded read summary for worker input', async () => {
    const input = {
      task: { id: 'task-1' },
      targetFiles: ['a.txt', 'b.txt'],
    };

    const result = await readBoundedTargetFiles(input, {
      readFile: async (path) => (path.endsWith('a.txt') ? 'alpha' : 'beta'),
    });

    assert.equal(result.schema, 'workgraph.bounded-target-file-read.v1');
    assert.equal(result.summary.readOk, 2);
    assert.match(formatBoundedTargetFilesForPrompt(result), /alpha/);
  });
});

describe('isPathAllowedForTargetFiles', () => {
  it('matches normalized allowlist entries', () => {
    assert.equal(isPathAllowedForTargetFiles('src/runtime.mjs', ['src/runtime.mjs']), true);
    assert.equal(isPathAllowedForTargetFiles('src/other.mjs', ['src/runtime.mjs']), false);
  });
});
