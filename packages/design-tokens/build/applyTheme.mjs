import { loadThemeTokens } from './tokens-to-css.mjs';

const UI_CSS_MAP = {
  accentRgb: '--ui-accent-rgb',
  accentHoverRgb: '--ui-accent-hover-rgb',
  accentActiveRgb: '--ui-accent-active-rgb',
  accentForegroundRgb: '--ui-accent-foreground-rgb',
  linkRgb: '--ui-link-rgb',
  linkHoverRgb: '--ui-link-hover-rgb',
  linkActiveRgb: '--ui-link-active-rgb',
  textRgb: '--ui-text-rgb',
  mutedRgb: '--ui-muted-rgb',
  surfaceRgb: '--ui-surface-rgb',
  surfaceMutedRgb: '--ui-surface-muted-rgb',
  surfaceHoverRgb: '--ui-surface-hover-rgb',
  controlBgRgb: '--ui-control-bg-rgb',
  controlBgHoverRgb: '--ui-control-bg-hover-rgb',
  controlCheckedRgb: '--ui-control-checked-rgb',
  controlCheckedForegroundRgb: '--ui-control-checked-foreground-rgb',
  focusRingRgb: '--ui-focus-ring-rgb',
  dangerRgb: '--ui-danger-rgb',
  ctaRgb: '--ui-cta-rgb',
  ctaHoverRgb: '--ui-cta-hover-rgb',
  ctaActiveRgb: '--ui-cta-active-rgb',
  ctaForegroundRgb: '--ui-cta-foreground-rgb',
  ratingActiveRgb: '--ui-rating-active-rgb',
  radiusCard: '--ui-radius-card',
  radiusModal: '--ui-radius-modal',
  radiusControlLg: '--ui-radius-control-lg',
  radiusControl: '--ui-radius-control',
  radiusControlSm: '--ui-radius-control-sm',
};

const BRAND_CSS_MAP = {
  fontSans: '--brand-font-sans',
  radiusSm: '--brand-radius-sm',
  radiusMd: '--brand-radius-md',
  radiusLg: '--brand-radius-lg',
  primaryRgb: '--brand-primary-rgb',
  primaryForegroundRgb: '--brand-primary-foreground-rgb',
  bgRgb: '--brand-bg-rgb',
  surfaceRgb: '--brand-surface-rgb',
  borderRgb: '--brand-border-rgb',
  mutedRgb: '--brand-muted-rgb',
  scrollbarTrack: '--brand-scrollbar-track',
  scrollbarThumb: '--brand-scrollbar-thumb',
  scrollbarThumbHover: '--brand-scrollbar-thumb-hover',
};

const THEME_FILE_BY_ID = {
  'marketplace-default': 'themes/marketplace-default.json',
  'marketplace-psychology': 'themes/marketplace-default.json',
  'workgraph-dark': 'themes/workgraph-dark.json',
  'workgraph-cursor-dark': 'themes/workgraph-dark.json',
  'gripe-dark-default': 'themes/gripe-dark-default.json',
  'gripe-default': 'themes/gripe-dark-default.json',
};

function applySection(root, map, section) {
  if (!section || typeof section !== 'object') {
    return;
  }
  for (const [jsonKey, cssVar] of Object.entries(map)) {
    const value = section[jsonKey];
    if (value !== undefined && value !== '') {
      root.style.setProperty(cssVar, value);
    }
  }
}

/**
 * Apply shared theme tokens to a DOM root (browser) or style bag (SSR/tests).
 * @param {string} themeId
 * @param {HTMLElement | { style: CSSStyleDeclaration }} root
 */
export function applyTheme(themeId, root) {
  const themeFile = THEME_FILE_BY_ID[themeId];
  if (!themeFile) {
    throw new Error(`unknown theme id: ${themeId}`);
  }
  const tokens = loadThemeTokens(themeFile);
  applySection(root, BRAND_CSS_MAP, tokens.brand);
  applySection(root, UI_CSS_MAP, tokens.ui);
  if (root?.setAttribute) {
    root.setAttribute('data-iohasc-theme', themeId);
  }
  return tokens;
}

export { THEME_FILE_BY_ID };
