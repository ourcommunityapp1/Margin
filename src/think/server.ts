// Who may call Deep Think's API routes. They spend API credit and handle a private journal, so:
// with Supabase configured, a request must carry the signed-in user's access token; without it,
// the routes fall back to the repo's existing access code (open in local dev only).

import { createClient } from '@supabase/supabase-js';
import Anthropic from '@anthropic-ai/sdk';
import { authorize } from '../engine/server.ts';

export const supabaseConfigured = () => !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

export async function guard(request: Request): Promise<Response | null> {
  if (!supabaseConfigured()) return authorize(request);
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!token) return Response.json({ error: 'Sign in to use Deep Think.' }, { status: 401 });
  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!, {
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
