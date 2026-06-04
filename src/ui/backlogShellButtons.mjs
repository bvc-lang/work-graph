import { escapeHtml } from './htmlEscape.mjs';
import { renderUiButton } from './atoms/button.mjs';
import { renderUiSelect } from './atoms/select.mjs';
import { renderNavViewIcon, renderThemeIcon } from './iconAssets.mjs';
import { renderUiTabsGroup } from './molecules/tabs.mjs';

function renderNavTabLabelHtml(view, label) {
  const icon = renderNavViewIcon(view);
  if (!icon) return escapeHtml(label);
  return `${icon}<span class="nav-tab-label">${escapeHtml(label)}</span>`;
}

/**
 * Sidebar nav tab (Gripe DS unstyled shell — keeps .nav-tab CSS).
 * @param {{ view: string, label: string, selected?: boolean, disabled?: boolean }} props
 */
export function renderNavTab({ view, label, selected = false, disabled = false }) {
  return renderUiButton({
    unstyled: true,
    className: 'nav-tab',
    labelHtml: renderNavTabLabelHtml(view, label),
    ariaLabel: label,
    disabled,
    attrs: {
      'data-view': view,
      'aria-selected': selected ? 'true' : 'false',
    },
  });
}

export function renderSettingsNavTab({ label = 'Настройки', selected = false }) {
  return renderUiButton({
    unstyled: true,
    className: 'nav-tab nav-tab-settings',
    labelHtml: renderNavTabLabelHtml('settings', label),
    ariaLabel: label,
    testId: 'sidebar-settings-nav',
    attrs: {
      'data-view': 'settings',
      'aria-selected': selected ? 'true' : 'false',
    },
  });
}

export function renderHeaderThemeToggleButton({ ariaLabel = 'Переключить тему' } = {}) {
  return renderUiButton({
    unstyled: true,
    id: 'theme-toggle',
    className: 'header-theme-toggle',
    ariaLabel,
    ariaPressed: false,
    testId: 'header-theme-toggle',
    labelHtml: `<span class="header-theme-toggle-inner">${renderThemeIcon('moon')}</span>`,
  });
}

/** @deprecated footer full-width button — use renderHeaderThemeToggleButton */
export function renderThemeToggleButton() {
  return renderHeaderThemeToggleButton();
}

/**
 * @param {{ locale: string, t: (key: string) => string }} props
 */
export function renderSettingsLocaleOptions({ locale, t }) {
  const options = [
    { id: 'ru', label: t('settings.language.ru') },
    { id: 'en', label: t('settings.language.en') },
  ];
  return options.map(({ id, label }) => renderUiButton({
    variant: 'secondary',
    size: 'sm',
    id: `settings-locale-${id}`,
    className: locale === id ? 'is-active' : '',
    label,
    testId: id === 'ru' ? 'settings-locale-ru' : undefined,
    attrs: {
      'data-settings-locale': id,
      'aria-pressed': locale === id ? 'true' : 'false',
    },
  })).join('\n                ');
}

export function renderDetailCloseButton() {
  return renderUiButton({
    unstyled: true,
    id: 'detail-close',
    className: 'detail-close',
    label: 'Закрыть',
    ariaLabel: 'Закрыть подробности',
  });
}

export function renderDetailSubCloseButton() {
  return renderUiButton({
    unstyled: true,
    id: 'detail-sub-close',
    className: 'detail-close',
    label: 'Закрыть',
    ariaLabel: 'Закрыть описание узла L2',
  });
}

export function renderAgentRunDockCloseButton() {
  return renderUiButton({
    unstyled: true,
    id: 'agent-run-dock-close',
    className: 'agent-dock-close',
    label: '×',
    ariaLabel: 'Свернуть dock',
  });
}

export function renderAgentRunFooterButtons() {
  return [
    renderUiButton({
      id: 'agent-run-retry',
      variant: 'secondary',
      size: 'sm',
      label: 'Повтор',
    }),
    renderUiButton({
      id: 'agent-run-open-task',
      variant: 'primary',
      size: 'sm',
      label: 'Открыть задачу',
    }),
  ].join('\n      ');
}

export function renderIntentComposerActionButtons() {
  return [
    renderUiButton({
      variant: 'secondary',
      size: 'sm',
      label: 'Preview draft',
      testId: 'intent-composer-propose',
      attrs: { 'data-action': 'propose' },
    }),
    renderUiButton({
      variant: 'primary',
      size: 'sm',
      label: 'Создать задачу',
      testId: 'intent-composer-apply',
      disabled: true,
      attrs: { 'data-action': 'apply' },
    }),
    renderUiButton({
      variant: 'flat',
      size: 'sm',
      label: 'Отменить',
      testId: 'intent-composer-cancel',
      attrs: { 'data-action': 'cancel' },
    }),
  ].join('\n            ');
}

export function renderIntentDomainClearButton() {
  return renderUiButton({
    unstyled: true,
    id: 'intent-domain-clear',
    className: 'board-tab',
    label: 'Сброс домена',
    hidden: true,
  });
}

export function renderSearchModeSelect() {
  return renderUiSelect({
    id: 'search-mode',
    className: 'wg-select--search-mode',
    testId: 'semantic-search-mode',
    ariaLabel: 'Semantic search mode',
    options: [
      { value: 'local', label: 'local filter', selected: true },
      { value: 'lexical-v1', label: 'semantic lexical' },
      { value: 'hybrid-lexical-bm25-v1', label: 'semantic hybrid BM25' },
    ],
  });
}

export function renderCycleFilterSelect() {
  return renderUiSelect({
    id: 'cycle-filter',
    className: 'wg-select--compact',
    ariaLabel: 'Цикл',
    options: [
      { value: 'current', label: 'Текущий цикл', selected: true },
      { value: 'all', label: 'Все циклы' },
    ],
  });
}

export function renderIntentDomainFilterSelect() {
  return renderUiSelect({
    id: 'intent-domain-filter',
    className: 'wg-select--compact',
    ariaLabel: 'Домен',
    options: [{ value: '', label: 'Все домены', selected: true }],
  });
}

export function renderAnalyticsSubtabsShell() {
  return renderUiTabsGroup({
    className: 'workflow-subtabs analytics-subtabs',
    testId: 'analytics-subtabs',
    ariaLabel: 'Тип аналитики',
    tabs: [
      {
        id: 'intake',
        label: 'Разборы',
        selected: true,
        count: 0,
        elementId: 'analytics-tab-intake',
        dataAttrKey: 'data-analytics-tab',
        countId: 'analytics-intake-tab-count',
      },
      {
        id: 'closing',
        label: 'Итоги эпиков',
        count: 0,
        elementId: 'analytics-tab-closing',
        dataAttrKey: 'data-analytics-tab',
        countId: 'analytics-closing-tab-count',
      },
    ],
  });
}

/**
 * @param {{ t: (key: string) => string, sort?: string }} props
 */
export function renderAnalyticsSortOptions({ t, sort = 'created-desc' }) {
  const options = [
    { id: 'created-desc', label: t('analytics.sort.createdDesc') },
    { id: 'key-desc', label: t('analytics.sort.keyDesc') },
  ];
  return `<div class="analytics-sort-options" role="group" aria-label="${escapeHtml(t('analytics.sort.label'))}" data-testid="analytics-sort-options">${options.map(({ id, label }) => renderUiButton({
    variant: 'secondary',
    size: 'sm',
    className: sort === id ? 'is-active' : '',
    label,
    attrs: {
      'data-analytics-sort': id,
      'aria-pressed': sort === id ? 'true' : 'false',
    },
  })).join('')}</div>`;
}

export function renderWorkflowSubtabsShell(labels = {}) {
  return renderUiTabsGroup({
    className: 'workflow-subtabs',
    testId: 'workflow-subtabs',
    ariaLabel: 'Бэклог и архив',
    tabs: [
      {
        id: 'backlog',
        label: labels.backlog ?? 'Бэклог',
        selected: true,
        count: 0,
        elementId: 'workflow-tab-backlog',
        dataAttrKey: 'data-workflow-tab',
        countId: 'workflow-backlog-tab-count',
      },
      {
        id: 'archive',
        label: labels.archive ?? 'Архив',
        count: 0,
        elementId: 'workflow-tab-archive',
        dataAttrKey: 'data-workflow-tab',
        countId: 'workflow-archive-tab-count',
      },
    ],
  });
}

export function renderWorkflowDisplayModeSelect() {
  return renderUiSelect({
    id: 'workflow-display-mode',
    className: 'wg-select--compact',
    ariaLabel: 'Режим списка задач',
    options: [
      { value: 'epic-groups', label: 'Эпики', selected: true },
      { value: 'flat', label: 'Плоский' },
      { value: 'tree', label: 'Дерево' },
    ],
  });
}

export function renderArchitectureGraphModeToggle() {
  return (
    '<div class="graph-canvas-mode-toggle" role="group" aria-label="Режим графа">' +
    renderUiButton({
      unstyled: true,
      label: 'Конвейер',
      className: 'is-active',
      attrs: { 'data-graph-canvas-mode': 'pipeline', 'aria-pressed': 'true' },
    }) +
    renderUiButton({
      unstyled: true,
      label: 'Полный',
      attrs: { 'data-graph-canvas-mode': 'full', 'aria-pressed': 'false' },
    }) +
    '</div>'
  );
}
