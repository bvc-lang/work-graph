import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { highlightCodeBlock, normalizeCodeLanguage } from '../src/codeSyntaxHighlight.mjs';
import { renderMarkdownDocument } from '../src/markdownDocumentRender.mjs';

describe('normalizeCodeLanguage', () => {
  it('maps common aliases', () => {
    assert.equal(normalizeCodeLanguage('yml'), 'yaml');
    assert.equal(normalizeCodeLanguage('js'), 'javascript');
  });
});

describe('highlightCodeBlock', () => {
  it('highlights yaml keys and strings', () => {
    const html = highlightCodeBlock(
      'layout.profile: layered-dag-v1\nlayout.ranks: { work-graph: 1, storage: 3 }',
      'yaml',
    );

    assert.match(html, /class="code-hl-key">layout\.profile<\/span>/);
    assert.match(html, /class="code-hl-string">layered-dag-v1<\/span>/);
    assert.match(html, /class="code-hl-key">work-graph<\/span>/);
  });
});

describe('renderMarkdownDocument code fences', () => {
  it('renders highlighted yaml fence', () => {
    const html = renderMarkdownDocument('```yaml\nlayout.profile: layered-dag-v1\n```');
    assert.match(html, /class="markdown-code-block"/);
    assert.match(html, /language-yaml/);
    assert.match(html, /code-hl-key/);
    assert.doesNotMatch(html, /&lt;span class="code-hl-key"/);
  });
});
