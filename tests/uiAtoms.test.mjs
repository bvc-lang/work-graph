import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { renderUiBadge, UI_BADGE_CSS } from '../src/ui/atoms/badge.mjs';
import { renderUiButton } from '../src/ui/atoms/button.mjs';
import { renderUiIcon } from '../src/ui/atoms/icon.mjs';
import { renderUiSelect } from '../src/ui/atoms/select.mjs';
import { renderUiTextInput } from '../src/ui/atoms/input.mjs';
import { renderUiModal } from '../src/ui/atoms/modal.mjs';
import { renderUiKitPageHtml } from '../src/ui/pages/uiKitPage.mjs';

describe('ui atoms', () => {
  it('renders button variants with test ids', () => {
    const html = renderUiButton({ label: 'Go', variant: 'primary', testId: 'btn-go' });
    assert.match(html, /data-testid="btn-go"/);
    assert.match(html, /wg-btn--primary/);
  });

  it('renders unstyled nav shell button with data-view', () => {
    const html = renderUiButton({
      unstyled: true,
      className: 'nav-tab',
      label: 'Home',
      attrs: { 'data-view': 'home', 'aria-selected': 'true' },
    });
    assert.match(html, /class="nav-tab"/);
    assert.doesNotMatch(html, /wg-btn--primary/);
    assert.match(html, /data-view="home"/);
  });

  it('badge css uses theme-aware surface tokens for muted tone', () => {
    assert.match(UI_BADGE_CSS, /\.wg-badge--muted \{ background: var\(--panel-2\); color: var\(--muted\); \}/);
    assert.doesNotMatch(UI_BADGE_CSS, /--ui-control-bg-rgb/);
  });

  it('renders badge, input, icon, modal', () => {
    assert.match(renderUiBadge({ label: 'ready', tone: 'accent' }), /wg-badge--accent/);
    assert.match(renderUiTextInput({ placeholder: 'x', testId: 'inp' }), /data-testid="inp"/);
    assert.match(renderUiSelect({ testId: 'sel', options: [{ value: 'a', label: 'A' }] }), /class="wg-select"/);
    assert.match(renderUiIcon({ name: 'dot' }), /data-icon="dot"/);
    assert.match(renderUiModal({ title: 'T' }), /data-testid="ui-modal"/);
  });

  it('ui-kit page includes all atom sections', () => {
    const html = renderUiKitPageHtml();
    assert.match(html, /data-testid="ui-kit-root"/);
    assert.match(html, /ui-kit-section-button/);
    assert.match(html, /ui-kit-section-modal/);
    assert.match(html, /ui-kit-section-rating/);
    assert.match(html, /ui-kit-section-select/);
    assert.match(html, /ui-kit-section-tabs/);
  });
});
