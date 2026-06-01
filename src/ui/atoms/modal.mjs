import { escapeHtml, escapeHtmlAttr } from '../htmlEscape.mjs';
import { renderUiButton } from './button.mjs';

/**
 * @param {{ title?: string, bodyHtml?: string, open?: boolean, testId?: string }} props
 */
export function renderUiModal(props = {}) {
  const title = props.title ?? 'Modal';
  const bodyHtml = props.bodyHtml ?? '';
  const open = props.open !== false;
  const hidden = open ? '' : ' hidden';
  const testId = props.testId ?? 'ui-modal';
  return (
    '<div class="wg-modal' + (open ? ' is-open' : '') + '"' + hidden +
    ' data-testid="' + escapeHtmlAttr(testId) + '" role="dialog" aria-modal="true" aria-label="' + escapeHtmlAttr(title) + '">' +
    '<div class="wg-modal__backdrop"></div>' +
    '<div class="wg-modal__panel">' +
    '<header class="wg-modal__header"><h3>' + escapeHtml(title) + '</h3>' +
    renderUiButton({ label: '×', variant: 'flat', size: 'xs', testId: 'ui-modal-close', className: 'wg-modal__close' }) +
    '</header>' +
    '<div class="wg-modal__body">' + bodyHtml + '</div>' +
    '</div></div>'
  );
}

export const UI_MODAL_CSS = `
.wg-modal { position: fixed; inset: 0; z-index: 100; display: none; }
.wg-modal.is-open { display: block; }
.wg-modal__backdrop { position: absolute; inset: 0; background: rgba(0,0,0,0.55); }
.wg-modal__panel {
  position: relative;
  margin: 10vh auto;
  width: min(480px, 92vw);
  background: rgb(var(--ui-surface-rgb, 37 37 38));
  border: 1px solid rgb(var(--brand-border-rgb, 60 60 60));
  border-radius: var(--ui-radius-modal, 0.5rem);
  color: rgb(var(--ui-text-rgb, 212 212 212));
  box-shadow: var(--shadow-card, 0 8px 24px rgba(0,0,0,0.35));
}
.wg-modal__header { display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border-bottom: 1px solid rgb(var(--brand-border-rgb, 60 60 60)); }
.wg-modal__header h3 { margin: 0; font-size: 15px; }
.wg-modal__body { padding: 14px; }
.wg-modal__close { min-width: 28px; }
`;
