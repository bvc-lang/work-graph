/**
 * Vanilla combobox for wg-select (injected into backlog UI client script).
 * Mirrors Gripe uiSelectCombobox: hidden native <select> + trigger + drop-list.
 */

const PANEL_GAP_PX = 4;
const VIEWPORT_PAD_PX = 8;
const PANEL_MIN_HEIGHT_PX = 120;

export function initWgSelectComboboxes(root = document) {
  root.querySelectorAll('[data-wg-select-combobox]:not([data-wg-select-combobox-ready])').forEach((wrap) => {
    mountWgSelectCombobox(wrap);
  });
}

export function mountWgSelectCombobox(wrap) {
  if (!wrap || wrap.dataset.wgSelectComboboxReady === 'true') {
    return;
  }

  const native = wrap.querySelector('select.wg-select--native');
  const trigger = wrap.querySelector('.wg-select-trigger');
  const panel = wrap.querySelector('.wg-select-panel');
  const listbox = wrap.querySelector('.ui-drop-list');
  const labelEl = wrap.querySelector('.wg-select-trigger-label');

  if (!native || !trigger || !panel || !listbox || !labelEl) {
    return;
  }

  wrap.dataset.wgSelectComboboxReady = 'true';

  function resetPanelPlacement() {
    panel.classList.remove('wg-select-panel--above', 'wg-select-panel--align-end');
    panel.style.left = '';
    panel.style.right = '';
    panel.style.top = '';
    panel.style.bottom = '';
    listbox.style.maxHeight = '';
  }

  function positionPanel() {
    resetPanelPlacement();

    const triggerRect = trigger.getBoundingClientRect();
    const wrapRect = wrap.getBoundingClientRect();
    const panelHeight = panel.offsetHeight;
    const panelWidth = panel.offsetWidth;
    const viewportHeight = window.innerHeight;
    const viewportWidth = window.innerWidth;

    const spaceBelow = viewportHeight - triggerRect.bottom - VIEWPORT_PAD_PX;
    const spaceAbove = triggerRect.top - VIEWPORT_PAD_PX;
    const openAbove = panelHeight > spaceBelow && spaceAbove > spaceBelow;

    if (openAbove) {
      panel.classList.add('wg-select-panel--above');
      listbox.style.maxHeight = `${Math.max(PANEL_MIN_HEIGHT_PX, spaceAbove - PANEL_GAP_PX)}px`;
    } else {
      listbox.style.maxHeight = `${Math.max(PANEL_MIN_HEIGHT_PX, spaceBelow - PANEL_GAP_PX)}px`;
    }

    const panelRightIfLeftAligned = wrapRect.left + panelWidth;
    if (panelRightIfLeftAligned > viewportWidth - VIEWPORT_PAD_PX) {
      panel.classList.add('wg-select-panel--align-end');
    }

    const panelRect = panel.getBoundingClientRect();
    if (panelRect.left < VIEWPORT_PAD_PX) {
      panel.classList.remove('wg-select-panel--align-end');
      panel.style.left = `${Math.max(0, VIEWPORT_PAD_PX - wrapRect.left)}px`;
    }
  }

  function onViewportChange() {
    if (!panel.hidden) {
      positionPanel();
    }
  }

  function syncFromNative() {
    const selectedValue = native.value;
    const options = [...native.options].map((option) => ({
      value: option.value,
      label: (option.textContent || '').trim(),
      disabled: option.disabled,
    }));

    trigger.disabled = native.disabled;
    wrap.classList.toggle('is-disabled', native.disabled);

    const selected = options.find((option) => option.value === selectedValue);
    labelEl.textContent = selected?.label ?? '';

    listbox.innerHTML = options.map((option) => {
      const active = option.value === selectedValue;
      return (
        '<button type="button" role="option" class="ui-drop-list-item ui-select-option' +
        (active ? ' ui-select-option--active' : '') + '"' +
        ' data-value="' + escapeAttr(option.value) + '"' +
        (option.disabled ? ' disabled' : '') +
        ' aria-selected="' + (active ? 'true' : 'false') + '">' +
        '<span class="ui-select-option-label">' + escapeText(option.label) + '</span>' +
        (active ? '<span class="ui-select-option-check" aria-hidden="true">✓</span>' : '') +
        '</button>'
      );
    }).join('');

    trigger.setAttribute('aria-expanded', panel.hidden ? 'false' : 'true');
    if (!panel.hidden) {
      positionPanel();
    }
  }

  function closePanel() {
    panel.hidden = true;
    resetPanelPlacement();
    trigger.setAttribute('aria-expanded', 'false');
  }

  function openPanel() {
    if (native.disabled) return;
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    positionPanel();
  }

  function togglePanel() {
    if (panel.hidden) openPanel();
    else closePanel();
  }

  function choose(value) {
    if (native.disabled) return;
    if (native.value === value) {
      closePanel();
      return;
    }
    native.value = value;
    native.dispatchEvent(new Event('input', { bubbles: true }));
    native.dispatchEvent(new Event('change', { bubbles: true }));
    closePanel();
    syncFromNative();
  }

  trigger.addEventListener('click', (event) => {
    event.preventDefault();
    togglePanel();
  });

  listbox.addEventListener('click', (event) => {
    const optionBtn = event.target.closest('[data-value]');
    if (!optionBtn || optionBtn.disabled) return;
    choose(optionBtn.dataset.value);
  });

  document.addEventListener('click', (event) => {
    if (!panel.hidden && !wrap.contains(event.target)) {
      closePanel();
    }
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !panel.hidden) {
      closePanel();
    }
  });

  window.addEventListener('resize', onViewportChange);
  window.addEventListener('scroll', onViewportChange, true);

  native.addEventListener('change', syncFromNative);

  const observer = new MutationObserver(syncFromNative);
  observer.observe(native, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['disabled', 'hidden'],
  });

  wrap.__wgSelectSync = syncFromNative;
  syncFromNative();
}

export function syncWgSelectComboboxForNative(selectEl) {
  const wrap = selectEl?.closest?.('[data-wg-select-combobox]');
  if (wrap && typeof wrap.__wgSelectSync === 'function') {
    wrap.__wgSelectSync();
  }
}

function escapeAttr(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;');
}

function escapeText(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
