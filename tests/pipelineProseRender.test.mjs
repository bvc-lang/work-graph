import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  formatVerdictRu,
  renderPipelineInlineText,
  renderPipelineProse,
} from '../src/pipelineProseRender.mjs';

describe('renderPipelineProse', () => {
  it('splits inline section labels into heading and paragraph', () => {
    const html = renderPipelineProse([
      'Целесообразность: Стоит завести задачу в backlog — intake AN-1.',
      'Контекст и scope: Описать protocols/graph-canvas-layout-profile-v1.bvc.',
      'Verdict: useful',
    ].join('\n'));

    assert.match(html, /<h4 class="pipeline-prose-heading">Целесообразность<\/h4>/u);
    assert.match(html, /<p class="pipeline-prose-p">Стоит завести задачу/u);
    assert.match(html, /<h4 class="pipeline-prose-heading">Контекст и scope<\/h4>/u);
    assert.match(html, /<code class="inline-term">protocols\/graph-canvas-layout-profile-v1\.bvc<\/code>/u);
  });

  it('supports standalone section headings on their own line', () => {
    const html = renderPipelineProse('Целесообразность:\nСтоит брать в работу.');

    assert.match(html, /<h4 class="pipeline-prose-heading">Целесообразность<\/h4>/u);
    assert.match(html, /<p class="pipeline-prose-p">Стоит брать в работу\./u);
  });

  it('splits multiple inline section labels on one line', () => {
    const html = renderPipelineProse(
      'Целесообразность: OneBase нельзя смешивать с рантаймом. Контекст и границы: роль domain; поддерево domains/onebase/.',
    );

    assert.match(html, /<h4 class="pipeline-prose-heading">Целесообразность<\/h4>/u);
    assert.match(html, /<h4 class="pipeline-prose-heading">Контекст и границы<\/h4>/u);
    assert.doesNotMatch(html, /\\n/u);
  });

  it('normalizes literal \\n escape sequences before rendering', () => {
    const html = renderPipelineProse('Целесообразность: Первая часть. \\n Контекст и границы: Вторая часть.');

    assert.match(html, /<h4 class="pipeline-prose-heading">Контекст и границы<\/h4>/u);
    assert.doesNotMatch(html, /\\n/u);
  });
});

describe('formatVerdictRu', () => {
  it('maps pipeline verdict codes to Russian labels', () => {
    assert.equal(formatVerdictRu('useful'), 'полезно');
    assert.equal(formatVerdictRu('harmful'), 'вредно');
    assert.equal(formatVerdictRu('defer'), 'отложить');
  });
});

describe('renderPipelineInlineText', () => {
  it('wraps depends_on and repo paths', () => {
    const html = renderPipelineInlineText('depends_on=foo, bar; src/workGraphBacklogUiServer.mjs');
    assert.match(html, /<code class="inline-term">depends_on=foo<\/code>/u);
    assert.match(html, /<code class="inline-term">src\/workGraphBacklogUiServer\.mjs<\/code>/u);
  });
});
