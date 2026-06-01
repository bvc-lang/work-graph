import { escapeHtml, escapeHtmlAttr } from '../htmlEscape.mjs';

/**
 * @param {{ name?: string, value?: string, placeholder?: string, type?: string, disabled?: boolean, testId?: string }} props
 */
export function renderUiTextInput(props = {}) {
  const name = props.name ?? '';
  const value = props.value ?? '';
  const placeholder = props.placeholder ?? '';
  const type = props.type ?? 'text';
  const attrs = [
    'class="wg-input"',
    name ? `name="${escapeHtmlAttr(name)}"` : '',
    `type="${escapeHtmlAttr(type)}"`,
    placeholder ? `placeholder="${escapeHtmlAttr(placeholder)}"` : '',
    value ? `value="${escapeHtmlAttr(value)}"` : '',
    props.disabled ? 'disabled' : '',
    props.testId ? `data-testid="${escapeHtmlAttr(props.testId)}"` : '',
  ].filter(Boolean).join(' ');
  return `<input ${attrs}>`;
}

export const UI_INPUT_CSS = `
.wg-input {
  width: 100%;
  box-sizing: border-box;
  border: 1px solid rgb(var(--brand-border-rgb, 60 60 60));
  border-radius: var(--ui-radius-control-sm, 0.25rem);
  background: rgb(var(--ui-control-bg-rgb, 45 45 48));
  color: rgb(var(--ui-text-rgb, 212 212 212));
  padding: 8px 10px;
  font: inherit;
}
.wg-input:focus {
  outline: 2px solid rgb(var(--ui-focus-ring-rgb, 0 102 255));
  outline-offset: 1px;
}
`;
