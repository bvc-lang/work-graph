import { escapeHtml, escapeHtmlAttr } from '../htmlEscape.mjs';

const CHECKBOX_CHECKMARK_SVG =
  "url(\"data:image/svg+xml,%3csvg viewBox='0 0 16 16' fill='white' xmlns='http://www.w3.org/2000/svg'%3e" +
  "%3cpath d='M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z'/%3e%3c/svg%3e\")";

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
  -webkit-appearance: none;
  appearance: none;
  accent-color: rgb(var(--ui-control-checked-rgb, 0 0 0));
  background-color: rgb(var(--ui-control-bg-hover-rgb, 226 232 240));
  background-position: center;
  background-repeat: no-repeat;
  background-size: 100% 100%;
  border: 0;
  border-radius: var(--ui-radius-control-sm, 0.25rem);
  box-sizing: border-box;
  color: rgb(var(--ui-control-checked-rgb, 0 0 0));
  cursor: pointer;
  flex-shrink: 0;
  height: 21px;
  margin: 0;
  print-color-adjust: exact;
  vertical-align: middle;
  width: 21px;
}
.form-native-checkable:checked {
  background-color: rgb(0 0 0);
  background-image: ${CHECKBOX_CHECKMARK_SVG};
  border-color: transparent;
}
.ui-checkable-label {
  align-items: center;
  cursor: pointer;
  display: inline-flex;
  gap: 12px;
}
.ui-checkable-label:has(.form-native-checkable:disabled) {
  cursor: not-allowed;
  opacity: 0.7;
}
.form-native-checkable:focus {
  box-shadow: none !important;
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
