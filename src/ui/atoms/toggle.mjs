import { escapeHtml, escapeHtmlAttr } from '../htmlEscape.mjs';

/**
 * @param {{
 *   id?: string,
 *   name?: string,
 *   label: string,
 *   checked?: boolean,
 *   disabled?: boolean,
 *   testId?: string,
 *   value?: string,
 * }} props
 */
export function renderUiToggle(props = {}) {
  const inputAttrs = [
    'type="checkbox"',
    'class="ui-swagger-input"',
    props.id ? `id="${escapeHtmlAttr(props.id)}"` : '',
    props.name ? `name="${escapeHtmlAttr(props.name)}"` : '',
    `value="${escapeHtmlAttr(props.value ?? '1')}"`,
    props.checked ? 'checked' : '',
    props.disabled ? 'disabled' : '',
    props.testId ? `data-testid="${escapeHtmlAttr(props.testId)}"` : '',
  ].filter(Boolean).join(' ');

  return (
    `<label class="ui-swagger-label${props.disabled ? ' is-disabled' : ''}">` +
    `<span class="ui-swagger-label-text">${escapeHtml(props.label ?? '')}</span>` +
    '<span class="ui-swagger-control" aria-hidden="true">' +
    `<input ${inputAttrs}>` +
    '<span class="ui-swagger-track"></span>' +
    '<span class="ui-swagger-thumb"></span>' +
    '</span>' +
    '</label>'
  );
}

export const UI_TOGGLE_CSS = `
.ui-swagger-label {
  align-items: center;
  cursor: pointer;
  display: flex;
  gap: 16px;
  justify-content: space-between;
  width: 100%;
}
.ui-swagger-label.is-disabled,
.ui-swagger-label:has(.ui-swagger-input:disabled) {
  cursor: not-allowed;
  opacity: 0.55;
}
.ui-swagger-label-text {
  color: rgb(var(--ui-text-rgb, 15 23 42));
  flex: 1 1 auto;
  font-size: var(--text-base, 0.9375rem);
  font-weight: 600;
  line-height: 1.35;
  min-width: 0;
}
.ui-swagger-control {
  display: inline-block;
  flex-shrink: 0;
  height: 32px;
  position: relative;
  width: 56px;
}
.ui-swagger-input {
  cursor: pointer;
  height: 100%;
  inset: 0;
  margin: 0;
  opacity: 0;
  position: absolute;
  width: 100%;
  z-index: 1;
}
.ui-swagger-track {
  background: rgb(var(--ui-control-bg-hover-rgb, 226 232 240));
  border-radius: 999px;
  inset: 0;
  pointer-events: none;
  position: absolute;
  transition: background-color 0.2s ease;
}
.ui-swagger-thumb {
  background: #fff;
  border-radius: 999px;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.18);
  height: 24px;
  left: 4px;
  pointer-events: none;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  transition: transform 0.2s ease;
  width: 24px;
}
.ui-swagger-input:checked + .ui-swagger-track {
  background: rgb(var(--ui-control-checked-rgb, 0 0 0));
}
.ui-swagger-input:checked ~ .ui-swagger-thumb {
  transform: translate(24px, -50%);
}
.ui-swagger-input:focus-visible + .ui-swagger-track {
  box-shadow:
    0 0 0 2px rgb(255 255 255),
    0 0 0 4px rgb(var(--ui-focus-ring-rgb, 0 0 0) / 0.22);
}
`;
