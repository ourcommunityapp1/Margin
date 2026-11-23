// A short memory of people removed from this phone's family, so their saved progress can be offered back with the
// right name. Kept only on this phone.

import type { Member } from '@/heir/types';

const KEY = 'heir-removed-v1';
type Gone = { id: string; name: string; track: Member['track'] };

export function readRemoved(): Gone[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) ?? '[]'); return Array.isArray(v) ? v : []; } catch { return []; }
}

export function rememberRemoved(m: Member) {
  try { localStorage.setItem(KEY, JSON.stringify([{ id: m.id, name: m.name, track: m.track }, ...readRemoved().filter((g) => g.id !== m.id)].slice(0, 20))); } catch { /* private mode: nothing kept */ }
}
