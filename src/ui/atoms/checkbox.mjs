import { escapeHtml, escapeHtmlAttr } from '../htmlEscape.mjs';

/**
 * @param {{
 *   id?: string,
 *   name?: string,
 *   value?: string,
 *   checked?: boolean,
 *   disabled?: boolean,
 *   testId?: string,
 *   className?: string,
 * }} props
 */
export function renderUiCheckbox(props = {}) {
  const classes = ['form-native-checkable', props.className].filter(Boolean).join(' ');
  const attrs = [
    'type="checkbox"',
    `class="${escapeHtmlAttr(classes)}"`,
    props.id ? `id="${escapeHtmlAttr(props.id)}"` : '',
    props.name ? `name="${escapeHtmlAttr(props.name)}"` : '',
    props.value ? `value="${escapeHtmlAttr(props.value)}"` : '',
    props.checked ? 'checked' : '',
    props.disabled ? 'disabled' : '',
    props.testId ? `data-testid="${escapeHtmlAttr(props.testId)}"` : '',
  ].filter(Boolean).join(' ');
  return `<input ${attrs}>`;
}

export const UI_CHECKBOX_CSS = `
.form-native-checkable {
  accent-color: rgb(var(--ui-control-checked-rgb, 0 0 0));
  background-color: rgb(var(--ui-control-bg-hover-rgb, 226 232 240));
  border: 0;
  box-sizing: border-box;
  color: rgb(var(--ui-control-checked-rgb, 0 0 0));
  cursor: pointer;
  flex-shrink: 0;
  height: 21px;
  margin: 0;
  width: 21px;
}
.ui-checkable-label {
  align-items: center;
  cursor: pointer;
  display: inline-flex;
  gap: 10px;
}
.ui-checkable-label:has(.form-native-checkable:disabled) {
  cursor: not-allowed;
  opacity: 0.7;
}
.form-native-checkable:focus {
  outline: none;
}
.form-native-checkable:focus-visible {
  box-shadow:
    0 0 0 2px rgb(255 255 255),
    0 0 0 4px rgb(var(--ui-focus-ring-rgb, 0 0 0) / 0.22) !important;
  outline: none;
}
.form-native-checkable:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
`;
