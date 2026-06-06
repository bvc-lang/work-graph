import { renderUiButton } from '../atoms/button.mjs';
import { escapeHtml, escapeHtmlAttr } from '../htmlEscape.mjs';

/**
 * @param {{ tabs: Array<{ id: string, label: string, labelHtml?: string, selected?: boolean, count?: number }>, size?: string, testId?: string, ariaLabel?: string, className?: string }} props
 */
export function renderUiTabsGroup(props = {}) {
  const tabs = props.tabs ?? [];
  const sizeClass = props.size === 'sm' ? 'wg-tabs--sm' : props.size === 'lg' ? 'wg-tabs--lg' : 'wg-tabs--md';
  const groupClass = ['wg-tabs', sizeClass, props.className ?? ''].filter(Boolean).join(' ');
  const testId = props.testId ?? 'ui-tabs-group';
  const triggers = tabs.map((tab) => renderUiTabsTrigger({
    id: tab.id,
    label: tab.label,
    labelHtml: tab.labelHtml,
    selected: tab.selected,
    count: tab.count,
    elementId: tab.elementId,
    countId: tab.countId,
    dataAttrKey: tab.dataAttrKey,
    testId: tab.testId,
  })).join('');
  return `<div class="${escapeHtmlAttr(groupClass)}" role="tablist"${props.ariaLabel ? ` aria-label="${escapeHtmlAttr(props.ariaLabel)}"` : ''} data-testid="${escapeHtmlAttr(testId)}">${triggers}</div>`;
}

/**
 * @param {{
 *   id: string,
 *   label?: string,
 *   labelHtml?: string,
 *   selected?: boolean,
 *   count?: number | string,
 *   testId?: string,
 *   elementId?: string,
 *   countId?: string,
 *   dataAttrKey?: string,
 * }} props
 */
export function renderUiTabsTrigger(props = {}) {
  const selected = props.selected === true;
  const dataKey = props.dataAttrKey ?? 'data-tab';
  const countHtml = props.countId != null
    ? `<span id="${escapeHtmlAttr(props.countId)}" class="count">${escapeHtml(String(props.count ?? 0))}</span>`
    : props.count != null
      ? `<span class="count">${escapeHtml(String(props.count))}</span>`
      : '';
  const labelHtml = props.labelHtml ?? (
    countHtml
      ? `${escapeHtml(props.label ?? '')} ${countHtml}`
      : escapeHtml(props.label ?? '')
  );
  return renderUiButton({
    unstyled: true,
    id: props.elementId,
    className: `wg-tabs__trigger${selected ? ' is-active' : ''}`,
    labelHtml,
    testId: props.testId ?? `ui-tabs-trigger-${props.id}`,
    role: 'tab',
    ariaSelected: selected ? 'true' : 'false',
    attrs: {
      [dataKey]: props.id,
    },
  });
}

export const UI_TABS_CSS = `
.wg-tabs { display: flex; flex-wrap: wrap; gap: 4px; }
.wg-tabs__trigger {
  background: transparent;
  border: 0;
  border-bottom: 2px solid transparent;
  border-radius: 0;
  color: rgb(var(--ui-muted-rgb, 100 116 139));
  cursor: pointer;
  font-weight: 600;
  padding: 8px 10px;
}
.wg-tabs__trigger:hover:not(:disabled) {
  color: rgb(var(--ui-text-rgb, 15 23 42));
}
.wg-tabs__trigger:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}
.wg-tabs__trigger.is-active {
  border-bottom-color: rgb(var(--ui-control-checked-rgb, 0 0 0));
  color: rgb(var(--ui-text-rgb, 15 23 42));
}
`;
