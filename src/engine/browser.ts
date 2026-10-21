// Browser entry: the engine reading the library over HTTP and asking Claude through a
// published artifact's `sample` capability. Bundled by scripts/build-browser.mjs.

import { createEngine, type Engine } from './index.ts';
import { fetchLoader } from './corpus/loaders.ts';
import { sampleAdapter, type SampleFn } from './model/sample.ts';
import { mockAdapter } from './model/mock.ts';

export function createBrowserEngine(opts: { base?: string; sample?: SampleFn | null }): Promise<Engine> {
  return createEngine({
    loader: fetchLoader(opts.base ?? 'data/'),
    // Without Claude the engine still builds sessions and outlines; answers fall back to the mock.
    model: opts.sample ? sampleAdapter(opts.sample) : mockAdapter(),
    // The keyword index reads the whole library, too much to download in a browser.
    search: false,
  });
}
