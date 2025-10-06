import {addRow, exportJSON, importJSON} from '../store';
import type {Repeat, RowType} from '../store';
import type {UiOptions} from './types';

export function buildEditControls(opts: UiOptions): HTMLElement {
  const controls = document.createElement('div');
  controls.className = 'controls';

  const typeSel = document.createElement('select');
  typeSel.setAttribute('aria-label', 'Row type');
  const optHeader = document.createElement('option');
  optHeader.value = 'header';
  optHeader.textContent = 'Header';
  const optTodo = document.createElement('option');
  optTodo.value = 'todo';
  optTodo.textContent = 'Todo';
  typeSel.appendChild(optTodo);
  typeSel.appendChild(optHeader);

  const textInput = document.createElement('input');
  textInput.type = 'text';
  textInput.placeholder = 'Text...';
  textInput.setAttribute('aria-label', 'Row text');

  const repeatSel = document.createElement('select');
  repeatSel.setAttribute('aria-label', 'Repeat');
  for (const val of ['daily', 'weekly', 'none'] as Repeat[]) {
    const o = document.createElement('option');
    o.value = val;
    o.textContent = val;
    repeatSel.appendChild(o);
  }

  function syncRepeatEnabled() {
    const isHeader = (typeSel.value as RowType) === 'header';
    repeatSel.value = isHeader ? 'none' : (repeatSel.value || 'none');
    repeatSel.disabled = isHeader;
  }

  typeSel.addEventListener('change', syncRepeatEnabled);
  syncRepeatEnabled();

  function doAdd() {
    const type = typeSel.value as RowType;
    const text = textInput.value.trim();
    const repeat = repeatSel.value as Repeat;
    if (!text) return;
    opts.onBeforeMutate?.();
    // headers are coerced to none in store
    addRow(type, text, repeat);
    textInput.value = '';
    textInput.focus();
  }

  const addBtn = document.createElement('button');
  addBtn.textContent = 'Add';
  addBtn.setAttribute('aria-label', 'Add new row');
  addBtn.addEventListener('click', () => doAdd());

  // Pressing Enter while typing text should add the item
  textInput.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doAdd();
    }
  });

  const exportBtn = document.createElement('button');
  exportBtn.className = 'secondary';
  exportBtn.textContent = 'Export JSON';
  exportBtn.setAttribute('aria-label', 'Export data as JSON');
  exportBtn.addEventListener('click', () => {
    const data = exportJSON();
    const blob = new Blob([data], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'todo-store-v1.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  });

  const importBtn = document.createElement('button');
  importBtn.className = 'secondary';
  importBtn.textContent = 'Import JSON';
  importBtn.setAttribute('aria-label', 'Import data from JSON');
  const fileInput = document.createElement('input');
  fileInput.type = 'file';
  fileInput.accept = '.json,application/json';
  fileInput.classList.add('hidden');
  fileInput.addEventListener('change', () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? '');
      if (!text) return;
      if (!confirm('Import will replace current data. Continue?')) return;
      opts.onBeforeMutate?.();
      const ok = importJSON(text);
      if (!ok) alert('Invalid JSON format.');
    };
    reader.readAsText(file);
    fileInput.value = '';
  });
  importBtn.addEventListener('click', () => fileInput.click());

  controls.appendChild(typeSel);
  controls.appendChild(textInput);
  controls.appendChild(repeatSel);
  controls.appendChild(addBtn);
  controls.appendChild(exportBtn);
  controls.appendChild(importBtn);
  controls.appendChild(fileInput);
  return controls;
}
