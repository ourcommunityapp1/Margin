// Study guides: the explanation of a passage, made once with the strongest model, checked like
// any answer, and stored, so asking "what does this passage mean?" again costs nothing.

import { spanKey, type Span } from '../bible/refs.ts';
import type { Speaker } from '../corpus/sources.ts';
import type { AskResult } from './ask.ts';

export type StoredGuide = Pick<AskResult, 'speaker' | 'text' | 'segments' | 'quotes' | 'passages' | 'sources' | 'notes'> & { made: string };

export interface GuideStore {
  get(key: string): Promise<StoredGuide | undefined>;
  set(key: string, guide: StoredGuide): Promise<void>;
}

export const guideKey = (speaker: Speaker, passage: Span): string => `${speaker}:${spanKey(passage)}`;

export function memoryGuides(): GuideStore {
  const m = new Map<string, StoredGuide>();
  return { get: async (k) => m.get(k), set: async (k, g) => { m.set(k, g); } };
}

// One JSON file per guide. Node's modules load only when used, so the browser bundle never
// needs them.
export function fileGuides(dir: string): GuideStore {
  const file = async (k: string) => (await import('node:path')).join(dir, `${k.replace(/[^A-Za-z0-9.-]+/g, '_')}.json`);
  return {
    async get(k) {
      try {
        const { readFile } = await import('node:fs/promises');
        return JSON.parse(await readFile(await file(k), 'utf8')) as StoredGuide;
      } catch {
        return undefined;
      }
    },
    async set(k, g) {
      const { mkdir, writeFile } = await import('node:fs/promises');
      await mkdir(dir, { recursive: true });
      await writeFile(await file(k), JSON.stringify(g));
    },
  };
}
