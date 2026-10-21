// The engine's study guides and daily spending, kept in lasting storage, so a serverless host
// that starts fresh processes still remembers both.

import type { GuideStore, StoredGuide } from '../engine/pipeline/guides.ts';
import type { SpendStore } from '../engine/pipeline/spend.ts';
import { addCharge, sumCharges, type Store } from './store.ts';

export function storedGuides(store: Store): GuideStore {
  const key = (k: string) => `guides/${k.replace(/[^A-Za-z0-9.:-]+/g, '_')}.json`;
  return {
    get: async (k) => (await store.getJSON<StoredGuide>(key(k))) ?? undefined,
    set: (k, g) => store.set(key(k), JSON.stringify(g)),
  };
}

// Charges are kept in millionths of a dollar, one entry each, under the day's folder.
export function storedSpend(store: Store): SpendStore {
  const folder = () => `spend/${new Date().toISOString().slice(0, 10)}`;
  return {
    today: async () => (await sumCharges(store, folder())) / 1e6,
    add: (usd) => addCharge(store, folder(), usd * 1e6),
  };
}
