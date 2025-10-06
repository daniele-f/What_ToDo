import {commitPendingEdits, getStore, setPersistenceSuspended, undoPendingEdits, getHasPendingEdits} from '../store';
import type {UiOptions, Mode, RenderContext} from './types';
import {buildEditControls} from './controls';
import {createRowDragHandler} from './drag';
import {renderHeaderRow, renderTodoRow} from './rows';
import {updateRelativeTimer} from './timer';

export function initUI(root: HTMLElement, opts: UiOptions = {}) {
  let mode: Mode = 'read';

  function render() {
    const store = getStore();

    root.innerHTML = '';
    // Mark edit mode on the root for CSS styling
    if (mode === 'edit') root.classList.add('mode-edit'); else root.classList.remove('mode-edit');

    const topbar = document.createElement('div');
    topbar.className = 'topbar';

    const left = document.createElement('div');
    left.className = 'left';

    const right = document.createElement('div');
    right.className = 'right';

    const modeBtn = document.createElement('button');
    modeBtn.className = 'secondary';
    modeBtn.setAttribute('aria-label', 'Toggle edit mode');
    const setModeButtonText = () => {
      if (mode === 'read') {
        modeBtn.textContent = 'Edit mode';
      } else {
        modeBtn.textContent = getHasPendingEdits() ? 'Save Changes' : 'Exit Edit Mode';
      }
    };
    setModeButtonText();
    modeBtn.addEventListener('click', () => {
      if (mode === 'read') {
        // Entering edit mode: suspend persistence so edits are not saved until Save is pressed
        setPersistenceSuspended(true);
        mode = 'edit';
      } else {
        // Leaving edit mode via Save: commit pending edits and re-enable persistence
        commitPendingEdits();
        mode = 'read';
      }
      render();
    });


        if (mode === 'edit') {
          const undoBtn = document.createElement('button');
          undoBtn.className = 'secondary';
          undoBtn.textContent = 'Undo';
          undoBtn.setAttribute('aria-label', 'Undo changes since entering edit mode');
          undoBtn.disabled = !getHasPendingEdits();
          undoBtn.addEventListener('click', () => {
            if (undoBtn.disabled) return;
            // Discard all in-memory edits made during this edit session
            undoPendingEdits();
            // Stay in edit mode; just re-render to reflect original state
            render();
          });
          right.appendChild(undoBtn);
        }

        right.appendChild(modeBtn);

        topbar.appendChild(left);
        topbar.appendChild(right);

    const card = document.createElement('div');
    card.className = 'card';

    if (mode === 'edit') {
      card.appendChild(buildEditControls(opts));
    }

    if (getStore().rows.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty';
      empty.textContent = 'No items yet. Toggle Edit mode to add headers and todos.';
      card.appendChild(empty);
    } else {
      const list = document.createElement('div');
      list.className = 'list';
      const rows = getStore().rows;

      const {enableRowDrag} = createRowDragHandler(opts);
      const ctx: RenderContext = {mode, opts, enableRowDrag};

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const indent = (row as any).indent ? (row as any).indent : 0;
        const prevIndent = i > 0 ? ((rows[i-1] as any).indent ? (rows[i-1] as any).indent : 0) : 0;
        const nextIndent = i < rows.length - 1 ? ((rows[i+1] as any).indent ? (rows[i+1] as any).indent : 0) : 0;
        const hasChildren = nextIndent > indent;
        const inGroup = indent > 0;
        const groupFirst = inGroup && prevIndent < indent;
        const groupLast = inGroup && nextIndent < indent;

        if (hasChildren) {
          const block = document.createElement('div');
          block.className = 'group-block';
          (block.style as any).marginLeft = `${indent ? indent * 24 : 0}px`;

          const parentEl = row.type === 'header' ? renderHeaderRow(row, ctx) : renderTodoRow(row, ctx);
          parentEl.classList.add('group-parent');
          // Rebase the margin-left so the border wraps tightly
          const parentRowDiv = parentEl.querySelector('.row') as HTMLElement | null;
          if (parentRowDiv) (parentRowDiv.style as any).marginLeft = `${0}px`;
          block.appendChild(parentEl);

          let j = i + 1;
          while (j < rows.length && (((rows[j] as any).indent ? (rows[j] as any).indent : 0) > indent)) {
            const child = rows[j];
            const cIndent = (child as any).indent ? (child as any).indent : 0;
            const pIndent = ((rows[j-1] as any).indent ? (rows[j-1] as any).indent : 0);
            const nIndent = j < rows.length - 1 ? ((rows[j+1] as any).indent ? (rows[j+1] as any).indent : 0) : 0;
            const cInGroup = cIndent > 0;
            const cFirst = cInGroup && pIndent < cIndent;
            const cLast = cInGroup && nIndent < cIndent;

            const childEl = child.type === 'header' ? renderHeaderRow(child, ctx) : renderTodoRow(child, ctx);
            if (cInGroup) childEl.classList.add('group-child');
            if (cFirst) childEl.classList.add('group-first');
            if (cLast) childEl.classList.add('group-last');
            // Rebase child margins relative to the parent group
            const childRowDiv = childEl.querySelector('.row') as HTMLElement | null;
            if (childRowDiv) (childRowDiv.style as any).marginLeft = `${(cIndent - indent) * 24}px`;
            block.appendChild(childEl);
            j++;
          }
          list.appendChild(block);
          i = j - 1; // skip the consumed subtree
        } else {
          const lineEl = row.type === 'header' ? renderHeaderRow(row, ctx) : renderTodoRow(row, ctx);
          if (inGroup) lineEl.classList.add('group-child');
          if (groupFirst) lineEl.classList.add('group-first');
          if (groupLast) lineEl.classList.add('group-last');
          list.appendChild(lineEl);
        }
      }
      card.appendChild(list);
    }

    root.appendChild(topbar);
    root.appendChild(card);
  }

  return {render, updateRelativeTimer};
}
