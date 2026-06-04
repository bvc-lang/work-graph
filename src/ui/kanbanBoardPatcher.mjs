function findKanbanCardRoot(container, workId) {
  const card = container.querySelector('.kanban-card[data-work-id="' + workId + '"]');
  if (!card) {
    return null;
  }
  return card.closest('.task-atom-wrap') ?? card;
}

function findKanbanColumn(container, columnId) {
  return container.querySelector('[data-kanban-column="' + columnId + '"]');
}

function countKanbanCards(columnEl) {
  return columnEl.querySelectorAll('.kanban-card').length;
}

function clearKanbanColumnEmpty(columnEl) {
  const empty = columnEl.querySelector(':scope > .empty');
  if (empty) {
    empty.remove();
  }
}

function ensureKanbanColumnEmpty(columnEl, emptyHtml) {
  if (countKanbanCards(columnEl) === 0) {
    columnEl.insertAdjacentHTML('beforeend', emptyHtml || '<div class="empty"></div>');
  }
}

function updateKanbanColumnCount(columnEl) {
  const badge = columnEl.querySelector('[data-testid^="kanban-col-count-"]');
  if (badge) {
    badge.textContent = String(countKanbanCards(columnEl));
  }
}

function resortKanbanColumnCards(container, columnId, workIds) {
  const columnEl = findKanbanColumn(container, columnId);
  if (!columnEl || !Array.isArray(workIds) || workIds.length === 0) {
    return;
  }

  for (const workId of workIds) {
    const node = findKanbanCardRoot(container, workId);
    if (node) {
      columnEl.appendChild(node);
    }
  }
}

/**
 * @param {Element} container
 * @param {object} delta
 * @param {{ renderCard: Function, emptyColumnHtml?: string, itemsById: Map<string, object>, resortDoneColumnWorkIds?: string[] }} context
 */
export function applyKanbanBoardPatch(container, delta, context) {
  if (!container || !delta || delta.fullRender) {
    return { ok: false, reason: 'full-render' };
  }

  const { renderCard, emptyColumnHtml = '<div class="empty"></div>', itemsById } = context;
  if (typeof renderCard !== 'function' || !(itemsById instanceof Map)) {
    return { ok: false, reason: 'invalid-context' };
  }

  try {
    for (const remove of delta.removes ?? []) {
      const node = findKanbanCardRoot(container, remove.workId);
      const columnEl = findKanbanColumn(container, remove.fromColumnId);
      if (node) {
        node.remove();
      }
      if (columnEl) {
        updateKanbanColumnCount(columnEl);
        ensureKanbanColumnEmpty(columnEl, emptyColumnHtml);
      }
    }

    for (const move of delta.moves ?? []) {
      const node = findKanbanCardRoot(container, move.workId);
      const targetCol = findKanbanColumn(container, move.toColumnId);
      const sourceCol = findKanbanColumn(container, move.fromColumnId);
      if (!node || !targetCol) {
        throw new Error('move-target-missing');
      }
      clearKanbanColumnEmpty(targetCol);
      targetCol.appendChild(node);
      if (sourceCol) {
        updateKanbanColumnCount(sourceCol);
        ensureKanbanColumnEmpty(sourceCol, emptyColumnHtml);
      }
      updateKanbanColumnCount(targetCol);
    }

    for (const add of delta.adds ?? []) {
      const item = itemsById.get(add.workId);
      const targetCol = findKanbanColumn(container, add.toColumnId);
      if (!item || !targetCol) {
        throw new Error('add-target-missing');
      }
      clearKanbanColumnEmpty(targetCol);
      const html = renderCard(item, { isNew: true });
      targetCol.insertAdjacentHTML('beforeend', html);
      updateKanbanColumnCount(targetCol);
    }

    if (Array.isArray(context.resortDoneColumnWorkIds) && context.resortDoneColumnWorkIds.length > 0) {
      resortKanbanColumnCards(container, 'done', context.resortDoneColumnWorkIds);
    }

    return { ok: true };
  } catch (error) {
    return { ok: false, reason: error?.message || 'patch-failed' };
  }
}
