import { escapeHtml, escapeHtmlAttr } from '../htmlEscape.mjs';

/**
 * @param {{
 *   id?: string,
 *   name?: string,
 *   value?: string,
 *   placeholder?: string,
 *   type?: string,
 *   disabled?: boolean,
 *   testId?: string,
 *   className?: string,
 *   autocomplete?: string,
 * }} props
 */
export function renderUiTextInput(props = {}) {
  const classes = ['wg-input', props.className].filter(Boolean).join(' ');
  const name = props.name ?? '';
  const value = props.value ?? '';
  const placeholder = props.placeholder ?? '';
  const type = props.type ?? 'text';
  const attrs = [
    `class="${escapeHtmlAttr(classes)}"`,
    props.id ? `id="${escapeHtmlAttr(props.id)}"` : '',
    name ? `name="${escapeHtmlAttr(name)}"` : '',
    `type="${escapeHtmlAttr(type)}"`,
    placeholder ? `placeholder="${escapeHtmlAttr(placeholder)}"` : '',
    value ? `value="${escapeHtmlAttr(value)}"` : '',
    props.autocomplete ? `autocomplete="${escapeHtmlAttr(props.autocomplete)}"` : '',
    props.disabled ? 'disabled' : '',
    props.testId ? `data-testid="${escapeHtmlAttr(props.testId)}"` : '',
  ].filter(Boolean).join(' ');
  return `<input ${attrs}>`;
}

export const UI_INPUT_CSS = `
.wg-input {
  background: rgb(var(--ui-control-bg-rgb, 242 242 242));
  border: 2px solid transparent;
  border-radius: var(--ui-radius-control, 0.75rem);
  box-sizing: border-box;
  color: rgb(var(--ui-text-rgb, 15 23 42));
  font: inherit;
  font-size: var(--text-base, 0.9375rem);
  line-height: 1.5;
  min-height: 48px;
  padding: 10px 20px;
  transition: border-color 0.15s ease, background-color 0.15s ease;
  width: 100%;
}
.wg-input::placeholder {
  color: rgb(var(--ui-muted-rgb, 100 116 139));
}
.wg-input:hover:not(:disabled) {
  border-color: rgb(var(--ui-accent-rgb, 0 0 0));
}
.wg-input:focus {
  background: rgb(var(--ui-control-bg-rgb, 242 242 242));
  border-color: rgb(var(--ui-accent-rgb, 0 0 0));
  outline: none;
}
.wg-input:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.wg-input--toolbar {
  flex: 0 1 280px;
  min-height: 48px;
  min-width: 180px;
}
.wg-input--search {
  background: transparent;
  border-color: transparent;
  min-height: auto;
  padding: 14px 16px;
  width: 100%;
}
.wg-input--search:hover:not(:disabled),
.wg-input--search:focus {
  background: rgb(var(--ui-control-bg-rgb, 242 242 242));
  border-color: rgb(var(--ui-accent-rgb, 0 0 0));
}
`;
