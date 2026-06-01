import { renderUiBadge, UI_BADGE_CSS } from '../atoms/badge.mjs';
import { renderUiButton, UI_BUTTON_CSS } from '../atoms/button.mjs';
import { renderUiIcon, UI_ICON_CSS } from '../atoms/icon.mjs';
import { renderUiTextInput, UI_INPUT_CSS } from '../atoms/input.mjs';
import { renderUiSelect, UI_SELECT_CSS } from '../atoms/select.mjs';
import { renderUiModal, UI_MODAL_CSS } from '../atoms/modal.mjs';
import { renderUiRating, UI_RATING_CSS } from '../molecules/rating.mjs';
import { renderUiTabsGroup, UI_TABS_CSS } from '../molecules/tabs.mjs';
import { escapeHtml } from '../htmlEscape.mjs';

export const UI_ATOM_REGISTRY = [
  {
    id: 'button',
    layer: 'atom',
    title: 'Button',
    renderPreview: () => [
      renderUiButton({ label: 'Primary', variant: 'primary', testId: 'ui-kit-button-primary' }),
      renderUiButton({ label: 'Secondary', variant: 'secondary', testId: 'ui-kit-button-secondary' }),
      renderUiButton({ label: 'Flat', variant: 'flat', testId: 'ui-kit-button-flat' }),
    ].join(' '),
  },
  {
    id: 'badge',
    layer: 'atom',
    title: 'Badge',
    renderPreview: () => [
      renderUiBadge({ label: 'default', testId: 'ui-kit-badge-default' }),
      renderUiBadge({ label: 'accent', tone: 'accent', testId: 'ui-kit-badge-accent' }),
      renderUiBadge({ label: 'danger', tone: 'danger', testId: 'ui-kit-badge-danger' }),
    ].join(' '),
  },
  {
    id: 'select',
    layer: 'atom',
    title: 'Select',
    renderPreview: () => renderUiSelect({
      testId: 'ui-kit-select',
      ariaLabel: 'Demo select',
      options: [
        { value: 'a', label: 'Option A', selected: true },
        { value: 'b', label: 'Option B' },
      ],
    }),
  },
  {
    id: 'text-input',
    layer: 'atom',
    title: 'Text input',
    renderPreview: () => renderUiTextInput({ placeholder: 'Placeholder', testId: 'ui-kit-input' }),
  },
  {
    id: 'icon',
    layer: 'atom',
    title: 'Icon',
    renderPreview: () => renderUiIcon({ name: 'dot', testId: 'ui-kit-icon' }),
  },
  {
    id: 'modal',
    layer: 'atom',
    title: 'Modal',
    renderPreview: () => renderUiModal({
      title: 'Preview modal',
      bodyHtml: '<p class="muted">Static preview for /dev/ui-kit</p>',
      testId: 'ui-kit-modal',
    }),
  },
];

export const UI_MOLECULE_REGISTRY = [
  {
    id: 'rating',
    layer: 'molecule',
    title: 'Rating',
    renderPreview: () => [
      renderUiRating({ value: 4, size: 'md', showValue: true, testId: 'ui-kit-rating-md' }),
      renderUiRating({ value: '5+', size: 'sm', color: 'yellow-orange', testId: 'ui-kit-rating-plus' }),
    ].join(' '),
  },
  {
    id: 'tabs',
    layer: 'molecule',
    title: 'Tabs',
    renderPreview: () => renderUiTabsGroup({
      testId: 'ui-kit-tabs',
      ariaLabel: 'Demo tabs',
      tabs: [
        { id: 'drafts', label: 'Черновики', selected: true, count: 3 },
        { id: 'archive', label: 'Архив', count: 12 },
      ],
    }),
  },
];

export const UI_COMPONENT_REGISTRY = [...UI_ATOM_REGISTRY, ...UI_MOLECULE_REGISTRY];

export function renderUiKitComponentCss() {
  return [UI_BUTTON_CSS, UI_BADGE_CSS, UI_SELECT_CSS, UI_INPUT_CSS, UI_ICON_CSS, UI_MODAL_CSS, UI_RATING_CSS, UI_TABS_CSS].join('\n');
}

export function renderUiKitPageHtml() {
  const sidebar = UI_COMPONENT_REGISTRY.map((entry) =>
    `<li><a href="#ui-kit-${escapeHtml(entry.id)}">${escapeHtml(entry.title)}</a></li>`,
  ).join('');

  const sections = UI_COMPONENT_REGISTRY.map((entry) =>
    `<section id="ui-kit-${escapeHtml(entry.id)}" class="ui-kit-section" data-testid="ui-kit-section-${escapeHtml(entry.id)}">` +
    `<h2>${escapeHtml(entry.title)} <code>${escapeHtml(entry.id)}</code></h2>` +
    `<div class="ui-kit-preview">${entry.renderPreview()}</div>` +
    '</section>',
  ).join('');

  return `<!doctype html>
<html lang="ru" data-theme="dark" data-iohasc-theme="workgraph-dark">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Work Graph UI Kit</title>
  <link rel="stylesheet" href="/assets/fonts/GraphikLCG/stylesheet.css">
  <link rel="stylesheet" href="/assets/design-tokens-workgraph-dark.css">
  <style>
    html {
      font-family: var(--brand-font-sans);
      letter-spacing: 0.01em;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      text-rendering: optimizeLegibility;
    }
    body { margin: 0; background: rgb(var(--brand-bg-rgb, 30 30 30)); color: rgb(var(--ui-text-rgb, 212 212 212)); font: var(--text-base)/var(--text-base-line-height) var(--brand-font-sans); }
    .ui-kit-layout { display: grid; grid-template-columns: 220px 1fr; min-height: 100vh; }
    .ui-kit-sidebar { border-right: 1px solid rgb(var(--brand-border-rgb, 60 60 60)); padding: 16px; }
    .ui-kit-sidebar ul { list-style: none; margin: 0; padding: 0; }
    .ui-kit-sidebar a { color: rgb(var(--ui-link-rgb, 0 102 255)); text-decoration: none; display: block; padding: 6px 0; }
    .ui-kit-main { padding: 20px; }
    .ui-kit-section { margin-bottom: 28px; padding-bottom: 20px; border-bottom: 1px solid rgb(var(--brand-border-rgb, 60 60 60)); }
    .ui-kit-preview { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin-top: 10px; }
    .muted { color: rgb(var(--ui-muted-rgb, 157 157 157)); }
    ${renderUiKitComponentCss()}
  </style>
</head>
<body data-testid="ui-kit-root">
  <div class="ui-kit-layout">
    <aside class="ui-kit-sidebar"><h1>UI Kit</h1><ul>${sidebar}</ul><p class="muted"><a href="/">← Backlog UI</a></p></aside>
    <main class="ui-kit-main">${sections}</main>
  </div>
</body>
</html>`;
}
