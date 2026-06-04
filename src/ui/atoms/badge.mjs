import { escapeHtml, escapeHtmlAttr } from '../htmlEscape.mjs';

const TONE_CLASS = {
  default: 'wg-badge--default',
  accent: 'wg-badge--accent',
  warning: 'wg-badge--warning',
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
  align-items: center;
  border: 1px solid transparent;
  border-radius: 3px;
  display: inline-flex;
  font-family: inherit;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  line-height: 1.2;
  max-width: 130px;
  overflow: hidden;
  padding: 2px 4px;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}
.wg-badge--default {
  background: #dfe1e6;
  border-color: #c1c7d0;
  color: #44546f;
}
.wg-badge--accent {
  background: #deebff;
  border-color: #85b8ff;
  color: #0747a6;
}
.wg-badge--warning {
  background: #fff0b3;
  border-color: #f5cd47;
  color: #172b4d;
}
.wg-badge--muted {
  background: #dfd8fd;
  border-color: #b8acf6;
  color: #403294;
}
.wg-badge--danger {
  background: #ffd2cc;
  border-color: #ff9c8f;
  color: #ae2a19;
}
.wg-badge--ok {
  background: #baf3db;
  border-color: #7ee2b8;
  color: #216e4e;
}
body[data-theme="dark"] .wg-badge--default {
  background: #738496;
  border-color: #8696a7;
  color: #161a1d;
}
html[data-theme="dark"] .wg-badge--accent,
body[data-theme="dark"] .wg-badge--accent {
  background: rgba(29, 122, 252, 0.2);
  border-color: rgb(29 122 252);
  color: #cce0ff;
}
body[data-theme="dark"] .wg-badge--warning {
  background: #533f04;
  border-color: #7f5f01;
  color: #fff0b3;
}
body[data-theme="dark"] .wg-badge--muted {
  background: #352c63;
  border-color: #5e4db2;
  color: #dfd8fd;
}
body[data-theme="dark"] .wg-badge--danger {
  background: #601e16;
  border-color: #ae2a19;
  color: #ffd2cc;
}
body[data-theme="dark"] .wg-badge--ok {
  background: #164b35;
  border-color: #216e4e;
  color: #baf3db;
}
`;
