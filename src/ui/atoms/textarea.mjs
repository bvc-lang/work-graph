import { escapeHtml, escapeHtmlAttr } from '../htmlEscape.mjs';

/**
 * @param {{
 *   id?: string,
 *   name?: string,
 *   value?: string,
 *   placeholder?: string,
 *   rows?: number,
 *   disabled?: boolean,
 *   testId?: string,
 *   className?: string,
 * }} props
 */
export function renderUiTextarea(props = {}) {
  const classes = ['wg-textarea', props.className].filter(Boolean).join(' ');
  const rows = Math.max(2, Number(props.rows) || 4);
  const attrs = [
    `class="${escapeHtmlAttr(classes)}"`,
    props.id ? `id="${escapeHtmlAttr(props.id)}"` : '',
    props.name ? `name="${escapeHtmlAttr(props.name)}"` : '',
    `rows="${rows}"`,
    props.placeholder ? `placeholder="${escapeHtmlAttr(props.placeholder)}"` : '',
    props.disabled ? 'disabled' : '',
    props.testId ? `data-testid="${escapeHtmlAttr(props.testId)}"` : '',
  ].filter(Boolean).join(' ');
  const value = props.value ?? '';
  return `<textarea ${attrs}>${escapeHtml(value)}</textarea>`;
}

export const UI_TEXTAREA_CSS = `
.wg-textarea {
  background: rgb(var(--ui-control-bg-rgb, 242 242 242));
  border: 2px solid transparent;
  border-radius: var(--ui-radius-control, 0.75rem);
  box-sizing: border-box;
  color: rgb(var(--ui-text-rgb, 15 23 42));
  font: inherit;
  font-size: var(--text-base, 0.9375rem);
  line-height: 1.5;
  min-height: 96px;
  padding: 12px 20px;
  resize: vertical;
  transition: border-color 0.15s ease, background-color 0.15s ease;
  width: 100%;
}
.wg-textarea::placeholder {
  color: rgb(var(--ui-muted-rgb, 100 116 139));
}
.wg-textarea:hover:not(:disabled) {
  border-color: rgb(var(--ui-accent-rgb, 0 0 0));
}
.wg-textarea:focus {
  background: rgb(var(--ui-control-bg-rgb, 242 242 242));
  border-color: rgb(var(--ui-accent-rgb, 0 0 0));
  outline: none;
}
.wg-textarea:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.wg-textarea--mono {
  font-family: var(--brand-font-mono, ui-monospace, monospace);
  font-size: var(--text-sm, 0.8125rem);
}
`;
