import { escapeHtml, escapeHtmlAttr } from '../htmlEscape.mjs';

const VARIANT_CLASS = {
  primary: 'wg-btn--primary',
  secondary: 'wg-btn--secondary',
  flat: 'wg-btn--flat',
  soft: 'wg-btn--soft',
  black: 'wg-btn--black',
  inverse: 'wg-btn--inverse',
};

const SIZE_CLASS = {
  lg: 'wg-btn--lg',
  md: 'wg-btn--md',
  sm: 'wg-btn--sm',
  xs: 'wg-btn--xs',
};

/**
 * @param {{
 *   label?: string,
 *   labelHtml?: string,
 *   variant?: string,
 *   size?: string,
 *   type?: string,
 *   disabled?: boolean,
 *   hidden?: boolean,
 *   testId?: string,
 *   id?: string,
 *   className?: string,
 *   href?: string | null,
 *   unstyled?: boolean,
 *   ariaLabel?: string,
 *   ariaPressed?: boolean | string,
 *   ariaSelected?: boolean | string,
 *   role?: string,
 *   attrs?: Record<string, string | number | boolean | null | undefined>,
 * }} props
 */
export function renderUiButton(props = {}) {
  const label = props.label ?? '';
  const variant = VARIANT_CLASS[props.variant] ? props.variant : 'primary';
  const size = SIZE_CLASS[props.size] ? props.size : 'md';
  const type = props.type ?? 'button';
  const classes = props.unstyled
    ? (props.className ?? '')
    : [
      'wg-btn',
      VARIANT_CLASS[variant],
      SIZE_CLASS[size],
      props.className ?? '',
    ].filter(Boolean).join(' ');
  const attrs = [
    `class="${escapeHtmlAttr(classes)}"`,
    props.id ? `id="${escapeHtmlAttr(props.id)}"` : '',
    props.testId ? `data-testid="${escapeHtmlAttr(props.testId)}"` : '',
    props.role ? `role="${escapeHtmlAttr(props.role)}"` : '',
    props.ariaLabel ? `aria-label="${escapeHtmlAttr(props.ariaLabel)}"` : '',
    props.ariaPressed != null
      ? `aria-pressed="${props.ariaPressed === true || props.ariaPressed === 'true' ? 'true' : 'false'}"`
      : '',
    props.ariaSelected != null
      ? `aria-selected="${props.ariaSelected === true || props.ariaSelected === 'true' ? 'true' : 'false'}"`
      : '',
    props.hidden ? 'hidden' : '',
    props.disabled ? 'disabled' : '',
  ].filter(Boolean);

  if (props.attrs) {
    for (const [key, value] of Object.entries(props.attrs)) {
      if (value == null || value === false) continue;
      if (value === true) attrs.push(key);
      else attrs.push(`${key}="${escapeHtmlAttr(String(value))}"`);
    }
  }

  const inner = props.labelHtml ?? escapeHtml(label);

  if (props.href) {
    return `<a href="${escapeHtmlAttr(props.href)}" ${attrs.join(' ')}>${inner}</a>`;
  }
  return `<button type="${escapeHtmlAttr(type)}" ${attrs.join(' ')}>${inner}</button>`;
}

export const UI_BUTTON_CSS = `
.wg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: var(--ui-radius-control, 0.375rem);
  font: inherit;
  cursor: pointer;
  text-decoration: none;
  color: rgb(var(--ui-accent-foreground-rgb, 255 255 255));
  background: rgb(var(--ui-accent-rgb, 0 102 255));
  padding: 8px 14px;
}
.wg-btn--primary:hover:not(:disabled),
.wg-btn:not([class*="wg-btn--"]):hover:not(:disabled) { background: rgb(var(--ui-accent-hover-rgb, 0 90 230)); }
.wg-btn:disabled { opacity: 0.55; cursor: not-allowed; }
.wg-btn--secondary { background: rgb(var(--ui-control-bg-rgb, 45 45 48)); color: rgb(var(--ui-text-rgb, 212 212 212)); border-color: rgb(var(--brand-border-rgb, 60 60 60)); }
.wg-btn--secondary:hover:not(:disabled) { background: rgb(var(--ui-control-bg-hover-rgb, 60 60 60)); color: rgb(var(--ui-text-rgb, 212 212 212)); }
.wg-btn--flat { background: transparent; color: rgb(var(--ui-link-rgb, 0 102 255)); }
.wg-btn--flat:hover:not(:disabled) { background: rgba(var(--ui-accent-rgb, 0 102 255), 0.12); color: rgb(var(--ui-link-hover-rgb, 0 90 230)); }
.wg-btn--soft { background: rgba(var(--ui-accent-rgb, 0 102 255), 0.16); color: rgb(var(--ui-accent-rgb, 0 102 255)); }
.wg-btn--soft:hover:not(:disabled) { background: rgba(var(--ui-accent-rgb, 0 102 255), 0.24); color: rgb(var(--ui-accent-rgb, 0 102 255)); }
.wg-btn--black { background: rgb(var(--ui-cta-rgb, 0 0 0)); color: rgb(var(--ui-cta-foreground-rgb, 255 255 255)); }
.wg-btn--inverse { background: rgb(var(--ui-surface-rgb, 37 37 38)); color: rgb(var(--ui-text-rgb, 212 212 212)); border-color: rgb(var(--brand-border-rgb, 60 60 60)); }
.wg-btn--sm { padding: 4px 10px; font-size: 13px; }
.wg-btn--xs { padding: 2px 8px; font-size: 12px; }
.wg-btn--lg { padding: 10px 18px; font-size: 15px; }
`;
