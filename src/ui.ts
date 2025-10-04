import {deleteRow, editRowText, exportJSON, getStore, importJSON, moveRow, Repeat, Row, RowType, setRowRepeat, toggleTodoDone} from './store';
import {formatLocalDDMMYYYYHHmm, relativeHM} from './time';

export type Mode = 'read' | 'edit';

export type UiOptions = {
    onBeforeMutate?: () => void; // called before any user mutation (for clock jump resets)
};

export function initUI(root: HTMLElement, opts: UiOptions = {}) {
    let mode: Mode = 'read';

    function render() {
        const store = getStore();

        root.innerHTML = '';

        const topbar = document.createElement('div');
        topbar.className = 'topbar';

        const left = document.createElement('div');
        left.className = 'left';

        const lastEditedSpan = document.createElement('div');
        lastEditedSpan.className = 'meta';
        const abs = store.lastEditedAt ? formatLocalDDMMYYYYHHmm(new Date(store.lastEditedAt)) : 'Never';
        const rel = store.lastEditedAt ? ` (${relativeHM(new Date(store.lastEditedAt), new Date())})` : '';
        lastEditedSpan.id = 'last-edited';
        lastEditedSpan.textContent = `Last edited at: ${abs}${rel}`;
        left.appendChild(lastEditedSpan);

        const right = document.createElement('div');
        right.className = 'right';

        const refreshBtn = document.createElement('button');
        refreshBtn.textContent = 'Refresh';
        refreshBtn.setAttribute('aria-label', 'Refresh page');
        refreshBtn.addEventListener('click', () => {
            location.reload();
        });

        const modeBtn = document.createElement('button');
        modeBtn.className = 'secondary';
        modeBtn.setAttribute('aria-label', 'Toggle edit mode');
        const setModeButtonText = () => {
            modeBtn.textContent = mode === 'read' ? 'Edit mode' : 'Save';
        };
        setModeButtonText();
        modeBtn.addEventListener('click', () => {
            mode = mode === 'read' ? 'edit' : 'read';
            render();
        });

        left.appendChild(refreshBtn);
        right.appendChild(modeBtn);

        topbar.appendChild(left);
        topbar.appendChild(right);

        const card = document.createElement('div');
        card.className = 'card';

        if (mode === 'edit') {
            card.appendChild(buildEditControls());
        }

        if (getStore().rows.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'empty';
            empty.textContent = 'No items yet. Toggle Edit mode to add headers and todos.';
            card.appendChild(empty);
        } else {
            const list = document.createElement('div');
            list.className = 'list';
            for (const row of getStore().rows) {
                if (row.type === 'header') list.appendChild(renderHeaderRow(row));
                else list.appendChild(renderTodoRow(row));
            }
            card.appendChild(list);
        }

        root.appendChild(topbar);
        root.appendChild(card);

        const DRAG_CLASS_BEFORE = 'drop-before';
        const DRAG_CLASS_AFTER = 'drop-after';
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
                el.classList.remove(DRAG_CLASS_BEFORE, DRAG_CLASS_AFTER);
                draggingId = null;
            });
            el.addEventListener('dragover', (e: DragEvent) => {
                if (!draggingId) return;
                e.preventDefault();
                const rect = el.getBoundingClientRect();
                const before = (e.clientY - rect.top) < rect.height / 2;
                el.classList.toggle(DRAG_CLASS_BEFORE, before);
                el.classList.toggle(DRAG_CLASS_AFTER, !before);
                if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
            });
            el.addEventListener('dragleave', () => {
                el.classList.remove(DRAG_CLASS_BEFORE, DRAG_CLASS_AFTER);
            });
            el.addEventListener('drop', (e: DragEvent) => {
                if (!draggingId) return;
                e.preventDefault();
                el.classList.remove(DRAG_CLASS_BEFORE, DRAG_CLASS_AFTER);
                const rect = el.getBoundingClientRect();
                const before = (e.clientY - rect.top) < rect.height / 2;
                const store = getStore();
                const fromIndex = store.rows.findIndex(r => r.id === draggingId);
                const targetIndex = store.rows.findIndex(r => r.id === rowId);
                if (fromIndex === -1 || targetIndex === -1) return;
                let toIndex = before ? targetIndex : targetIndex + 1;
                opts.onBeforeMutate?.();
                moveRow(draggingId, toIndex);
            });
        }

        function buildEditControls(): HTMLElement {
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

            const addBtn = document.createElement('button');
            addBtn.textContent = 'Add';
            addBtn.setAttribute('aria-label', 'Add new row');
            addBtn.addEventListener('click', () => {
                const type = typeSel.value as RowType;
                const text = textInput.value.trim();
                const repeat = repeatSel.value as Repeat;
                if (!text) return;
                opts.onBeforeMutate?.();
                // headers are coerced to none in store
                import('./store').then(m => m.addRow(type, text, repeat));
                textInput.value = '';
                textInput.focus();
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

        function renderHeaderRow(row: Row): HTMLElement {
            const el = document.createElement('div');
            el.className = 'row header';
            const text = document.createElement('div');
            text.textContent = row.text;
            el.appendChild(text);
            if (mode === 'edit') {
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
                delBtn.className = 'danger';
                delBtn.textContent = 'Delete';
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
                enableRowDrag(el, row.id);
            }
            return el;
        }

        function renderTodoRow(row: Row): HTMLElement {
            const el = document.createElement('div');
            el.className = 'row todo';

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
                delBtn.className = 'danger';
                delBtn.textContent = 'Delete';
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
                enableRowDrag(el, row.id);
            } else {
                const spacer = document.createElement('div');
                el.appendChild(spacer);
            }

            return el;
        }
    }

    function updateRelativeTimer() {
        const store = getStore();
        const el = document.getElementById('last-edited');
        if (!el) return;
        const abs = store.lastEditedAt ? formatLocalDDMMYYYYHHmm(new Date(store.lastEditedAt)) : 'Never';
        const rel = store.lastEditedAt ? ` (${relativeHM(new Date(store.lastEditedAt), new Date())})` : '';
        el.textContent = `Last edited at: ${abs}${rel}`;
    }

    return {render, updateRelativeTimer};
}
