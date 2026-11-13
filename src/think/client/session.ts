// The browser's connection to Supabase (sign-in) and to Deep Think's own API routes.

import type { SupabaseClient } from '@supabase/supabase-js';
import { getSupabase } from '@/lib/supabase';

export const accountsConfigured = () =>
  !!(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

// Null when Supabase isn't set up; the app then keeps notes on this device.
export function supabase(): SupabaseClient | null {
  return accountsConfigured() ? getSupabase() : null;
}

export class ApiError extends Error {
  readonly status: number;
  readonly unavailable: boolean;
  constructor(status: number, message: string, unavailable = false) {
    super(message);
    this.status = status;
    this.unavailable = unavailable;
  }
}

async function authHeader(): Promise<Record<string, string>> {
  const s = supabase();
  if (!s) return {};
  const { data } = await s.auth.getSession();
  return data.session ? { authorization: `Bearer ${data.session.access_token}` } : {};
}

async function read<T>(r: Response): Promise<T> {
  const data = await r.json().catch(() => ({}));
  if (!r.ok) throw new ApiError(r.status, data?.error ?? 'Something went wrong.', !!data?.unavailable);
  return data as T;
}

export async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
  const r = await fetch(`/api/think/${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(await authHeader()) },
    body: JSON.stringify(body),
    signal,
  });
  return read<T>(r);
}

export async function postAudio<T>(path: string, audio: Blob, signal?: AbortSignal): Promise<T> {
  const r = await fetch(`/api/think/${path}`, {
    method: 'POST',
    headers: { 'content-type': audio.type || 'audio/webm', ...(await authHeader()) },
    body: audio,
    signal,
  });
  return read<T>(r);
}

export interface Status { ai: boolean; speech: boolean; accounts: boolean }

export async function getStatus(): Promise<Status> {
  try {
    return await read<Status>(await fetch('/api/think/status'));
  } catch {
    return { ai: false, speech: false, accounts: accountsConfigured() };
  }
}

export const newId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : '10000000-1000-4000-8000-100000000000'.replace(/[018]/g, (c) => (Number(c) ^ (Math.random() * 16) >> (Number(c) / 4)).toString(16));
