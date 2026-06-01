import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { renderUiRating } from '../src/ui/molecules/rating.mjs';
import { renderUiTabsGroup } from '../src/ui/molecules/tabs.mjs';

describe('ui molecules', () => {
  it('renders rating with stars and value', () => {
    const html = renderUiRating({ value: 4, showValue: true, testId: 'rating-demo' });
    assert.match(html, /data-testid="rating-demo"/);
    assert.match(html, /wg-rating__star is-filled/);
    assert.match(html, /wg-rating__value/);
  });

  it('renders tabs group with triggers', () => {
    const html = renderUiTabsGroup({
      testId: 'tabs-demo',
      tabs: [
        { id: 'a', label: 'One', selected: true, elementId: 'tab-a', dataAttrKey: 'data-workflow-tab', countId: 'tab-a-count', count: 3 },
        { id: 'b', label: 'Two', dataAttrKey: 'data-workflow-tab' },
      ],
    });
    assert.match(html, /data-testid="tabs-demo"/);
    assert.match(html, /role="tablist"/);
    assert.match(html, /id="tab-a"/);
    assert.match(html, /data-workflow-tab="b"/);
    assert.match(html, /id="tab-a-count"/);
    assert.match(html, /is-active/);
  });
});
