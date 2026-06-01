/**
 * @param {string} value
 */
function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * @param {string} label
 * @param {'dark' | 'light'} theme
 * @param {{ rejected?: boolean }} [options]
 */
export function buildGraphCanvasEdgeLabelHtml(label, theme, options = {}) {
  const text = String(label ?? '').trim();
  if (text === '') {
    return '';
  }

  const rejected = options.rejected === true;
  const palette = theme === 'light'
    ? {
      bg: rejected ? '#f4f5f7' : '#ffffff',
      border: rejected ? '#dfe1e6' : '#c1c7d0',
      color: rejected ? '#97a0af' : '#5e6c84',
    }
    : {
      bg: rejected ? '#2a2a2a' : '#2d2d30',
      border: rejected ? '#3c3c3c' : '#4a4a4a',
      color: rejected ? '#6e6e6e' : '#9d9d9d',
    };

  return `<span style="display:inline-block;padding:2px 7px;border-radius:4px;font-size:11px;line-height:1.25;font-family:Segoe UI,system-ui,sans-serif;background:${palette.bg};border:1px solid ${palette.border};color:${palette.color};${rejected ? 'opacity:0.75;font-style:italic;' : ''}">${escapeHtml(text)}</span>`;
}

/**
 * @param {object} edge
 * @param {'dark' | 'light'} theme
 */
export function buildGraphCanvasEdgeStrokeStyle(edge, theme) {
  const rejected = edge.rejected === true;
  const upstream = edge.upstream === true;
  const stroke = rejected
    ? (theme === 'light' ? '#c1c7d0' : '#555555')
    : upstream
      ? (theme === 'light' ? '#97a0af' : '#6e6e6e')
      : (theme === 'light' ? '#8b8b95' : '#858585');

  return {
    stroke,
    strokeWidth: rejected ? 1.5 : 2,
    ...(rejected ? { strokeDasharray: '6 4', opacity: 0.42 } : {}),
    ...(upstream && !rejected ? { strokeDasharray: '5 4', opacity: 0.72 } : {}),
  };
}
