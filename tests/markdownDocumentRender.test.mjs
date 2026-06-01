import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { renderInlineMarkdown, renderMarkdownDocument, stripAnalyticsBodyPreamble } from '../src/markdownDocumentRender.mjs';

describe('renderInlineMarkdown', () => {
  it('renders inline code and bold', () => {
    const html = renderInlineMarkdown('Use `POSITIONS` and **bold** text');
    assert.match(html, /<code class="inline-term">POSITIONS<\/code>/);
    assert.match(html, /<strong>bold<\/strong>/);
  });
});

describe('renderMarkdownDocument', () => {
  it('renders headings, lists, table and code fence', () => {
    const html = renderMarkdownDocument(`# Title

## Section

Paragraph with **bold**.

- one
- two

| A | B |
|---|---|
| x | y |

\`\`\`yaml
key: value
\`\`\`
`);

    assert.match(html, /class="markdown-doc"/);
    assert.match(html, /<h1 class="markdown-h1">Title<\/h1>/);
    assert.match(html, /<h2 class="markdown-h2">Section<\/h2>/);
    assert.match(html, /<strong>bold<\/strong>/);
    assert.match(html, /<ul class="markdown-list">/);
    assert.match(html, /<table class="markdown-table">/);
    assert.match(html, /<pre class="markdown-code-block">/);
    assert.doesNotMatch(html, /^# Title/m);
  });

  it('strips analytics preamble from markdown body', () => {
    const stripped = stripAnalyticsBodyPreamble(`# Title

**Запрос:** question?

**Тема:** ui/test
**Связанные файлы:** \`a.mjs\`

---

## Answer

Body text.
`);

    assert.match(stripped, /^## Answer/u);
    assert.doesNotMatch(stripped, /Запрос/u);
    assert.doesNotMatch(stripped, /Связанные файлы/u);
  });

  it('renders mermaid blocks as mount targets', () => {
    const html = renderMarkdownDocument('```mermaid\nflowchart TB\n  A --> B\n```');
    assert.match(html, /data-testid="markdown-mermaid"/);
    assert.match(html, /<div class="mermaid">flowchart TB/u);
    assert.doesNotMatch(html, /отдельный viewer/u);
  });
});
