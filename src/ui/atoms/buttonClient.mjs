/**
 * Browser-inline button renderer (no imports). Injected into backlog UI client script.
 * @param {Record<string, unknown>} props
 */
export function renderClientUiButton(props = {}) {
  const escapeAttr = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');

  const escapeText = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const VARIANT_CLASS = {
    primary: 'wg-btn--primary',
    secondary: 'wg-btn--secondary',
    flat: 'wg-btn--flat',
    soft: 'wg-btn--soft',
  };
  const SIZE_CLASS = {
    sm: 'wg-btn--sm',
    xs: 'wg-btn--xs',
    md: 'wg-btn--md',
  };

  const label = props.label ?? '';
  const variant = VARIANT_CLASS[props.variant] ? props.variant : 'secondary';
  const size = SIZE_CLASS[props.size] ? props.size : 'sm';
  const classes = props.unstyled
    ? (props.className ?? '')
    : ['wg-btn', VARIANT_CLASS[variant], SIZE_CLASS[size], props.className ?? ''].filter(Boolean).join(' ');

  const attrs = [`class="${escapeAttr(classes)}"`, 'type="button"'];
  if (props.id) attrs.push(`id="${escapeAttr(props.id)}"`);
  if (props.testId) attrs.push(`data-testid="${escapeAttr(props.testId)}"`);
  if (props.disabled) attrs.push('disabled');
  if (props.attrs && typeof props.attrs === 'object') {
    for (const [key, value] of Object.entries(props.attrs)) {
      if (value == null || value === false) continue;
      if (value === true) attrs.push(key);
      else attrs.push(`${key}="${escapeAttr(String(value))}"`);
    }
  }

  const inner = props.labelHtml ?? escapeText(label);
  return `<button ${attrs.join(' ')}>${inner}</button>`;
}
