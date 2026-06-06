import { escapeHtml, escapeHtmlAttr } from '../htmlEscape.mjs';

/**
 * @param {{
 *   label: string,
 *   pressed?: boolean,
 *   id?: string,
 *   testId?: string,
 *   disabled?: boolean,
 *   hidden?: boolean,
 *   attrs?: Record<string, string | number | boolean | null | undefined>,
 * }} props
 */
export function renderUiFilterChip(props = {}) {
  const pressed = props.pressed === true;
  const attrs = [
    'type="button"',
    'class="filter-chip"',
    pressed ? 'aria-pressed="true"' : 'aria-pressed="false"',
    props.id ? `id="${escapeHtmlAttr(props.id)}"` : '',
    props.testId ? `data-testid="${escapeHtmlAttr(props.testId)}"` : '',
    props.disabled ? 'disabled' : '',
    props.hidden ? 'hidden' : '',
  ];
  if (props.attrs) {
    for (const [key, value] of Object.entries(props.attrs)) {
      if (value == null || value === false) continue;
      if (value === true) attrs.push(key);
      else attrs.push(`${key}="${escapeHtmlAttr(String(value))}"`);
    }
  }
  return `<button ${attrs.filter(Boolean).join(' ')}><span class="ui-control-text">${escapeHtml(props.label ?? '')}</span></button>`;
}

/**
 * @param {{ chips: Array<Parameters<typeof renderUiFilterChip>[0]>, className?: string, testId?: string, ariaLabel?: string }} props
 */
export function renderUiFilterChipGroup(props = {}) {
  const className = ['filter-chip-group', props.className].filter(Boolean).join(' ');
  const chips = (props.chips ?? []).map((chip) => renderUiFilterChip(chip)).join('');
  return `<div class="${escapeHtmlAttr(className)}" role="group"${props.ariaLabel ? ` aria-label="${escapeHtmlAttr(props.ariaLabel)}"` : ''}${props.testId ? ` data-testid="${escapeHtmlAttr(props.testId)}"` : ''}>${chips}</div>`;
}

export const UI_FILTER_CHIP_CSS = `
.filter-chip-group {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.filter-chip {
  align-items: center;
  background: rgb(var(--ui-control-bg-rgb, 242 242 242));
  border: 0;
  border-radius: 999px;
  color: rgb(var(--ui-text-rgb, 15 23 42));
  cursor: pointer;
  display: inline-flex;
  flex-shrink: 0;
  font: inherit;
  font-size: var(--text-sm, 0.8125rem);
  font-weight: 500;
  line-height: 1.25;
  padding: 6px 12px;
  transition: background-color 0.15s ease, color 0.15s ease;
}
.filter-chip .ui-control-text {
  transform: none;
}
.filter-chip:hover:not(:disabled) {
  background: rgb(var(--ui-control-bg-hover-rgb, 226 232 240));
}
.filter-chip[aria-pressed="true"] {
  background: rgb(var(--ui-control-checked-rgb, 0 0 0));
  color: rgb(var(--ui-control-checked-foreground-rgb, 255 255 255));
}
.filter-chip[aria-pressed="true"]:hover:not(:disabled) {
  background: rgb(var(--ui-accent-hover-rgb, 38 38 38));
  color: rgb(var(--ui-control-checked-foreground-rgb, 255 255 255));
}
.filter-chip:focus-visible {
  outline: 2px solid rgb(var(--ui-focus-ring-rgb, 0 0 0) / 0.35);
  outline-offset: 2px;
}
.filter-chip:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
`;
