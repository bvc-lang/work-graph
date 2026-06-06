import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import {
  NAV_VIEW_ICON_FILES,
  normalizeInlineSvg,
  readPublicIconSvg,
  renderInlineIcon,
  renderNavViewIcon,
  renderThemeIcon,
} from '../src/ui/iconAssets.mjs';
import { renderUiCheckbox } from '../src/ui/atoms/checkbox.mjs';

describe('iconAssets', () => {
  it('reads bold SVG icons from public/assets/icons', () => {
    const raw = readPublicIconSvg('moon-bold.svg');
    assert.match(raw, /^<svg/u);
    assert.match(raw, /viewBox="0 0 256 256"/u);
  });

  it('normalizes inline SVG with class and size', () => {
    const normalized = normalizeInlineSvg('<svg viewBox="0 0 256 256"></svg>', {
      className: 'nav-tab-icon',
      size: 18,
    });
    assert.match(normalized, /class="nav-tab-icon"/u);
    assert.match(normalized, /width="18"/u);
    assert.match(normalized, /aria-hidden="true"/u);
  });

  it('renders nav icons for all sidebar views', () => {
    for (const view of Object.keys(NAV_VIEW_ICON_FILES)) {
      const html = renderNavViewIcon(view);
      assert.match(html, /class="nav-tab-icon"/u);
      assert.match(html, /stroke="currentColor"/u);
    }
  });

  it('renders theme toggle icons', () => {
    assert.match(renderThemeIcon('moon'), /class="header-theme-toggle-icon"/u);
    assert.match(renderThemeIcon('sun'), /class="header-theme-toggle-icon"/u);
    assert.match(renderThemeIcon('sun'), /fill="currentColor"/u);
  });

  it('renders checkbox with Gripe form-native-checkable class', () => {
    assert.match(renderUiCheckbox({ testId: 'demo' }), /class="form-native-checkable"/u);
  });

  it('renderInlineIcon uses currentColor strokes from asset pack', () => {
    const html = renderInlineIcon('gear-bold.svg', { className: 'nav-tab-icon', size: 18 });
    assert.match(html, /currentColor/u);
    assert.match(html, /class="nav-tab-icon"/u);
  });
});
