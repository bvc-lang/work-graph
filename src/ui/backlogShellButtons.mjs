import { renderUiButton } from './atoms/button.mjs';
import { renderUiSelect } from './atoms/select.mjs';
import { renderUiTabsGroup } from './molecules/tabs.mjs';

/**
 * Sidebar nav tab (Gripe DS unstyled shell — keeps .nav-tab CSS).
 * @param {{ view: string, label: string, selected?: boolean, disabled?: boolean }} props
 */
export function renderNavTab({ view, label, selected = false, disabled = false }) {
  return renderUiButton({
    unstyled: true,
    className: 'nav-tab',
    label,
    disabled,
    attrs: {
      'data-view': view,
      'aria-selected': selected ? 'true' : 'false',
    },
  });
}

export function renderThemeToggleButton() {
  return renderUiButton({
    unstyled: true,
    id: 'theme-toggle',
    className: 'theme-toggle',
    label: 'Тёмная тема',
    attrs: { 'aria-pressed': 'false' },
  });
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

export function renderWorkflowSubtabsShell() {
  return renderUiTabsGroup({
    className: 'workflow-subtabs',
    testId: 'workflow-subtabs',
    ariaLabel: 'Бэклог и архив',
    tabs: [
      {
        id: 'backlog',
        label: 'Бэклог',
        selected: true,
        count: 0,
        elementId: 'workflow-tab-backlog',
        dataAttrKey: 'data-workflow-tab',
        countId: 'workflow-backlog-tab-count',
      },
      {
        id: 'archive',
        label: 'Архив',
        count: 0,
        elementId: 'workflow-tab-archive',
        dataAttrKey: 'data-workflow-tab',
        countId: 'workflow-archive-tab-count',
      },
    ],
  });
}

export function renderArchitectureSubtabsShell() {
  return '';
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
