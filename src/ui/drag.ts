import {getStore, moveRow} from '../store';
import type {UiOptions} from './types';

export function createRowDragHandler(opts: UiOptions) {
  const DRAG_CLASS_BEFORE = 'drop-before';
  const DRAG_CLASS_AFTER = 'drop-after';
  const DRAG_CLASS_INVALID = 'drop-invalid';
  let draggingId: string | null = null;

  function enableRowDrag(el: HTMLElement, rowId: string) {
    el.setAttribute('draggable', 'true');
    el.addEventListener('dragstart', (e: DragEvent) => {
      draggingId = rowId;
      el.classList.add('dragging');
      try { e.dataTransfer?.setData('text/plain', rowId); } catch {}
      if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    });
    el.addEventListener('dragend', () => {
      el.classList.remove('dragging');
      el.classList.remove(DRAG_CLASS_BEFORE, DRAG_CLASS_AFTER, DRAG_CLASS_INVALID);
      draggingId = null;
    });
    el.addEventListener('dragover', (e: DragEvent) => {
      if (!draggingId) return;
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      el.classList.toggle(DRAG_CLASS_BEFORE, before);
      el.classList.toggle(DRAG_CLASS_AFTER, !before);

      // Determine if the drop position would be valid
      const store = getStore();
      const fromIndex = store.rows.findIndex(r => r.id === draggingId);
      const targetIndex = store.rows.findIndex(r => r.id === rowId);
      let invalid = false;
      if (fromIndex !== -1 && targetIndex !== -1) {
        const baseIndent = store.rows[fromIndex]?.indent ?? 0;
        let i = fromIndex + 1;
        while (i < store.rows.length && (store.rows[i].indent ?? 0) > baseIndent) i++;
        const blockEnd = i; // exclusive
        const toIndex = before ? targetIndex : targetIndex + 1;
        // Invalid if destination falls inside the moving block's range
        invalid = (toIndex > fromIndex && toIndex <= blockEnd);
      }
      el.classList.toggle(DRAG_CLASS_INVALID, invalid);

      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
    });
    el.addEventListener('dragleave', () => {
      el.classList.remove(DRAG_CLASS_BEFORE, DRAG_CLASS_AFTER, DRAG_CLASS_INVALID);
    });
    el.addEventListener('drop', (e: DragEvent) => {
      if (!draggingId) return;
      e.preventDefault();
      el.classList.remove(DRAG_CLASS_BEFORE, DRAG_CLASS_AFTER, DRAG_CLASS_INVALID);
      const rect = el.getBoundingClientRect();
      const before = (e.clientY - rect.top) < rect.height / 2;
      const store = getStore();
      const fromIndex = store.rows.findIndex(r => r.id === draggingId);
      const targetIndex = store.rows.findIndex(r => r.id === rowId);
      if (fromIndex === -1 || targetIndex === -1) return;
      const toIndex = before ? targetIndex : targetIndex + 1;

      // Compute invalid placement (destination inside moving block)
      const baseIndent = store.rows[fromIndex]?.indent ?? 0;
      let i = fromIndex + 1;
      while (i < store.rows.length && (store.rows[i].indent ?? 0) > baseIndent) i++;
      const blockEnd = i; // exclusive
      const invalid = (toIndex > fromIndex && toIndex <= blockEnd);
      if (invalid || toIndex === fromIndex) return;

      opts.onBeforeMutate?.();
      moveRow(draggingId, toIndex);
    });
  }

  return { enableRowDrag };
}
