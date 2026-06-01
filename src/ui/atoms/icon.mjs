import { escapeHtml, escapeHtmlAttr } from '../htmlEscape.mjs';

/**
 * @param {{ name?: string, size?: number, testId?: string, title?: string }} props
 */
export function renderUiIcon(props = {}) {
  const name = props.name ?? 'dot';
  const size = Number(props.size) > 0 ? Number(props.size) : 16;
  const title = props.title ?? name;
  const attrs = [
    'class="wg-icon"',
    `data-icon="${escapeHtmlAttr(name)}"`,
    `width="${size}"`,
    `height="${size}"`,
    `aria-hidden="true"`,
    props.testId ? `data-testid="${escapeHtmlAttr(props.testId)}"` : '',
  ].filter(Boolean).join(' ');
  return `<svg ${attrs} viewBox="0 0 16 16" role="img"><title>${escapeHtml(title)}</title><circle cx="8" cy="8" r="4" fill="currentColor"/></svg>`;
}

export const UI_ICON_CSS = `
.wg-icon { display: inline-block; vertical-align: middle; color: rgb(var(--ui-accent-rgb, 0 102 255)); flex-shrink: 0; }
`;
