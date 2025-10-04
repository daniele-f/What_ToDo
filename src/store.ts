import {startOfISOWeek, startOfLocalDay} from './time';

export type Repeat = 'none' | 'daily' | 'weekly';
export type RowType = 'header' | 'todo';

export type Row = {
    id: string;
    type: RowType;
    text: string;
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
    // Coerce invalid repeat for headers to 'none'
    for (const r of s.rows) {
        if (r.type === 'header' && r.repeat !== 'none') {
            r.repeat = 'none';
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

export function toggleTodoDone(id: string, done: boolean) {
    const r = store.rows.find(x => x.id === id && x.type === 'todo');
    if (!r) return;
    r.done = done;
    if (done) {
        r.lastCompletedAt = nowISO();
    } else {
        delete r.lastCompletedAt;
    }
    r.updatedAt = nowISO();
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
