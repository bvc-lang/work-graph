import { escapeHtml, escapeHtmlAttr } from '../htmlEscape.mjs';

/**
 * @param {{ value?: string, label?: string, selected?: boolean }} option
 */
function renderOption(option) {
  if (typeof option === 'string') {
    return `<option value="${escapeHtmlAttr(option)}">${escapeHtml(option)}</option>`;
  }
  const value = option.value ?? '';
  const label = option.label ?? value;
  const selected = option.selected ? ' selected' : '';
  return `<option value="${escapeHtmlAttr(value)}"${selected}>${escapeHtml(label)}</option>`;
}

/**
 * @param {{
 *   id?: string,
 *   name?: string,
 *   value?: string,
 *   options?: Array<string | { value?: string, label?: string, selected?: boolean }>,
 *   disabled?: boolean,
 *   hidden?: boolean,
 *   testId?: string,
 *   ariaLabel?: string,
 *   className?: string,
 * }} props
 */
export function renderUiSelect(props = {}) {
  const options = props.options ?? [];
  const optionsHtml = options.map((option) => {
    if (typeof option === 'object' && option.value != null && props.value === option.value) {
      return renderOption({ ...option, selected: true });
    }
    return renderOption(option);
  }).join('');

  const classes = ['wg-select', props.className].filter(Boolean).join(' ');
  const attrs = [
    `class="${escapeHtmlAttr(classes)}"`,
    props.id ? `id="${escapeHtmlAttr(props.id)}"` : '',
    props.name ? `name="${escapeHtmlAttr(props.name)}"` : '',
    props.disabled ? 'disabled' : '',
    props.hidden ? 'hidden' : '',
    props.testId ? `data-testid="${escapeHtmlAttr(props.testId)}"` : '',
    props.ariaLabel ? `aria-label="${escapeHtmlAttr(props.ariaLabel)}"` : '',
  ].filter(Boolean).join(' ');

  return `<select ${attrs}>${optionsHtml}</select>`;
}

export const UI_SELECT_CHEVRON_LIGHT = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%235e6c84' d='M2.5 4.5 6 8l3.5-3.5'/%3E%3C/svg%3E\")";
export const UI_SELECT_CHEVRON_DARK = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%239d9d9d' d='M2.5 4.5 6 8l3.5-3.5'/%3E%3C/svg%3E\")";

export const UI_SELECT_CSS = `
.wg-select {
  box-sizing: border-box;
  border: 1px solid var(--border);
  border-radius: var(--ui-radius-control-sm, 0.25rem);
  background-color: var(--panel-2);
  color: var(--text);
  padding: 8px 28px 8px 10px;
  font: inherit;
  font-size: 14px;
  line-height: 1.2;
  appearance: none;
  -webkit-appearance: none;
  color-scheme: light;
  background-image: ${UI_SELECT_CHEVRON_LIGHT};
  background-repeat: no-repeat;
  background-size: 12px 12px;
  background-position: right 8px center;
  cursor: pointer;
}
.wg-select:hover {
  background-color: var(--panel);
}
.wg-select:focus {
  outline: none;
  border-color: var(--accent);
  background-color: var(--panel);
  box-shadow: 0 0 0 1px var(--accent);
}
.wg-select:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}
.wg-select--compact {
  max-width: 160px;
}
body[data-theme="dark"] .wg-select {
  color-scheme: dark;
  background-image: ${UI_SELECT_CHEVRON_DARK};
}
.toolbar .wg-select {
  flex-shrink: 0;
}
`;
