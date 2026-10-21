// Browser entry: the engine reading the library over HTTP and asking Claude through a
// published artifact's `sample` capability. Bundled by scripts/build-browser.mjs.

import { createEngine, type Engine } from './index.ts';
import { fetchLoader } from './corpus/loaders.ts';
import { sampleAdapter, type SampleFn } from './model/sample.ts';
import { mockAdapter } from './model/mock.ts';
import { memoryGuides, type GuideStore } from './pipeline/guides.ts';

// Study guides kept in the browser's own storage, so a passage explained once stays explained
// on this device. Storage can be blocked or full; then they last for the visit.
function browserGuides(): GuideStore {
  const mem = memoryGuides();
  const store = (() => { try { return globalThis.localStorage; } catch { return undefined; } })();
  const name = (k: string) => `margin.guide.${k}`;
  return {
    async get(k) {
      try { const v = store?.getItem(name(k)); if (v) return JSON.parse(v); } catch { /* unreadable: use memory */ }
      return mem.get(k);
    },
    async set(k, g) {
      await mem.set(k, g);
      try { store?.setItem(name(k), JSON.stringify(g)); } catch { /* blocked or full */ }
    },
  };
}

export function createBrowserEngine(opts: { base?: string; sample?: SampleFn | null }): Promise<Engine> {
  return createEngine({
    loader: fetchLoader(opts.base ?? 'data/'),
    // Without Claude the engine still builds sessions and outlines; answers fall back to the mock.
    model: opts.sample ? sampleAdapter(opts.sample) : mockAdapter(),
    // The keyword index reads the whole library, too much to download in a browser.
    search: false,
    guides: browserGuides(),
  });
}
