// Every collection Heir ships, and lookups across them.

import type { Collection, Item } from '../types.ts';
import { westminsterShorter } from './westminster-shorter.ts';
import { apostlesCreed } from './apostles-creed.ts';

export const collections: Collection[] = [westminsterShorter, apostlesCreed];

const byId = new Map<string, Item>(collections.flatMap((c) => c.items.map((i) => [i.id, i] as const)));

export function getCollection(id: string): Collection | undefined {
  return collections.find((c) => c.id === id);
}

export function getItem(id: string): Item | undefined {
  return byId.get(id);
}

export function allItems(): Item[] {
  return [...byId.values()];
}
