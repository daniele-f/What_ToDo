import {startOfISOWeek, startOfLocalDay} from './time';

export type Repeat = 'none' | 'daily' | 'weekly';
export type RowType = 'header' | 'todo';

export type Row = {
    id: string;
    type: RowType;
    text: string;
    indent: number; // hierarchy depth; 0 = top-level
    repeat: Repeat;
    done: boolean;
    lastCompletedAt?: string; // ISO (UTC)
    createdAt: string; // ISO (UTC)
    updatedAt: string; // ISO (UTC)
};

export type Store = {
    version: 1;
    rows: Row[];
    lastEditedAt?: string; // ISO (UTC)
};

export const STORAGE_KEY = 'todo-store-v1';

let store: Store = loadFromLocalStorage();

const listeners: Array<() => void> = [];

function notify() {
    for (const fn of listeners) fn();
}

export function subscribe(fn: () => void): () => void {
    listeners.push(fn);
    return () => {
        const i = listeners.indexOf(fn);
        if (i >= 0) listeners.splice(i, 1);
    };
}

function nowISO(): string {
    return new Date().toISOString();
}

export function getStore(): Store {
    return store;
}

function sanitize(s: Store): Store {
    // Coerce invalid repeat for headers to 'none' and ensure indent defaults
    for (const r of s.rows as Row[]) {
        if (r.type === 'header' && r.repeat !== 'none') {
            r.repeat = 'none';
        }
        // Ensure indent is a non-negative integer
        if (typeof (r as any).indent !== 'number' || !(isFinite((r as any).indent)) || (r as any).indent < 0) {
            (r as any).indent = 0;
        } else {
            // normalize to integer
            (r as any).indent = Math.max(0, Math.floor((r as any).indent));
        }
    }
    return s;
}

function loadFromLocalStorage(): Store {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
        const fresh: Store = {version: 1, rows: []};
        localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
        return fresh;
    }
    try {
        const parsed = JSON.parse(raw) as Store;
        if (parsed && parsed.version === 1 && Array.isArray(parsed.rows)) {
            return sanitize(parsed);
        }
    } catch (_) {
        // ignore
    }
    const fallback: Store = {version: 1, rows: []};
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fallback));
    return fallback;
}

function persist() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function bumpLastEdited() {
    store.lastEditedAt = nowISO();
}

export function reloadFromLocalStorage() {
    store = loadFromLocalStorage();
    notify();
}

export function recomputeResets(now = new Date()): boolean {
    const dayStart = startOfLocalDay(now).getTime();
    const weekStart = startOfISOWeek(now).getTime();
    let changed = false;
    for (const r of store.rows) {
        if (r.type !== 'todo') continue;
        if (!r.done || !r.lastCompletedAt) continue;
        const completedAt = new Date(r.lastCompletedAt).getTime();
        if (r.repeat === 'daily') {
            if (completedAt < dayStart) {
                r.done = false;
                // keep lastCompletedAt per spec; this is an automatic reset
                r.updatedAt = nowISO();
                changed = true;
            }
        } else if (r.repeat === 'weekly') {
            if (completedAt < weekStart) {
                r.done = false;
                r.updatedAt = nowISO();
                changed = true;
            }
        }
    }
    // After any resets, recompute parent todo statuses based on children
    if (recomputeAncestorStatuses()) changed = true;
    if (changed) {
        persist();
        notify();
    }
    return changed;
}

export function addRow(type: RowType, text: string, repeat: Repeat): Row {
    const id = crypto.randomUUID();
    const now = nowISO();
    const row: Row = {
        id,
        type,
        text: text.trim(),
        indent: 0,
        repeat: type === 'header' ? 'none' : repeat,
        done: false,
        createdAt: now,
        updatedAt: now,
    };
    store.rows.push(row);
    bumpLastEdited();
    persist();
    notify();
    return row;
}

export function editRowText(id: string, newText: string) {
    const r = store.rows.find(x => x.id === id);
    if (!r) return;
    const t = newText.trim();
    if (t.length === 0) return;
    r.text = t;
    r.updatedAt = nowISO();
    bumpLastEdited();
    persist();
    notify();
}

export function setRowRepeat(id: string, repeat: Repeat) {
    const r = store.rows.find(x => x.id === id);
    if (!r) return;
    if (r.type === 'header') {
        // coerce to none
        if (r.repeat !== 'none') {
            r.repeat = 'none';
            r.updatedAt = nowISO();
            bumpLastEdited();
            persist();
            notify();
        }
        return;
    }
    r.repeat = repeat;
    r.updatedAt = nowISO();
    bumpLastEdited();
    persist();
    notify();
}

export function changeIndent(id: string, delta: number) {
    const r = store.rows.find(x => x.id === id);
    if (!r) return;
    const newIndent = Math.max(0, Math.floor((r.indent ?? 0) + delta));
    if (newIndent === r.indent) return;
    r.indent = newIndent;
    r.updatedAt = nowISO();
    // After indentation changes, recompute parent statuses globally
    recomputeAncestorStatuses();
    bumpLastEdited();
    persist();
    notify();
}

// === Hierarchy helpers ===
function subtreeEndIndex(startIndex: number): number {
    const base = store.rows[startIndex]?.indent ?? 0;
    let i = startIndex + 1;
    while (i < store.rows.length && (store.rows[i].indent ?? 0) > base) i++;
    return i;
}

function applyDoneToSubtreeTodos(startIndex: number, done: boolean, now: string) {
    const end = subtreeEndIndex(startIndex);
    for (let i = startIndex + 1; i < end; i++) {
        const r = store.rows[i];
        if (r.type !== 'todo') continue;
        if (r.done === done) continue;
        r.done = done;
        if (done) r.lastCompletedAt = now; else delete r.lastCompletedAt;
        r.updatedAt = now;
    }
}

function recomputeAncestorStatuses(): boolean {
    let changed = false;
    const now = nowISO();
    for (let i = 0; i < store.rows.length; i++) {
        const r = store.rows[i];
        if (r.type !== 'todo') continue;
        const end = subtreeEndIndex(i);
        let anyTodo = false;
        let allDone = true;
        for (let j = i + 1; j < end; j++) {
            const child = store.rows[j];
            if (child.type !== 'todo') continue;
            anyTodo = true;
            if (!child.done) { allDone = false; break; }
        }
        if (anyTodo) {
            if (r.done !== allDone) {
                r.done = allDone;
                if (allDone) r.lastCompletedAt = now; else delete r.lastCompletedAt;
                r.updatedAt = now;
                changed = true;
            }
        }
    }
    return changed;
}

function bubbleUpFromIndex(index: number): boolean {
    let changed = false;
    let curIndent = store.rows[index]?.indent ?? 0;
    const now = nowISO();
    for (let i = index - 1; i >= 0;) {
        while (i >= 0 && store.rows[i].indent >= curIndent) i--;
        if (i < 0) break;
        const anc = store.rows[i];
        const end = subtreeEndIndex(i);
        let anyTodo = false;
        let allDone = true;
        for (let j = i + 1; j < end; j++) {
            const child = store.rows[j];
            if (child.type !== 'todo') continue;
            anyTodo = true;
            if (!child.done) { allDone = false; break; }
        }
        if (anc.type === 'todo' && anyTodo) {
            if (anc.done !== allDone) {
                anc.done = allDone;
                if (allDone) anc.lastCompletedAt = now; else delete anc.lastCompletedAt;
                anc.updatedAt = now;
                changed = true;
            }
        }
        curIndent = anc.indent;
        i--; // continue scanning up
    }
    return changed;
}

export function toggleTodoDone(id: string, done: boolean) {
    const idx = store.rows.findIndex(x => x.id === id && x.type === 'todo');
    if (idx === -1) return;
    const r = store.rows[idx];
    const now = nowISO();
    r.done = done;
    if (done) {
        r.lastCompletedAt = now;
    } else {
        delete r.lastCompletedAt;
    }
    r.updatedAt = now;

    // Apply to subtree todos
    applyDoneToSubtreeTodos(idx, done, now);

    // Bubble up to parents
    bubbleUpFromIndex(idx);

    bumpLastEdited();
    persist();
    notify();
}

export function deleteRow(id: string) {
    const idx = store.rows.findIndex(x => x.id === id);
    if (idx === -1) return;
    store.rows.splice(idx, 1);
    bumpLastEdited();
    persist();
    notify();
}

export function exportJSON(): string {
    return JSON.stringify(store, null, 2);
}

export function importJSON(json: string): boolean {
    try {
        const parsed = JSON.parse(json) as Store;
        if (!parsed || parsed.version !== 1 || !Array.isArray(parsed.rows)) return false;
        // minimal shape validation for rows
        for (const r of parsed.rows) {
            if (!r.id || !r.type || typeof r.text !== 'string') return false;
            if (r.type !== 'header' && r.type !== 'todo') return false;
            if (r.repeat !== 'none' && r.repeat !== 'daily' && r.repeat !== 'weekly') return false;
        }
        store = sanitize(parsed);
        persist();
        notify();
        return true;
    } catch {
        return false;
    }
}

export function moveRow(id: string, toIndex: number) {
    const fromIndex = store.rows.findIndex(r => r.id === id);
    if (fromIndex === -1) return;
    const blockEnd = subtreeEndIndex(fromIndex); // exclusive
    const blockLen = blockEnd - fromIndex;
    // Clamp destination within bounds [0, rows.length]
    const maxIndex = store.rows.length;
    let dest = Math.max(0, Math.min(maxIndex, toIndex));

    // If destination falls inside the moving block's range, it's a no-op
    if (dest > fromIndex && dest <= blockEnd) return;

    // Take out the whole subtree block
    const block = store.rows.splice(fromIndex, blockLen);

    // When moving down, account for the removed block
    if (fromIndex < dest) dest -= blockLen;

    // Insert the block at the destination
    store.rows.splice(dest, 0, ...block);

    bumpLastEdited();
    persist();
    notify();
}
