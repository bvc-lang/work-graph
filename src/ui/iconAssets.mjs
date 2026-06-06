import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { resolveInstallLayout } from '../workGraphInstallLayout.mjs';

const moduleDir = dirname(fileURLToPath(import.meta.url));
const { PUBLIC_ROOT } = resolveInstallLayout({
  moduleUrl: pathToFileURL(join(moduleDir, '..', 'workGraphBacklogUiServer.mjs')).href,
});

const ICONS_BOLD_DIR = join(PUBLIC_ROOT, 'assets', 'icons', 'bold');
const ICONS_FILL_DIR = join(PUBLIC_ROOT, 'assets', 'icons', 'fill');

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
  moon: 'moon-fill.svg',
  sun: 'sun-fill.svg',
};

/**
 * @param {string} fileName
 * @param {'bold' | 'fill'} [variant]
 * @returns {string}
 */
export function readPublicIconSvg(fileName, variant = 'bold') {
  const cacheKey = `${variant}:${fileName}`;
  if (svgCache.has(cacheKey)) {
    return svgCache.get(cacheKey);
  }
  const root = variant === 'fill' ? ICONS_FILL_DIR : ICONS_BOLD_DIR;
  const source = readFileSync(join(root, fileName), 'utf8');
  svgCache.set(cacheKey, source);
  return source;
}

/**
 * @param {string} rawSvg
 * @param {{ className?: string, size?: number }} [options]
 * @returns {string}
 */
export function normalizeInlineSvg(rawSvg, { className = 'wg-icon', size = 18, fill = null } = {}) {
  const fillAttr = fill ? ` fill="${fill}"` : '';
  return rawSvg.replace(
    /^<svg\b/u,
    `<svg class="${className}" width="${size}" height="${size}" aria-hidden="true" focusable="false"${fillAttr}`,
  );
}

/**
 * @param {string} fileName
 * @param {{ className?: string, size?: number }} [options]
 * @param {'bold' | 'fill'} [variant]
 * @returns {string}
 */
export function renderInlineIcon(fileName, options = {}, variant = 'bold') {
  return normalizeInlineSvg(readPublicIconSvg(fileName, variant), options);
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
 * @param {{ className?: string, size?: number }} [options]
 * @returns {string}
 */
export function renderThemeIcon(kind, options = {}) {
  const fileName = THEME_ICON_FILES[kind];
  const raw = readPublicIconSvg(fileName, 'fill');
  return normalizeInlineSvg(raw, {
    className: 'header-theme-toggle-icon',
    size: 18,
    fill: 'currentColor',
    ...options,
  });
}

export function getPublicIconsRoot() {
  return join(PUBLIC_ROOT, 'assets', 'icons');
}
