import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { resolveInstallLayout } from '../workGraphInstallLayout.mjs';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const { PUBLIC_ROOT } = resolveInstallLayout({
  moduleUrl: pathToFileURL(join(moduleDir, '..', 'workGraphBacklogUiServer.mjs')).href,
});

const ICONS_BOLD_DIR = join(PUBLIC_ROOT, 'assets', 'icons', 'bold');

/** @type {Map<string, string>} */
const svgCache = new Map();

/** @type {Record<string, string>} */
export const NAV_VIEW_ICON_FILES = {
  analytics: 'chart-bar-bold.svg',
  workflow: 'clipboard-text-bold.svg',
  board: 'kanban-bold.svg',
  verification: 'shield-check-bold.svg',
  memory: 'brain-bold.svg',
  architecture: 'tree-structure-bold.svg',
  prompts: 'chat-text-bold.svg',
  settings: 'gear-bold.svg',
};

const THEME_ICON_FILES = {
  moon: 'moon-bold.svg',
  sun: 'sun-bold.svg',
};

/**
 * @param {string} fileName
 * @returns {string}
 */
export function readPublicIconSvg(fileName) {
  const cacheKey = fileName;
  if (svgCache.has(cacheKey)) {
    return svgCache.get(cacheKey);
  }
  const source = readFileSync(join(ICONS_BOLD_DIR, fileName), 'utf8');
  svgCache.set(cacheKey, source);
  return source;
}

/**
 * @param {string} rawSvg
 * @param {{ className?: string, size?: number }} [options]
 * @returns {string}
 */
export function normalizeInlineSvg(rawSvg, { className = 'wg-icon', size = 18 } = {}) {
  return rawSvg.replace(
    /^<svg\b/u,
    `<svg class="${className}" width="${size}" height="${size}" aria-hidden="true" focusable="false"`,
  );
}

/**
 * @param {string} fileName
 * @param {{ className?: string, size?: number }} [options]
 * @returns {string}
 */
export function renderInlineIcon(fileName, options = {}) {
  return normalizeInlineSvg(readPublicIconSvg(fileName), options);
}

/**
 * @param {string} view
 * @param {{ className?: string, size?: number }} [options]
 * @returns {string}
 */
export function renderNavViewIcon(view, options = {}) {
  const fileName = NAV_VIEW_ICON_FILES[view];
  if (!fileName) return '';
  return renderInlineIcon(fileName, {
    className: 'nav-tab-icon',
    size: 22,
    ...options,
  });
}

/**
 * @param {'moon' | 'sun'} kind
 * @returns {string}
 */
export function renderThemeIcon(kind) {
  const fileName = THEME_ICON_FILES[kind];
  return renderInlineIcon(fileName, {
    className: 'header-theme-toggle-icon',
    size: 18,
  });
}

export function getPublicIconsRoot() {
  return join(PUBLIC_ROOT, 'assets', 'icons');
}
