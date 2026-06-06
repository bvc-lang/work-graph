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

export const UI_SELECT_CHEVRON = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M2.5 4.5 6 8l3.5-3.5'/%3E%3C/svg%3E\")";

export const UI_SELECT_CSS = `
.wg-select {
  appearance: none;
  -webkit-appearance: none;
  background-color: rgb(var(--ui-control-bg-rgb, 242 242 242));
  background-image: ${UI_SELECT_CHEVRON};
  background-position: right 12px center;
  background-repeat: no-repeat;
  background-size: 12px 12px;
  border: 2px solid transparent;
  border-radius: var(--ui-radius-control, 0.75rem);
  box-sizing: border-box;
  color: rgb(var(--ui-text-rgb, 15 23 42));
  cursor: pointer;
  font: inherit;
  font-size: var(--text-base, 0.9375rem);
  line-height: 1.5;
  min-height: 48px;
  padding: 10px 36px 10px 20px;
  transition: border-color 0.15s ease, background-color 0.15s ease;
}
.wg-select:hover:not(:disabled) {
  border-color: rgb(var(--ui-accent-rgb, 0 0 0));
}
.wg-select:focus {
  background-color: rgb(var(--ui-control-bg-rgb, 242 242 242));
  border-color: rgb(var(--ui-accent-rgb, 0 0 0));
  box-shadow: none;
  outline: none;
}
.wg-select:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.wg-select--compact {
  font-size: var(--text-sm, 0.8125rem);
  max-width: 160px;
  min-height: 40px;
  padding: 8px 32px 8px 14px;
}
.toolbar .wg-select {
  flex-shrink: 0;
}
`;
