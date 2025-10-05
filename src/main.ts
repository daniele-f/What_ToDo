import {initUI} from './ui/index';
import {recomputeResets, reloadFromLocalStorage, STORAGE_KEY, subscribe} from './store';

// Entry point
window.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('app');
    if (!root) return;

    let clockJumpDetected = false;

    const ui = initUI(root, {
        onBeforeMutate: () => {
            if (clockJumpDetected) {
                recomputeResets(new Date());
                clockJumpDetected = false;
            }
        }
    });

    // Recompute resets on load
    recomputeResets(new Date());

    // Initial render
    ui.render();

    // Re-render on store changes
    subscribe(() => ui.render());

    // Multi-tab: when localStorage is changed in another tab, reload and render
    window.addEventListener('storage', (e: StorageEvent) => {
        if (e.key === STORAGE_KEY) {
            reloadFromLocalStorage();
        }
    });

    // Relative last-edited timer (every 60s); detect >6h clock jumps
    let lastTick = Date.now();
    setInterval(() => {
        const now = Date.now();
        if (now - lastTick > 6 * 60 * 60 * 1000) {
            clockJumpDetected = true;
        }
        lastTick = now;
        ui.updateRelativeTimer();
    }, 60_000);
});
