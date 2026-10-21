// Lasting storage for the server: Netlify Blobs when Margin runs on Netlify, files under
// MARGIN_DATA_DIR anywhere else (next dev, a single server, tests). Keys use "/" as folders.
//
// Blobs has no transactions, so running totals (the day's spending, the voice allowance) are
// kept as one small entry per charge and summed by listing a folder, never as a counter that
// two requests could both read and overwrite.

import path from 'node:path';

export interface Store {
  get(key: string): Promise<Uint8Array<ArrayBuffer> | null>;
  has(key: string): Promise<boolean>;
  getJSON<T>(key: string): Promise<T | null>;
  set(key: string, value: Uint8Array | string): Promise<void>;
  // Keys under a folder, e.g. list("ledger/2026-10/").
  list(prefix: string): Promise<string[]>;
}

const stores = new Map<string, Promise<Store>>();

export function openStore(name: string): Promise<Store> {
  let s = stores.get(name);
  if (!s) {
    s = netlifyStore(name).then((n) => n ?? fileStore(path.join(dataDir(), name)));
    stores.set(name, s);
  }
  return s;
}

export const dataDir = () => process.env.MARGIN_DATA_DIR ?? path.join(process.env.TMPDIR ?? '/tmp', 'margin');

// Netlify injects the Blobs credentials into its functions; anywhere else getStore throws.
async function netlifyStore(name: string): Promise<Store | null> {
  try {
    const { getStore } = await import('@netlify/blobs');
    const blobs = getStore({ name, consistency: 'strong' });
    return {
      async get(key) {
        const v = await blobs.get(key, { type: 'arrayBuffer' });
        return v ? new Uint8Array(v) : null;
      },
      async has(key) {
        return (await blobs.getMetadata(key)) !== null;
      },
      async getJSON<T>(key: string) {
        return ((await blobs.get(key, { type: 'json' })) as T | null) ?? null;
      },
      async set(key, value) {
        await blobs.set(key, typeof value === 'string' ? value : new Blob([value as BlobPart]));
      },
      async list(prefix) {
        return (await blobs.list({ prefix })).blobs.map((b) => b.key);
      },
    };
  } catch {
    return null;
  }
}

export function fileStore(dir: string): Store {
  const file = (key: string) => {
    const p = path.join(dir, ...key.split('/').map((part) => part.replace(/[^A-Za-z0-9._-]+/g, '_')));
    if (!p.startsWith(dir)) throw new Error(`Bad key: ${key}`);
    return p;
  };
  return {
    async get(key) {
      try {
        const { readFile } = await import('node:fs/promises');
        return new Uint8Array(await readFile(file(key)));
      } catch {
        return null;
      }
    },
    async has(key) {
      try {
        const { stat } = await import('node:fs/promises');
        return (await stat(file(key))).isFile();
      } catch {
        return false;
      }
    },
    async getJSON<T>(key: string) {
      const v = await this.get(key);
      return v ? (JSON.parse(new TextDecoder().decode(v)) as T) : null;
    },
    async set(key, value) {
      const { mkdir, writeFile } = await import('node:fs/promises');
      await mkdir(path.dirname(file(key)), { recursive: true });
      await writeFile(file(key), value);
    },
    async list(prefix) {
      const { readdir } = await import('node:fs/promises');
      const folder = prefix.endsWith('/') ? prefix.slice(0, -1) : path.posix.dirname(prefix);
      try {
        const names = await readdir(path.join(dir, ...folder.split('/').filter(Boolean)));
        return names.map((n) => `${folder}/${n}`).filter((k) => k.startsWith(prefix));
      } catch {
        return [];
      }
    },
  };
}

// One entry per charge: "<folder>/<time>-<amount>-<random>". The amount is a whole number
// (credits, or millionths of a dollar) so it survives as part of a key.
export async function addCharge(store: Store, folder: string, amount: number): Promise<void> {
  const n = Math.max(0, Math.ceil(amount));
  if (!n) return;
  await store.set(`${folder}/${Date.now()}-${n}-${Math.random().toString(36).slice(2, 8)}`, '1');
}

export async function sumCharges(store: Store, folder: string): Promise<number> {
  let total = 0;
  for (const key of await store.list(`${folder}/`)) {
    const n = Number(key.slice(folder.length + 1).split('-')[1]);
    if (Number.isFinite(n)) total += n;
  }
  return total;
}
