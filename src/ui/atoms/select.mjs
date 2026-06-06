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

function resolveSelectedOption(options, explicitValue) {
  for (const option of options) {
    if (typeof option === 'object' && option.selected) {
      return option;
    }
  }
  if (explicitValue != null && explicitValue !== '') {
    const match = options.find((option) => (
      typeof option === 'object' ? option.value === explicitValue : option === explicitValue
    ));
    if (match) return match;
  }
  return options[0] ?? null;
}

function optionLabel(option) {
  if (typeof option === 'string') return option;
  return option.label ?? option.value ?? '';
}

const SELECT_CHEVRON_SVG =
  '<svg class="wg-select-trigger-icon" width="18" height="18" viewBox="0 0 256 256" aria-hidden="true">' +
  '<path fill="currentColor" d="M213.66,101.66l-80,80a8,8,0,0,1-11.32,0l-80-80A8,8,0,0,1,53.66,90.34L128,164.69l74.34-74.35a8,8,0,0,1,11.32,11.32Z"/>' +
  '</svg>';

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
 *   combobox?: boolean,
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

  const useCombobox = props.combobox !== false;
  const nativeClasses = ['wg-select', 'wg-select--native', props.className].filter(Boolean).join(' ');
  const listboxId = props.id ? `${props.id}-listbox` : undefined;
  const selected = resolveSelectedOption(options, props.value);
  const triggerLabel = optionLabel(selected);

  const nativeAttrs = [
    `class="${escapeHtmlAttr(nativeClasses)}"`,
    props.id ? `id="${escapeHtmlAttr(props.id)}"` : '',
    props.name ? `name="${escapeHtmlAttr(props.name)}"` : '',
    'tabindex="-1"',
    'aria-hidden="true"',
    props.disabled ? 'disabled' : '',
    props.hidden ? 'hidden' : '',
    props.testId ? `data-testid="${escapeHtmlAttr(props.testId)}"` : '',
    props.ariaLabel ? `aria-label="${escapeHtmlAttr(props.ariaLabel)}"` : '',
  ].filter(Boolean).join(' ');

  const nativeSelect = `<select ${nativeAttrs}>${optionsHtml}</select>`;

  if (!useCombobox) {
    const plainClasses = ['wg-select', props.className].filter(Boolean).join(' ');
    const plainAttrs = [
      `class="${escapeHtmlAttr(plainClasses)}"`,
      props.id ? `id="${escapeHtmlAttr(props.id)}"` : '',
      props.name ? `name="${escapeHtmlAttr(props.name)}"` : '',
      props.disabled ? 'disabled' : '',
      props.hidden ? 'hidden' : '',
      props.testId ? `data-testid="${escapeHtmlAttr(props.testId)}"` : '',
      props.ariaLabel ? `aria-label="${escapeHtmlAttr(props.ariaLabel)}"` : '',
    ].filter(Boolean).join(' ');
    return `<select ${plainAttrs}>${optionsHtml}</select>`;
  }

  const classTokens = String(props.className ?? '').split(/\s+/).filter(Boolean);
  const isCompact = classTokens.includes('wg-select--compact');
  const wrapperExtra = classTokens.filter((token) => token !== 'wg-select--compact');
  const comboboxClass = ['wg-select-combobox', isCompact ? 'wg-select-combobox--compact' : '', ...wrapperExtra]
    .filter(Boolean)
    .join(' ');

  const triggerId = props.id ? `${props.id}-trigger` : undefined;
  const triggerAttrs = [
    'type="button"',
    'class="wg-select-trigger"',
    triggerId ? `id="${escapeHtmlAttr(triggerId)}"` : '',
    'aria-haspopup="listbox"',
    'aria-expanded="false"',
    listboxId ? `aria-controls="${escapeHtmlAttr(listboxId)}"` : '',
    props.disabled ? 'disabled' : '',
    props.ariaLabel ? `aria-label="${escapeHtmlAttr(props.ariaLabel)}"` : '',
  ].filter(Boolean).join(' ');

  return (
    `<div class="${escapeHtmlAttr(comboboxClass)}" data-wg-select-combobox${props.hidden ? ' hidden' : ''}>` +
    nativeSelect +
    `<button ${triggerAttrs}>` +
    `<span class="wg-select-trigger-label">${escapeHtml(triggerLabel)}</span>` +
    SELECT_CHEVRON_SVG +
    '</button>' +
    '<div class="wg-select-panel" hidden>' +
    `<div class="ui-drop-list" role="listbox"${listboxId ? ` id="${escapeHtmlAttr(listboxId)}"` : ''}${triggerId ? ` aria-labelledby="${escapeHtmlAttr(triggerId)}"` : ''}></div>` +
    '</div>' +
    '</div>'
  );
}

export const UI_SELECT_CHEVRON = "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%2364748b' d='M2.5 4.5 6 8l3.5-3.5'/%3E%3C/svg%3E\")";

export const UI_SELECT_CSS = `
.wg-select-combobox {
  display: inline-block;
  max-width: 100%;
  position: relative;
  vertical-align: top;
  width: fit-content;
}
.wg-select-combobox[hidden] {
  display: none !important;
}
.wg-select--native {
  border: 0 !important;
  clip: rect(0 0 0 0) !important;
  height: 1px !important;
  margin: -1px !important;
  overflow: hidden !important;
  padding: 0 !important;
  position: absolute !important;
  white-space: nowrap !important;
  width: 1px !important;
}
.wg-select-trigger {
  align-items: center;
  appearance: none;
  background-color: rgb(var(--ui-control-bg-rgb, 242 242 242));
  border: 2px solid transparent;
  border-radius: var(--ui-radius-control, 0.75rem);
  box-sizing: border-box;
  color: rgb(var(--ui-text-rgb, 15 23 42));
  cursor: pointer;
  display: inline-flex;
  font: inherit;
  font-size: var(--text-base, 0.9375rem);
  gap: 8px;
  justify-content: space-between;
  line-height: 1.5;
  min-height: 48px;
  padding: 10px 12px 10px 20px;
  text-align: left;
  transition: border-color 0.15s ease, background-color 0.15s ease;
  width: 100%;
}
.wg-select-combobox .wg-select-trigger {
  justify-content: flex-start;
  max-width: 100%;
  width: max-content;
}
.wg-select-combobox .wg-select-trigger-label {
  flex: 0 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wg-select-trigger-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.wg-select-trigger-icon {
  color: rgb(var(--ui-muted-rgb, 100 116 139));
  flex-shrink: 0;
}
.wg-select-trigger:hover:not(:disabled) {
  border-color: rgb(var(--ui-accent-rgb, 0 0 0));
}
.wg-select-trigger:focus-visible {
  border-color: rgb(var(--ui-accent-rgb, 0 0 0));
  outline: none;
}
.wg-select-trigger:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.wg-select-panel {
  left: 0;
  max-width: min(100vw - 2rem, 28rem);
  min-width: max(100%, 14rem);
  position: absolute;
  right: auto;
  top: calc(100% + 4px);
  width: max-content;
  z-index: 40;
}
.wg-select-panel--above {
  bottom: calc(100% + 4px);
  top: auto;
}
.wg-select-panel--align-end {
  left: auto;
  right: 0;
}
.wg-select-panel[hidden] {
  display: none !important;
}
.ui-drop-list {
  background: rgb(var(--ui-surface-rgb, 255 255 255));
  border: 1px solid rgb(var(--ui-border-rgb, 226 232 240));
  border-radius: var(--ui-radius-card, 0.75rem);
  box-shadow: 0 10px 24px rgb(15 23 42 / 0.12);
  min-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: min(380px, 50vh);
  overflow-x: hidden;
  overflow-y: auto;
  padding: 6px;
  scrollbar-color: rgb(var(--ui-muted-rgb, 100 116 139) / 0.45) transparent;
  scrollbar-width: thin;
}
.ui-drop-list::-webkit-scrollbar {
  height: 10px;
  width: 10px;
}
.ui-drop-list::-webkit-scrollbar-thumb {
  background-color: rgb(var(--ui-muted-rgb, 100 116 139) / 0.45);
  border-radius: 999px;
}
.ui-drop-list-item {
  align-items: flex-start;
  background: transparent;
  border: 0;
  border-radius: calc(var(--ui-radius-control, 0.75rem) - 4px);
  color: rgb(var(--ui-text-rgb, 15 23 42));
  cursor: pointer;
  display: flex;
  font: inherit;
  font-size: var(--text-base, 0.9375rem);
  gap: 12px;
  line-height: 1.4;
  padding: 10px 12px;
  text-align: left;
  transition: background-color 0.15s ease;
  width: 100%;
}
.ui-drop-list-item:hover:not(:disabled),
.ui-drop-list-item:focus-visible {
  background: rgb(var(--ui-control-bg-hover-rgb, 226 232 240));
  outline: none;
}
.ui-select-option-label {
  -webkit-box-orient: vertical;
  display: -webkit-box;
  flex: 1 1 auto;
  -webkit-line-clamp: 2;
  line-height: 1.35;
  min-width: 0;
  overflow: hidden;
  overflow-wrap: anywhere;
  white-space: normal;
  word-break: break-word;
}
.ui-select-option--active,
.ui-select-option--active:hover:not(:disabled) {
  background: rgb(var(--ui-control-bg-rgb, 242 242 242));
  color: rgb(var(--ui-text-rgb, 15 23 42));
}
.ui-select-option-check {
  color: rgb(var(--ui-accent-rgb, 0 0 0));
  flex-shrink: 0;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  margin-top: 2px;
}
.ui-drop-list-item:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
.wg-select-combobox--compact .wg-select-trigger {
  font-size: var(--text-sm, 0.8125rem);
  max-width: 240px;
  min-height: 40px;
  min-width: 0;
  padding: 8px 10px 8px 14px;
}
.wg-select-combobox--compact .ui-drop-list-item {
  font-size: var(--text-sm, 0.8125rem);
  padding: 8px 10px;
}
.toolbar .wg-select-combobox {
  flex-shrink: 0;
}
/* Plain native select fallback (atom inspector etc.) */
select.wg-select:not(.wg-select--native) {
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
select.wg-select:not(.wg-select--native):hover:not(:disabled) {
  border-color: rgb(var(--ui-accent-rgb, 0 0 0));
}
select.wg-select:not(.wg-select--native):focus {
  background-color: rgb(var(--ui-control-bg-rgb, 242 242 242));
  border-color: rgb(var(--ui-accent-rgb, 0 0 0));
  box-shadow: none;
  outline: none;
}
select.wg-select:not(.wg-select--native):disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.wg-select--compact:not(.wg-select-combobox) {
  font-size: var(--text-sm, 0.8125rem);
  max-width: 220px;
  min-height: 40px;
  padding: 8px 32px 8px 14px;
}
html[data-theme="dark"] .ui-drop-list,
body[data-theme="dark"] .ui-drop-list {
  box-shadow: 0 12px 28px rgb(0 0 0 / 0.45);
}
html[data-theme="dark"] .ui-select-option--active,
html[data-theme="dark"] .ui-select-option--active:hover:not(:disabled),
body[data-theme="dark"] .ui-select-option--active,
body[data-theme="dark"] .ui-select-option--active:hover:not(:disabled) {
  background: rgb(var(--ui-control-bg-hover-rgb, 60 60 60));
  color: rgb(var(--ui-text-rgb, 212 212 212));
}
html[data-theme="dark"] .ui-select-option-check,
body[data-theme="dark"] .ui-select-option-check {
  color: rgb(var(--ui-accent-rgb, 29 122 252));
}
`;
