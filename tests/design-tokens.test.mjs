import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

import { applyTheme, THEME_FILE_BY_ID } from '../packages/design-tokens/build/applyTheme.mjs';
import { loadThemeTokens, themeFileToCss } from '../packages/design-tokens/build/tokens-to-css.mjs';

describe('design-tokens', () => {
  it('loads marketplace-default theme with brand and ui sections', () => {
    const tokens = loadThemeTokens('themes/marketplace-default.json');
    assert.equal(tokens.themeId, 'marketplace-default');
    assert.equal(tokens.brand.primaryRgb, '245 158 11');
    assert.equal(tokens.ui.accentRgb, '12 115 254');
  });

  it('generates CSS with --brand-* and --ui-* variables', () => {
    const css = themeFileToCss('themes/workgraph-dark.json');
    assert.match(css, /--brand-primary-rgb: 29 122 252/);
    assert.match(css, /--brand-font-sans: 'Graphik LCG'/);
    assert.match(css, /--text-base: 0\.9375rem/);
    assert.match(css, /--text-sm: 0\.8125rem/);
    assert.match(css, /--ui-accent-rgb: 133 184 255/);
    assert.match(css, /--brand-bg-rgb: 29 33 37/);
  });

  it('generates gripe-dark-default CSS with Gripe amber accent', () => {
    const css = themeFileToCss('themes/gripe-dark-default.json');
    assert.match(css, /--brand-primary-rgb: 245 158 11/);
    assert.match(css, /--ui-accent-rgb: 245 158 11/);
    assert.match(css, /theme: gripe-dark-default/);
  });

  it('applyTheme sets gripe-dark-default accent on a style bag', () => {
    const style = new Map();
    const root = {
      style: {
        setProperty(name, value) {
          style.set(name, value);
        },
      },
      setAttribute() {},
    };
    applyTheme('gripe-dark-default', root);
    assert.equal(style.get('--ui-accent-rgb'), '245 158 11');
    assert.ok(THEME_FILE_BY_ID['gripe-dark-default']);
  });
});
