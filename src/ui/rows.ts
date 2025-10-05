import {changeIndent, deleteRow, editRowText, Repeat, Row, setRowRepeat, toggleTodoDone} from '../store';
import type {RenderContext} from './types';

export function renderHeaderRow(row: Row, ctx: RenderContext): HTMLElement {
  const {mode, opts, enableRowDrag} = ctx;
  const line = document.createElement('div');
  line.className = 'row-line';

  const el = document.createElement('div');
  el.className = 'row header';
  (el.style as any).marginLeft = `${(row as any).indent ? (row as any).indent * 24 : 0}px`;

  const text = document.createElement('div');
  text.textContent = row.text;
  el.appendChild(text);

  if (mode === 'edit') {
    const leading = document.createElement('div');
    leading.className = 'indent-group';

    const outdentBtn = document.createElement('button');
    outdentBtn.className = 'icon icon-left';
    outdentBtn.textContent = '<';
    outdentBtn.title = 'Outdent (Shift+Tab)';
    outdentBtn.setAttribute('aria-label', `Outdent header: ${row.text}`);
    outdentBtn.disabled = (row.indent ?? 0) === 0;
    outdentBtn.addEventListener('click', () => {
      opts.onBeforeMutate?.();
      changeIndent(row.id, -1);
    });

    const indentBtn = document.createElement('button');
    indentBtn.className = 'icon icon-right';
    indentBtn.textContent = '>';
    indentBtn.title = 'Indent (Tab)';
    indentBtn.setAttribute('aria-label', `Indent header: ${row.text}`);
    indentBtn.addEventListener('click', () => {
      opts.onBeforeMutate?.();
      changeIndent(row.id, 1);
    });

    leading.appendChild(outdentBtn);
    leading.appendChild(indentBtn);
    line.appendChild(leading);

    // Drag handle to indicate rows are draggable
    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    dragHandle.title = 'Drag to reorder';
    dragHandle.setAttribute('aria-label', `Drag to reorder: ${row.text}`);
    dragHandle.textContent = '☰';
    line.appendChild(dragHandle);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'secondary';
    editBtn.textContent = 'Edit';
    editBtn.setAttribute('aria-label', `Edit header: ${row.text}`);
    editBtn.addEventListener('click', () => {
      const v = prompt('Edit header text:', row.text);
      if (v != null) {
        const nv = v.trim();
        if (nv) {
          opts.onBeforeMutate?.();
          editRowText(row.id, nv);
        }
      }
    });
    const delBtn = document.createElement('button');
    delBtn.className = 'icon danger';
    delBtn.textContent = '🗑︎';
    delBtn.title = 'Delete';
    delBtn.setAttribute('aria-label', `Delete header: ${row.text}`);
    delBtn.addEventListener('click', () => {
      if (confirm('Delete this header?')) {
        opts.onBeforeMutate?.();
        deleteRow(row.id);
      }
    });
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    el.appendChild(actions);
    // Enable drag & drop reordering in edit mode
    enableRowDrag(line, row.id);
  } else {
    // read mode: nothing extra
  }

  line.appendChild(el);
  return line;
}

export function renderTodoRow(row: Row, ctx: RenderContext): HTMLElement {
  const {mode, opts, enableRowDrag} = ctx;
  const line = document.createElement('div');
  line.className = 'row-line';

  const el = document.createElement('div');
  el.className = 'row todo';
  (el.style as any).marginLeft = `${(row as any).indent ? (row as any).indent * 24 : 0}px`;

  if (mode === 'read') {
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.className = 'checkbox';
    cb.checked = row.done;
    cb.setAttribute('aria-label', `Toggle todo: ${row.text}`);
    cb.addEventListener('change', () => {
      opts.onBeforeMutate?.();
      toggleTodoDone(row.id, cb.checked);
    });
    el.appendChild(cb);
  } else {
    const spacer = document.createElement('div');
    spacer.className = 'checkbox-spacer';
    el.appendChild(spacer);
  }

  const text = document.createElement('div');
  text.className = 'text';
  const label = document.createElement('span');
  label.textContent = row.text;
  text.appendChild(label);
  if (row.repeat !== 'none') {
    const badge = document.createElement('span');
    badge.className = `badge ${row.repeat}`;
    badge.textContent = row.repeat;
    badge.setAttribute('aria-label', `Repeat: ${row.repeat}`);
    text.appendChild(badge);
  }
  el.appendChild(text);

  if (mode === 'edit') {
    const leading = document.createElement('div');
    leading.className = 'indent-group';

    const outdentBtn = document.createElement('button');
    outdentBtn.className = 'icon icon-left';
    outdentBtn.textContent = '<';
    outdentBtn.title = 'Outdent (Shift+Tab)';
    outdentBtn.setAttribute('aria-label', `Outdent todo: ${row.text}`);
    outdentBtn.disabled = (row.indent ?? 0) === 0;
    outdentBtn.addEventListener('click', () => {
      opts.onBeforeMutate?.();
      changeIndent(row.id, -1);
    });

    const indentBtn = document.createElement('button');
    indentBtn.className = 'icon icon-right';
    indentBtn.textContent = '>';
    indentBtn.title = 'Indent (Tab)';
    indentBtn.setAttribute('aria-label', `Indent todo: ${row.text}`);
    indentBtn.addEventListener('click', () => {
      opts.onBeforeMutate?.();
      changeIndent(row.id, 1);
    });

    leading.appendChild(outdentBtn);
    leading.appendChild(indentBtn);
    line.appendChild(leading);

    // Drag handle to indicate rows are draggable
    const dragHandle = document.createElement('div');
    dragHandle.className = 'drag-handle';
    dragHandle.title = 'Drag to reorder';
    dragHandle.setAttribute('aria-label', `Drag to reorder: ${row.text}`);
    dragHandle.textContent = '☰';
    line.appendChild(dragHandle);

    const actions = document.createElement('div');
    actions.className = 'actions';

    const repSel = document.createElement('select');
    for (const val of ['none', 'daily', 'weekly'] as Repeat[]) {
      const o = document.createElement('option');
      o.value = val;
      o.textContent = val;
      if (val === row.repeat) o.selected = true;
      repSel.appendChild(o);
    }
    repSel.setAttribute('aria-label', `Change repeat for: ${row.text}`);
    repSel.addEventListener('change', () => {
      const val = repSel.value as Repeat;
      opts.onBeforeMutate?.();
      setRowRepeat(row.id, val);
    });

    const editBtn = document.createElement('button');
    editBtn.className = 'secondary';
    editBtn.textContent = 'Edit';
    editBtn.setAttribute('aria-label', `Edit todo: ${row.text}`);
    editBtn.addEventListener('click', () => {
      const v = prompt('Edit todo text:', row.text);
      if (v != null) {
        const nv = v.trim();
        if (nv) {
          opts.onBeforeMutate?.();
          editRowText(row.id, nv);
        }
      }
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'icon danger';
    delBtn.textContent = '🗑︎';
    delBtn.title = 'Delete';
    delBtn.setAttribute('aria-label', `Delete todo: ${row.text}`);
    delBtn.addEventListener('click', () => {
      if (confirm('Delete this todo?')) {
        opts.onBeforeMutate?.();
        deleteRow(row.id);
      }
    });

    actions.appendChild(repSel);
    actions.appendChild(editBtn);
    actions.appendChild(delBtn);
    el.appendChild(actions);
    // Enable drag & drop reordering in edit mode
    enableRowDrag(line, row.id);
  } else {
    const spacer = document.createElement('div');
    el.appendChild(spacer);
  }

  line.appendChild(el);
  return line;
}
