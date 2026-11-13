// The AI calls behind Deep Think: the light punctuation pass, the title, the coach, the
// reformat versions, and reading links. Every result is checked in code before it is returned,
// so nothing reaches the page unless it is made of the user's own words.

import Anthropic from '@anthropic-ai/sdk';
import { modelsFrom } from '../engine/model/anthropic.ts';
import { COACH_TONE, groundedPrompts, looksDark, type Stuck } from './coach.ts';
import { LINKS_SYSTEM, FORMAT_SYSTEM, REFORMAT_SYSTEM, STUCK_POINT, STUCK_THOUGHT, TITLE_SYSTEM, coachSystem } from './prompts.ts';
import { faithfulVersions } from './reformat.ts';
import type { Layout, Link, Perspective, Prompt, Suggestions, Unclear } from './types.ts';
import { acceptFormatting, lightFormat } from './words.ts';

type Effort = 'low' | 'medium' | 'high';
type Schema = Record<string, unknown>;

const FALLBACK_BETA = 'server-side-fallback-2026-07-01';

export const aiAvailable = () => !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);

let shared: Anthropic | undefined;
const client = () => (shared ??= new Anthropic());

// The model declined. For a journal that means: step back quietly.
export class Declined extends Error {}

const object = (properties: Schema, required = Object.keys(properties)): Schema =>
  ({ type: 'object', properties, required, additionalProperties: false });
const str = { type: 'string' };
const quoted = object({ text: str, quote: str });

async function json<T>(o: { tier: 'fast' | 'strong'; effort: Effort; system: string; prompt: string; schema: Schema; maxTokens?: number; signal?: AbortSignal }): Promise<T> {
  const m = modelsFrom();
  const msg = await client().beta.messages.create({
    model: o.tier === 'strong' ? m.strong : m.fast,
    max_tokens: o.maxTokens ?? 8000,
    system: [{ type: 'text', text: o.system, cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: o.prompt }],
    output_config: { effort: o.effort, format: { type: 'json_schema', schema: o.schema } },
    betas: [FALLBACK_BETA],
    fallbacks: 'default',
  }, { signal: o.signal });
  if (msg.stop_reason === 'refusal') throw new Declined();
  const text = msg.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === 'text')?.text ?? '';
  return JSON.parse(text) as T;
}

const tag = (name: string, body: string) => `<${name}>\n${body}\n</${name}>`;

// ---- punctuation and paragraphs ----------------------------------------------------------------

export interface Formatted { paragraphs: string[]; continues: boolean; title: string; accepted: boolean; reason?: string }

export async function formatTranscript(o: { text: string; before?: string; noteSoFar?: string; wantTitle?: boolean; signal?: AbortSignal }): Promise<Formatted> {
  const out = await json<{ paragraphs: string[]; continues: boolean; title: string }>({
    tier: 'fast', effort: 'low', system: FORMAT_SYSTEM, signal: o.signal,
    schema: object({ paragraphs: { type: 'array', items: str }, continues: { type: 'boolean' }, title: str }),
    prompt: [
      o.wantTitle && o.noteSoFar ? tag('note_so_far', o.noteSoFar) : '',
      tag('paragraph_before', o.before ?? ''),
      tag('transcript', o.text),
      o.wantTitle ? 'A title is wanted.' : 'No title is wanted; return an empty string for it.',
    ].filter(Boolean).join('\n\n'),
  });
  const checked = acceptFormatting(o.text, out.paragraphs);
  return {
    ...checked,
    continues: checked.accepted && !!out.continues && !!o.before,
    title: o.wantTitle ? String(out.title ?? '') : '',
  };
}

export const localFormat = (text: string): Formatted => ({ paragraphs: lightFormat(text), continues: false, title: '', accepted: false, reason: 'no AI' });

export async function inferTitle(text: string, signal?: AbortSignal): Promise<string> {
  const out = await json<{ title: string }>({
    tier: 'fast', effort: 'low', system: TITLE_SYSTEM, signal, maxTokens: 2000,
    schema: object({ title: str }), prompt: tag('note', text),
  });
  return String(out.title ?? '');
}

// ---- the coach ---------------------------------------------------------------------------------

const PERSPECTIVES: Perspective[] = ['express', 'explore', 'explain', 'persuade', 'tell'];
export const QUIET: Suggestions = { quiet: true, perspective: null, prompts: [], fixes: [], tip: null };

interface CoachOut { pause: boolean; perspective: string; prompts: Prompt[]; fixes: Prompt[]; tip: Prompt | null }

export async function suggest(o: { text: string; title?: string; goals?: string[]; unclear?: Unclear[]; stuck?: Stuck; signal?: AbortSignal }): Promise<Suggestions> {
  // Dark content: no suggestions, and the model is never asked. See the TODO in coach.ts about
  // showing support resources instead of only going quiet.
  if (looksDark(o.text)) return QUIET;
  let out: CoachOut;
  try {
    out = await json<CoachOut>({
      tier: 'strong', effort: 'medium', system: coachSystem(COACH_TONE), signal: o.signal,
      schema: object({
        pause: { type: 'boolean' },
        perspective: { type: 'string', enum: PERSPECTIVES },
        prompts: { type: 'array', items: quoted },
        fixes: { type: 'array', items: quoted },
        tip: { anyOf: [quoted, { type: 'null' }] },
      }),
      prompt: [
        o.title ? tag('title', o.title) : '',
        tag('note', o.text),
        o.goals?.length ? tag('what_the_writer_wants_help_with', o.goals.join(', ')) : '',
        o.unclear?.length ? tag('words_the_transcription_was_unsure_of', o.unclear.map((u) => `"${u.word}" in "${u.context}"`).join('\n')) : '',
        o.stuck === 'point' ? STUCK_POINT : o.stuck === 'thought' ? STUCK_THOUGHT : '',
      ].filter(Boolean).join('\n\n'),
    });
  } catch (e) {
    if (e instanceof Declined) return QUIET;
    throw e;
  }
  if (out.pause) return QUIET;
  const tip = out.tip ? groundedPrompts([out.tip], o.text, 1)[0] ?? null : null;
  return {
    quiet: false,
    perspective: PERSPECTIVES.includes(out.perspective as Perspective) ? (out.perspective as Perspective) : null,
    prompts: groundedPrompts(out.prompts ?? [], o.text, o.stuck ? 2 : 3),
    fixes: o.stuck ? [] : groundedPrompts(out.fixes ?? [], o.text, 2),
    tip: o.stuck ? null : tip,
  };
}

// ---- reformat ----------------------------------------------------------------------------------

export async function reformat(o: { text: string; title?: string; signal?: AbortSignal }): Promise<Layout[]> {
  const block = object({ k: str, v: str });
  const out = await json<{ versions: Layout[] }>({
    tier: 'strong', effort: 'low', system: REFORMAT_SYSTEM, signal: o.signal, maxTokens: 16000,
    schema: object({ versions: { type: 'array', items: object({ label: str, blocks: { type: 'array', items: block } }) } }),
    prompt: [o.title ? tag('title', o.title) : '', tag('note', o.text)].filter(Boolean).join('\n\n'),
  });
  return faithfulVersions(out.versions ?? [], o.text);
}

// ---- go further --------------------------------------------------------------------------------

export const domainOf = (url: string) => {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
};

// Keep only links the search really returned. A URL the model wrote from memory is dropped.
export function realLinks(picked: { url: string; title: string }[], seen: Map<string, string>, max = 2): Link[] {
  const out: Link[] = [];
  for (const p of picked) {
    const url = p.url.trim();
    if (!seen.has(url) || !/^https:\/\//.test(url) || out.some((l) => l.url === url)) continue;
    out.push({ url, title: p.title.trim() || seen.get(url) || domainOf(url), domain: domainOf(url) });
    if (out.length >= max) break;
  }
  return out;
}

export async function furtherReading(o: { text: string; title?: string; signal?: AbortSignal }): Promise<Link[]> {
  if (looksDark(o.text)) return [];
  const m = modelsFrom();
  const msg = await client().beta.messages.create({
    model: m.fast,
    max_tokens: 4000,
    system: LINKS_SYSTEM,
    messages: [{ role: 'user', content: [o.title ? tag('title', o.title) : '', tag('note', o.text)].filter(Boolean).join('\n\n') }],
    tools: [{ type: 'web_search_20260209', name: 'web_search', max_uses: 2 }],
    output_config: { effort: 'low' },
    betas: [FALLBACK_BETA],
    fallbacks: 'default',
  }, { signal: o.signal });
  if (msg.stop_reason === 'refusal') return [];
  const seen = new Map<string, string>();
  let text = '';
  for (const b of msg.content) {
    if (b.type === 'web_search_tool_result' && Array.isArray(b.content)) {
      for (const r of b.content) if (r.type === 'web_search_result') seen.set(r.url, r.title);
    } else if (b.type === 'text') {
      text += b.text;
      for (const c of b.citations ?? []) if (c.type === 'web_search_result_location') seen.set(c.url, c.title ?? '');
    }
  }
  const picked = [...text.matchAll(/^LINK:\s*(\S+)\s*\|\s*(.+)$/gm)].map((x) => ({ url: x[1], title: x[2] }));
  return realLinks(picked, seen);
}
