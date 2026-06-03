/**
 * Browser-inline badge renderer (no imports).
 * @param {{ label?: string, tone?: string, testId?: string, title?: string }} props
 */
export function renderClientUiBadge(props = {}) {
  const escapeAttr = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');

  const escapeText = (value) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  const TONE_CLASS = {
    default: 'wg-badge--default',
    accent: 'wg-badge--accent',
    warning: 'wg-badge--warning',
    muted: 'wg-badge--muted',
    danger: 'wg-badge--danger',
    ok: 'wg-badge--ok',
  };

  const tone = TONE_CLASS[props.tone] ? props.tone : 'default';
  const attrs = [
    'class="wg-badge ' + TONE_CLASS[tone] + '"',
    props.testId ? 'data-testid="' + escapeAttr(props.testId) + '"' : '',
    props.title ? 'title="' + escapeAttr(props.title) + '"' : '',
  ].filter(Boolean);

  return '<span ' + attrs.join(' ') + '>' + escapeText(props.label ?? '') + '</span>';
}
