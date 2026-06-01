import { escapeHtml, escapeHtmlAttr } from '../htmlEscape.mjs';

const TONE_CLASS = {
  default: 'wg-badge--default',
  accent: 'wg-badge--accent',
  muted: 'wg-badge--muted',
  danger: 'wg-badge--danger',
  ok: 'wg-badge--ok',
};

/**
 * @param {{ label?: string, tone?: string, testId?: string }} props
 */
export function renderUiBadge(props = {}) {
  const label = props.label ?? '';
  const tone = TONE_CLASS[props.tone] ? props.tone : 'default';
  const attrs = [
    'class="wg-badge ' + TONE_CLASS[tone] + '"',
    props.testId ? `data-testid="${escapeHtmlAttr(props.testId)}"` : '',
  ].filter(Boolean).join(' ');
  return `<span ${attrs}>${escapeHtml(label)}</span>`;
}

export const UI_BADGE_CSS = `
.wg-badge {
  display: inline-flex;
  align-items: center;
  border-radius: 999px;
  padding: 2px 8px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
  background: var(--panel-2);
  color: var(--text);
}
.wg-badge--accent { background: var(--accent-soft); color: var(--accent); }
.wg-badge--muted { background: var(--panel-2); color: var(--muted); }
.wg-badge--danger { background: rgba(var(--ui-danger-rgb, 241 76 76), 0.18); color: rgb(var(--ui-danger-rgb, 241 76 76)); }
.wg-badge--ok { background: rgba(106, 153, 85, 0.2); color: var(--ok); }
`;
