// Who may call Deep Think's API routes. They spend API credit and handle a private journal, so:
// with Supabase configured, a request must carry the signed-in user's access token; without it,
// the routes accept Deep Think's own access code (THINK_ACCESS_CODE) or the listening app's
// (MARGIN_API_TOKEN), and are open in local development when neither is set.

import { createClient } from '@supabase/supabase-js';
import { THINK_SUPABASE_KEY, THINK_SUPABASE_URL, thinkAccountsConfigured } from './env.ts';
import Anthropic from '@anthropic-ai/sdk';
import { hasAccess, readCookie, sameSecret } from '../engine/server.ts';

export const supabaseConfigured = thinkAccountsConfigured;

export const THINK_ACCESS_COOKIE = 'think_access';

// Phones capitalize and autocorrect, so "Quiet river 42" counts as "quiet-river-42".
export const typedCode = (s: string) => s.trim().toLowerCase().replace(/[\s_\u2013\u2014-]+/g, '-');

export function hasThinkAccess(request: Request): boolean {
  const think = process.env.THINK_ACCESS_CODE;
  const margin = process.env.MARGIN_API_TOKEN;
  if (!think && !margin) return process.env.NODE_ENV !== 'production';
  if (margin && hasAccess(request, margin)) return true;
  const saved = readCookie(request, THINK_ACCESS_COOKIE);
  return !!saved && [think, margin].some((c) => !!c && sameSecret(typedCode(saved), typedCode(c)));
}

export async function guard(request: Request): Promise<Response | null> {
  if (!supabaseConfigured()) {
    return hasThinkAccess(request) ? null : Response.json({ error: 'Enter your access code to use Deep Think.' }, { status: 401 });
  }
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return Response.json({ error: 'Sign in to use Deep Think.' }, { status: 401 });
  const supabase = createClient(THINK_SUPABASE_URL, THINK_SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  return error || !data.user ? Response.json({ error: 'Sign in again to use Deep Think.' }, { status: 401 }) : null;
}

// Longest note or recording the routes accept, so one request can't run up a large bill.
export const MAX_NOTE_CHARS = 60_000;
export const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

export async function body<T>(request: Request): Promise<T | null> {
  try { return (await request.json()) as T; } catch { return null; }
}

export const unavailable = (what: string) => Response.json({ error: what, unavailable: true }, { status: 503 });

// Turns a failed model call into a calm response. Nothing here is the user's fault.
export function failed(e: unknown): Response {
  if (e instanceof Anthropic.RateLimitError) return Response.json({ error: 'The AI is busy. Try again in a moment.' }, { status: 429 });
  if (e instanceof Anthropic.AuthenticationError) return unavailable('The AI key isn’t valid.');
  if (e instanceof Anthropic.APIConnectionError) return Response.json({ error: 'Couldn’t reach the AI. Check your connection.' }, { status: 502 });
  if (e instanceof Anthropic.APIError) return Response.json({ error: 'The AI couldn’t answer just now.' }, { status: 502 });
  console.error('[think]', e);
  return Response.json({ error: 'Something went wrong.' }, { status: 500 });
}
