import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  highlightBvcBlock,
  highlightCodeBlock,
  highlightMcpFlow,
  normalizeCodeLanguage,
} from '../src/codeSyntaxHighlight.mjs';
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

describe('highlightBvcBlock', () => {
  it('highlights atom header, sections and labels', () => {
    const html = highlightBvcBlock(`#Task@ru<[
Базис:
  profile: work_item
]>`);

    assert.match(html, /code-hl-keyword">#Task<\/span>/);
    assert.match(html, /code-hl-key">Базис<\/span>/);
    assert.match(html, /code-hl-key">profile<\/span>/);
    assert.match(html, /code-hl-string">work_item<\/span>/);
  });

  it('highlights work item section headers in Russian', () => {
    const html = highlightBvcBlock(`Проверки:
  ADR accepted
Свидетельства:
  npm test passed`);

    assert.match(html, /code-hl-key">Проверки<\/span>/);
    assert.match(html, /code-hl-key">Свидетельства<\/span>/);
  });
});

describe('highlightMcpFlow', () => {
  it('highlights arrows, calls and strings', () => {
    const html = highlightMcpFlow('claim_work_item("x")\n→ get_work_contract(work_id)');

    assert.match(html, /code-hl-key">claim_work_item<\/span>/);
    assert.match(html, /code-hl-string">&quot;x&quot;<\/span>/);
    assert.match(html, /code-hl-punct">→<\/span>/);
    assert.match(html, /code-hl-key">get_work_contract<\/span>/);
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
