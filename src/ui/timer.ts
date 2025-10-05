import {getStore} from '../store';
import {formatLocalDDMMYYYYHHmm, relativeHM} from '../time';

export function updateRelativeTimer() {
  const store = getStore();
  const el = document.getElementById('last-edited');
  if (!el) return;
  const abs = store.lastEditedAt ? formatLocalDDMMYYYYHHmm(new Date(store.lastEditedAt)) : 'Never';
  const rel = store.lastEditedAt ? ` (${relativeHM(new Date(store.lastEditedAt), new Date())})` : '';
  el.textContent = `Last edited at: ${abs}${rel}`;
}
