import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  basenameFromRepoPath,
  buildRepoFilePreview,
  detectRepoFileLanguage,
  isRepoFilePreviewPath,
  readRepoFilePreviewFromRequest,
  resolveRepoFilePath,
  REPO_FILE_PREVIEW_MAX_BYTES,
  REPO_FILE_PREVIEW_SCHEMA,
} from '../src/repoFilePreviewApi.mjs';

describe('repoFilePreviewApi helpers', () => {
  it('detects previewable repo paths', () => {
    assert.equal(isRepoFilePreviewPath('tests/homeSnapshotProjection.test.mjs'), true);
    assert.equal(isRepoFilePreviewPath('protocols/decision-pipeline-canon-v1.bvc'), true);
    assert.equal(isRepoFilePreviewPath('../etc/passwd'), false);
    assert.equal(isRepoFilePreviewPath('https://example.com/a.mjs'), false);
    assert.equal(isRepoFilePreviewPath('plain label'), false);
  });

  it('maps extensions to highlight languages', () => {
    assert.equal(detectRepoFileLanguage('src/runtime.mjs'), 'javascript');
    assert.equal(detectRepoFileLanguage('intent/ui/dashboard/work/epic.work.bvc'), 'bvc');
    assert.equal(detectRepoFileLanguage('work/analytics/foo.md'), 'markdown');
    assert.equal(detectRepoFileLanguage('config/app.yaml'), 'yaml');
    assert.equal(basenameFromRepoPath('tests/homeSnapshotProjection.test.mjs'), 'homeSnapshotProjection.test.mjs');
  });
});

describe('resolveRepoFilePath', () => {
  it('resolves sibling analytics markdown paths against bodyPath', () => {
    assert.equal(
      resolveRepoFilePath(
        'pvrg-verified-reference-graph.md',
        'work/analytics/work-graph-intent-information-plane.md',
      ),
      'work/analytics/pvrg-verified-reference-graph.md',
    );
  });

  it('keeps repo-root paths unchanged', () => {
    assert.equal(
      resolveRepoFilePath('docs/workgraph-intent-graph-mcp.md', 'work/analytics/foo.md'),
      'docs/workgraph-intent-graph-mcp.md',
    );
  });
});

describe('buildRepoFilePreview', () => {
  it('reads bounded repo-relative files without targetFiles allowlist', async () => {
    const preview = await buildRepoFilePreview('src/sample.mjs', {
      readFile: async () => 'export const marker = 1;\n',
    });

    assert.equal(preview.schema, REPO_FILE_PREVIEW_SCHEMA);
    assert.equal(preview.ok, true);
    assert.equal(preview.path, 'src/sample.mjs');
    assert.equal(preview.language, 'javascript');
    assert.match(preview.content, /marker/);
  });

  it('rejects traversal paths', async () => {
    const preview = await buildRepoFilePreview('../secret.txt', {
      readFile: async () => 'nope',
    });

    assert.equal(preview.ok, false);
    assert.match(preview.error, /traversal/i);
  });

  it('truncates oversized files', async () => {
    const preview = await buildRepoFilePreview('src/big.mjs', {
      maxBytes: 8,
      readFile: async () => '0123456789abcdef',
    });

    assert.equal(preview.ok, true);
    assert.equal(preview.truncated, true);
    assert.equal(Buffer.byteLength(preview.content, 'utf8'), 8);
    assert.equal(preview.byteLength, 16);
  });

  it('returns not found for missing files', async () => {
    const preview = await buildRepoFilePreview('missing/file.mjs', {
      readFile: async () => {
        const error = new Error('ENOENT: no such file');
        throw error;
      },
    });

    assert.equal(preview.ok, false);
    assert.equal(preview.error, 'file not found in workspace');
  });
});

describe('readRepoFilePreviewFromRequest', () => {
  it('requires path query param', async () => {
    const result = await readRepoFilePreviewFromRequest(new URL('http://localhost/api/repo-file/preview'));
    assert.equal(result.status, 400);
    assert.equal(result.body.error, 'missing_path');
  });

  it('resolves relative path with base query param', async () => {
    const result = await readRepoFilePreviewFromRequest(
      new URL('http://localhost/api/repo-file/preview?path=pvrg-verified-reference-graph.md&base=work/analytics/work-graph-intent-information-plane.md'),
      {
        readFile: async (filePath) => {
          assert.match(String(filePath).replace(/\\/gu, '/'), /work\/analytics\/pvrg-verified-reference-graph\.md$/u);
          return '# PVRG\n';
        },
      },
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.path, 'work/analytics/pvrg-verified-reference-graph.md');
  });

  it('returns preview payload for valid path', async () => {
    const result = await readRepoFilePreviewFromRequest(
      new URL('http://localhost/api/repo-file/preview?path=tests/foo.mjs'),
      {
        readFile: async () => 'export {};\n',
      },
    );

    assert.equal(result.status, 200);
    assert.equal(result.body.ok, true);
    assert.equal(result.body.path, 'tests/foo.mjs');
    assert.equal(result.body.schema, REPO_FILE_PREVIEW_SCHEMA);
    assert.equal(REPO_FILE_PREVIEW_MAX_BYTES, 131_072);
  });

  it('rejects traversal via HTTP handler', async () => {
    const result = await readRepoFilePreviewFromRequest(
      new URL('http://localhost/api/repo-file/preview?path=..%2Fsecret.txt'),
      {
        readFile: async () => 'nope',
      },
    );

    assert.equal(result.status, 400);
    assert.equal(result.body.ok, false);
  });
});
