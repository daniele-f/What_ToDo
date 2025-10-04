import {describe, it, expect} from 'vitest';

// Minimal in-memory localStorage polyfill for tests
class LocalStorageMock {
  private store = new Map<string, string>();
  getItem(key: string) { return this.store.has(key) ? this.store.get(key)! : null; }
  setItem(key: string, value: string) { this.store.set(key, String(value)); }
  removeItem(key: string) { this.store.delete(key); }
  clear() { this.store.clear(); }
  key(index: number) { return Array.from(this.store.keys())[index] ?? null; }
  get length() { return this.store.size; }
}

async function loadStoreModule() {
  // Ensure localStorage exists before first import of the store module
  if (!(globalThis as any).localStorage) {
    (globalThis as any).localStorage = new LocalStorageMock();
  }
  return await import('../src/store');
}

function makeStoreJSON(row: any) {
  return JSON.stringify({version: 1, rows: [row]});
}

describe('Daily reset around midnight (local time)', () => {
  it('resets when lastCompletedAt is before today midnight (23:59 of previous day)', async () => {
    const {importJSON, recomputeResets, getStore} = await loadStoreModule();

    // Choose an arbitrary date, e.g., 15 Jan 2025, 12:00 local
    const now = new Date(2025, 0, 15, 12, 0, 0, 0);
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const beforeMidnight = new Date(dayStart.getTime() - 60_000); // 23:59 previous day

    const row = {
      id: 'r1', type: 'todo', text: 'daily task', repeat: 'daily' as const,
      done: true, lastCompletedAt: beforeMidnight.toISOString()
    };
    importJSON(makeStoreJSON(row));

    const changed = recomputeResets(now);
    const updated = getStore().rows[0];
    expect(changed).toBe(true);
    expect(updated.done).toBe(false);
  });

  it('does NOT reset when lastCompletedAt is exactly at today midnight (00:00)', async () => {
    const {importJSON, recomputeResets, getStore} = await loadStoreModule();

    const now = new Date(2025, 0, 15, 12, 0, 0, 0);
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);

    const row = {
      id: 'r2', type: 'todo', text: 'daily task', repeat: 'daily' as const,
      done: true, lastCompletedAt: dayStart.toISOString()
    };
    importJSON(makeStoreJSON(row));

    const changed = recomputeResets(now);
    const updated = getStore().rows[0];
    expect(changed).toBe(false);
    expect(updated.done).toBe(true);
  });

  it('does NOT reset when lastCompletedAt is after today midnight (00:01)', async () => {
    const {importJSON, recomputeResets, getStore} = await loadStoreModule();

    const now = new Date(2025, 0, 15, 12, 0, 0, 0);
    const dayStart = new Date(now); dayStart.setHours(0, 0, 0, 0);
    const afterMidnight = new Date(dayStart.getTime() + 60_000); // 00:01 today

    const row = {
      id: 'r3', type: 'todo', text: 'daily task', repeat: 'daily' as const,
      done: true, lastCompletedAt: afterMidnight.toISOString()
    };
    importJSON(makeStoreJSON(row));

    const changed = recomputeResets(now);
    const updated = getStore().rows[0];
    expect(changed).toBe(false);
    expect(updated.done).toBe(true);
  });
});

describe('Weekly reset at ISO week start (Monday 00:00 local)', () => {
  it('resets when lastCompletedAt is before ISO week start (Sun 23:59)', async () => {
    const {importJSON, recomputeResets, getStore} = await loadStoreModule();

    // Monday 6 Jan 2025 12:00 local (known Monday)
    const now = new Date(2025, 0, 6, 12, 0, 0, 0);
    const weekStart = new Date(2025, 0, 6, 0, 0, 0, 0); // Monday 00:00 local
    const beforeWeekStart = new Date(weekStart.getTime() - 60_000); // Sunday 23:59

    const row = {
      id: 'w1', type: 'todo', text: 'weekly task', repeat: 'weekly' as const,
      done: true, lastCompletedAt: beforeWeekStart.toISOString()
    };
    importJSON(makeStoreJSON(row));

    const changed = recomputeResets(now);
    const updated = getStore().rows[0];
    expect(changed).toBe(true);
    expect(updated.done).toBe(false);
  });

  it('does NOT reset when lastCompletedAt is exactly at ISO week start (Mon 00:00)', async () => {
    const {importJSON, recomputeResets, getStore} = await loadStoreModule();

    const now = new Date(2025, 0, 6, 12, 0, 0, 0);
    const weekStart = new Date(2025, 0, 6, 0, 0, 0, 0); // Monday 00:00 local

    const row = {
      id: 'w2', type: 'todo', text: 'weekly task', repeat: 'weekly' as const,
      done: true, lastCompletedAt: weekStart.toISOString()
    };
    importJSON(makeStoreJSON(row));

    const changed = recomputeResets(now);
    const updated = getStore().rows[0];
    expect(changed).toBe(false);
    expect(updated.done).toBe(true);
  });

  it('does NOT reset when lastCompletedAt is after ISO week start (Mon 00:01)', async () => {
    const {importJSON, recomputeResets, getStore} = await loadStoreModule();

    const now = new Date(2025, 0, 6, 12, 0, 0, 0);
    const weekStart = new Date(2025, 0, 6, 0, 0, 0, 0); // Monday 00:00 local
    const afterWeekStart = new Date(weekStart.getTime() + 60_000); // Monday 00:01

    const row = {
      id: 'w3', type: 'todo', text: 'weekly task', repeat: 'weekly' as const,
      done: true, lastCompletedAt: afterWeekStart.toISOString()
    };
    importJSON(makeStoreJSON(row));

    const changed = recomputeResets(now);
    const updated = getStore().rows[0];
    expect(changed).toBe(false);
    expect(updated.done).toBe(true);
  });
});
