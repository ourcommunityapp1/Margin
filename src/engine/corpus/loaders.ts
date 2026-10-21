// Corpus loaders: gzipped files on disk for the server, plain JSON over HTTP for the browser.

import type { Loader } from './store.ts';

// Reads data/corpus/<file>.gz relative to `dir` (Node only; imported lazily so browser builds skip it).
export function fileLoader(dir: string): Loader {
  return async (file) => {
    const [{ readFile }, { gunzipSync }, path] = await Promise.all([
      import('node:fs/promises'), import('node:zlib'), import('node:path'),
    ]);
    const buf = await readFile(path.join(dir, file + '.gz'));
    return JSON.parse(gunzipSync(buf).toString('utf8'));
  };
}

// Fetches <base><file> as JSON, e.g. base "data/" inside the published prototype.
export function fetchLoader(base: string): Loader {
  return async (file) => {
    const r = await fetch(base + file);
    if (!r.ok) throw new Error(`Couldn't load ${file} (HTTP ${r.status})`);
    return r.json();
  };
}
