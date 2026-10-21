// Server wiring: one engine per process, reading the gzipped corpus from data/corpus and
// calling Claude with the API key in ANTHROPIC_API_KEY.

import { createHash, timingSafeEqual } from 'node:crypto';
import path from 'node:path';
import { createEngine, type Engine } from './index.ts';
import { fileLoader } from './corpus/loaders.ts';
import { anthropicAdapter } from './model/anthropic.ts';
import { storedGuides, storedPlain, storedSpend } from '../server/engine-stores.ts';
import { openStore } from '../server/store.ts';

let engine: Promise<Engine> | undefined;

// Study guides, notes in plain words and the day's spending are kept in Netlify Blobs on Netlify, and elsewhere under
// MARGIN_DATA_DIR (default: the system's temporary folder, which a host may clear).
// MARGIN_DAILY_BUDGET_USD caps what questions and playlists can spend in a day (default $2).
export function serverEngine(): Promise<Engine> {
  const limit = Number(process.env.MARGIN_DAILY_BUDGET_USD ?? 2);
  engine ??= openStore('margin').then((store) => createEngine({
    loader: fileLoader(path.join(process.cwd(), 'data/corpus')),
    model: anthropicAdapter(),
    search: true,
    guides: storedGuides(store),
    dailyBudgetUsd: Number.isFinite(limit) && limit > 0 ? limit : undefined,
    spend: storedSpend(store),
    plain: storedPlain(store),
  }));
  engine.catch(() => { engine = undefined; });
  return engine;
}

// The routes spend API credit, so a deployed copy must be locked with MARGIN_API_TOKEN, the
// access code. A request carries it as a bearer token, or as the cookie the app's sign-in sets.
// Locally (next dev) the routes stay open for convenience.
export const ACCESS_COOKIE = 'margin_access';

export function authorize(request: Request): Response | null {
  const token = process.env.MARGIN_API_TOKEN;
  if (!token) {
    return process.env.NODE_ENV === 'production'
      ? Response.json({ error: 'Set MARGIN_API_TOKEN to enable the study API.' }, { status: 503 })
      : null;
  }
  return hasAccess(request, token) ? null : Response.json({ error: 'Unauthorized' }, { status: 401 });
}

export function hasAccess(request: Request, token = process.env.MARGIN_API_TOKEN): boolean {
  if (!token) return process.env.NODE_ENV !== 'production';
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  return [bearer, readCookie(request, ACCESS_COOKIE)].some((v) => !!v && sameSecret(v, token));
}

export function readCookie(request: Request, name: string): string | undefined {
  for (const part of (request.headers.get('cookie') ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) {
      try { return decodeURIComponent(v.join('=')); } catch { return undefined; }
    }
  }
  return undefined;
}

// Compares digests, so the time taken says nothing about how much of the code was right.
export const sameSecret = (a: string, b: string) =>
  timingSafeEqual(createHash('sha256').update(a).digest(), createHash('sha256').update(b).digest());

export async function readJson<T>(request: Request): Promise<T | null> {
  try {
    return (await request.json()) as T;
  } catch {
    return null;
  }
}
