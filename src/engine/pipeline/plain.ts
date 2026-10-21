// Plain words: an old commentary note restated in everyday English, for a listener who finds
// Puritan, Victorian or ancient prose hard to follow. It says what the writer said and nothing
// more, and the app reads it as a summary, after the writer's words or instead of them. Each
// note is put into plain words once and kept.

import { authorOf } from '../corpus/sources.ts';
import type { ModelAdapter } from '../model/types.ts';
import { PLAIN_SCHEMA, PLAIN_SYSTEM, plainPrompt } from '../prompts.ts';
import { OverBudget } from './spend.ts';

export interface PlainInput {
  // The writer's key, such as "henry" or "augustine".
  who: string;
  text: string;
  ref?: string;
  signal?: AbortSignal;
}

export interface PlainResult {
  text: string;
  // Whether it came from storage rather than a model call.
  saved: boolean;
}

export interface PlainStore {
  get(key: string): Promise<string | undefined>;
  set(key: string, text: string): Promise<void>;
}

export function memoryPlain(): PlainStore {
  const m = new Map<string, string>();
  return { get: async (k) => m.get(k), set: async (k, t) => { m.set(k, t); } };
}

export const MAX_NOTE = 12_000;

// Part of every key, so a change to the prompt puts notes into plain words afresh.
const VERSION = 'p1';

export async function plainKey(who: string, note: string): Promise<string> {
  const hash = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${VERSION}|${who}|${note}`)));
  return Array.from(hash.slice(0, 20), (b) => b.toString(16).padStart(2, '0')).join('');
}

// A note already in plain words is served even past the day's spending limit; a new one waits.
export async function plainWords(deps: { model: ModelAdapter; store: PlainStore; overBudget?: () => Promise<boolean> }, input: PlainInput): Promise<PlainResult> {
  // A note shortened for listening ends in "[…]"; what was cut isn't summarized.
  const note = input.text.replace(/\s*\[…\]\s*$/, '').replace(/\s+/g, ' ').trim();
  const key = await plainKey(input.who, note);
  const kept = await deps.store.get(key);
  if (kept) return { text: kept, saved: true };
  if (deps.overBudget && await deps.overBudget()) throw new OverBudget();
  const author = authorOf(input.who);
  const res = await deps.model.json<{ plain?: string }>({
    route: 'plain',
    system: PLAIN_SYSTEM,
    prompt: plainPrompt({ writer: author.name, about: [author.label, author.years].filter(Boolean).join(', '), ref: input.ref, note }),
    schema: PLAIN_SCHEMA,
    signal: input.signal,
  });
  const text = (res.plain ?? '').replace(/\s+/g, ' ').trim();
  if (!text) throw new Error('Claude gave no plain words for this note.');
  await deps.store.set(key, text);
  return { text, saved: false };
}
