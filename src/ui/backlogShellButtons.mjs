import { escapeHtml } from './htmlEscape.mjs';
import { renderUiButton } from './atoms/button.mjs';
import { renderUiSelect } from './atoms/select.mjs';
import { renderUiTextInput } from './atoms/input.mjs';
import { renderUiTextarea } from './atoms/textarea.mjs';
import { renderUiFilterChip, renderUiFilterChipGroup } from './atoms/filterChip.mjs';
import { renderUiToggle } from './atoms/toggle.mjs';
import { renderInlineIcon, renderNavViewIcon, renderThemeIcon } from './iconAssets.mjs';

export const DETAIL_CLOSE_ICON_HTML = renderInlineIcon('x-bold.svg', {
  className: 'detail-button-icon',
  size: 16,
});

export const DETAIL_BACK_ICON_HTML = renderInlineIcon('arrow-left-bold.svg', {
  className: 'detail-button-icon',
  size: 16,
});
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
export function renderNavTab({ view, label, selected = false, disabled = false, hidden = false }) {
  return renderUiButton({
    unstyled: true,
    className: 'nav-tab',
    labelHtml: renderNavTabLabelHtml(view, label),
    ariaLabel: label,
    disabled,
    attrs: {
      'data-view': view,
      'aria-selected': selected ? 'true' : 'false',
      ...(hidden ? { hidden: 'hidden' } : {}),
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
  return renderUiFilterChipGroup({
    className: 'settings-locale-options',
    testId: 'settings-locale-options',
    ariaLabel: t('settings.language.label'),
    chips: [
      { id: 'settings-locale-ru', label: t('settings.language.ru'), pressed: locale === 'ru', testId: 'settings-locale-ru', attrs: { 'data-settings-locale': 'ru' } },
      { id: 'settings-locale-en', label: t('settings.language.en'), pressed: locale === 'en', attrs: { 'data-settings-locale': 'en' } },
    ],
  });
}

/**
 * @param {{ theme?: string, t: (key: string) => string }} props
 */
export function renderSettingsThemeOptions({ theme = 'light', t }) {
  return renderUiFilterChipGroup({
    className: 'settings-theme-options',
    ariaLabel: t('settings.appearance.theme'),
    chips: [
      { id: 'settings-theme-light', label: t('settings.appearance.themeLight'), pressed: theme === 'light', attrs: { 'data-settings-theme': 'light' } },
      { id: 'settings-theme-dark', label: t('settings.appearance.themeDark'), pressed: theme === 'dark', attrs: { 'data-settings-theme': 'dark' } },
    ],
  });
}

/**
 * @param {{ fontMode?: string, t: (key: string) => string }} props
 */
export function renderSettingsFontScaleOptions({ fontMode = 'font-m', t }) {
  const modes = [
    { id: 'font-s', label: t('settings.appearance.fontSizeSmall') },
    { id: 'font-m', label: t('settings.appearance.fontSizeNormal') },
    { id: 'font-l', label: t('settings.appearance.fontSizeLarge') },
    { id: 'font-xl', label: t('settings.appearance.fontSizeXLarge') },
  ];
  return renderUiFilterChipGroup({
    className: 'settings-font-scale-options',
    testId: 'settings-font-scale-options',
    ariaLabel: t('settings.appearance.fontSize'),
    chips: modes.map((mode) => ({
      id: `settings-font-scale-${mode.id}`,
      label: mode.label,
      pressed: fontMode === mode.id,
      testId: `settings-font-scale-${mode.id}`,
      attrs: { 'data-settings-font-scale': mode.id },
    })),
  });
}

export function renderToolbarSearchInput({ placeholder, t }) {
  const input = renderUiTextInput({
    id: 'search',
    type: 'search',
    className: 'wg-input--toolbar wg-search-field__input',
    placeholder: placeholder ?? t('search.placeholder'),
    testId: 'semantic-search-input',
    autocomplete: 'off',
  });
  const clearButton = renderUiButton({
    unstyled: true,
    id: 'search-clear',
    className: 'wg-search-field__clear',
    testId: 'search-clear',
    ariaLabel: t('search.clear'),
    hidden: true,
    labelHtml: renderInlineIcon('x-bold.svg', { className: 'wg-search-field__clear-icon', size: 16 }),
  });
  return `<div class="wg-search-field">${input}${clearButton}</div>`;
}

export function renderIntentComposerTextarea() {
  return renderUiTextarea({
    id: 'intent-composer-input',
    placeholder: 'Например: добавить вкладку памяти с журналом записей',
    rows: 3,
    testId: 'intent-composer-input',
  });
}

/**
 * @param {{ t: (key: string) => string }} props
 */
export function renderSettingsCheckUpdateButton({ t }) {
  return renderUiFilterChip({
    id: 'settings-check-update',
    label: t('settings.about.checkUpdate'),
    testId: 'settings-check-update',
  });
}

export function renderGitSnapshotSettingsToggles({ t }) {
  const enabled = renderUiToggle({
    id: 'settings-git-snapshot-enabled',
    label: t('settings.gitSnapshot.enabled'),
    testId: 'settings-git-snapshot-enabled',
  });
  const recordSha = renderUiToggle({
    id: 'settings-git-snapshot-record-sha',
    label: t('settings.gitSnapshot.recordSha'),
    testId: 'settings-git-snapshot-record-sha',
  });
  return [
    `<div class="settings-row settings-row--toggle">${enabled}</div>`,
    `<div class="settings-row settings-row--toggle">${recordSha}</div>`,
  ].join('\n            ');
}

export function renderDetailCloseButton() {
  return renderUiButton({
    unstyled: true,
    id: 'detail-close',
    className: 'detail-close detail-icon-button',
    ariaLabel: 'Закрыть подробности',
    labelHtml: DETAIL_CLOSE_ICON_HTML,
  });
}

export function renderDetailSubCloseButton() {
  return renderUiButton({
    unstyled: true,
    id: 'detail-sub-close',
    className: 'detail-close detail-icon-button',
    ariaLabel: 'Закрыть описание узла L2',
    labelHtml: DETAIL_CLOSE_ICON_HTML,
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

/**
 * @param {{ t: (key: string) => string }} props
 */
export function renderSearchModeSelect({ t }) {
  return renderUiSelect({
    id: 'search-mode',
    className: 'wg-select--search-mode',
    testId: 'semantic-search-mode',
    ariaLabel: t('search.mode.label'),
    options: [
      { value: 'local', label: t('search.mode.local'), selected: true },
      { value: 'lexical-v1', label: t('search.mode.lexical') },
      { value: 'hybrid-lexical-bm25-v1', label: t('search.mode.hybrid') },
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
  return renderUiFilterChipGroup({
    className: 'analytics-sort-options',
    testId: 'analytics-sort-options',
    ariaLabel: t('analytics.sort.label'),
    chips: [
      { label: t('analytics.sort.createdDesc'), pressed: sort === 'created-desc', attrs: { 'data-analytics-sort': 'created-desc' } },
      { label: t('analytics.sort.keyDesc'), pressed: sort === 'key-desc', attrs: { 'data-analytics-sort': 'key-desc' } },
    ],
  });
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

/**
 * @param {{ t: (key: string) => string }} props
 */
export function renderBoardColumnModeSelect({ t }) {
  return renderUiSelect({
    id: 'board-column-mode',
    className: 'wg-select--compact board-column-mode-select',
    testId: 'board-column-mode',
    ariaLabel: t('board.columnMode.label'),
    options: [
      { value: 'compact', label: t('board.columnMode.compact'), selected: true },
      { value: 'extended', label: t('board.columnMode.extended') },
    ],
  });
}

export function renderArchitectureGraphModeToggle() {
  return renderUiFilterChipGroup({
    className: 'graph-canvas-mode-toggle',
    ariaLabel: 'Режим графа',
    chips: [
      { label: 'Конвейер', pressed: true, attrs: { 'data-graph-canvas-mode': 'pipeline' } },
      { label: 'Полный', pressed: false, attrs: { 'data-graph-canvas-mode': 'full' } },
    ],
  });
}
