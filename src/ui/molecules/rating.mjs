import { escapeHtml, escapeHtmlAttr } from '../htmlEscape.mjs';

const SIZE_CLASS = {
  xs: 'wg-rating--xs',
  sm: 'wg-rating--sm',
  md: 'wg-rating--md',
  card: 'wg-rating--card',
  lg: 'wg-rating--lg',
  xl: 'wg-rating--xl',
};

const COLOR_CLASS = {
  blue: 'wg-rating--blue',
  'yellow-orange': 'wg-rating--yellow-orange',
  black: 'wg-rating--black',
};

/**
 * @param {{ value?: number | string, size?: string, color?: string, showValue?: boolean, testId?: string }} props
 */
export function renderUiRating(props = {}) {
  const size = SIZE_CLASS[props.size] ? props.size : 'md';
  const color = COLOR_CLASS[props.color] ? props.color : 'blue';
  const raw = props.value ?? 0;
  const hasPlus = String(raw).includes('+');
  const numeric = hasPlus ? 5 : Math.max(0, Math.min(5, Number(raw) || 0));
  const filled = hasPlus ? 5 : Math.round(numeric);
  const stars = Array.from({ length: 5 }, (_, index) =>
    `<span class="wg-rating__star${index < filled ? ' is-filled' : ''}" aria-hidden="true">★</span>`,
  ).join('');
  const valueHtml = props.showValue
    ? `<span class="wg-rating__value">${escapeHtml(hasPlus ? '5+' : String(numeric))}</span>`
    : '';
  const testId = props.testId ?? 'ui-rating';
  return `<div class="wg-rating ${SIZE_CLASS[size]} ${COLOR_CLASS[color]}" data-testid="${escapeHtmlAttr(testId)}" role="img" aria-label="Rating ${escapeHtmlAttr(String(raw))}">${valueHtml}<span class="wg-rating__stars">${stars}</span></div>`;
}

export const UI_RATING_CSS = `
.wg-rating { display: inline-flex; align-items: center; gap: var(--ui-rating-gap, 0.375rem); }
.wg-rating__stars { display: inline-flex; gap: 2px; color: rgb(var(--brand-border-rgb, 80 80 80)); }
.wg-rating__star.is-filled { color: rgb(var(--ui-rating-active-rgb, 0 102 255)); }
.wg-rating--yellow-orange .wg-rating__star.is-filled { color: rgb(245 158 11); }
.wg-rating--black .wg-rating__star.is-filled { color: rgb(0 0 0); }
.wg-rating__value { font-size: var(--ui-rating-value-font-size, 0.875rem); margin-right: 4px; }
.wg-rating--sm .wg-rating__stars { font-size: 0.875rem; }
.wg-rating--md .wg-rating__stars { font-size: 1.125rem; }
.wg-rating--lg .wg-rating__stars { font-size: 1.75rem; }
`;
