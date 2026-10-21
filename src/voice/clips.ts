// Spoken clips: each piece of text is voiced once, kept, and replayed from storage after that,
// so hearing Romans 8 a second time costs nothing.
//
// New clips draw on Margin's voice allowance: a share of the ElevenLabs plan's credits for the
// billing period (MARGIN_TTS_SHARE, 5% by default). Margin keeps its own tally of what it has
// spent, one entry per clip, and stops making new clips once the next would pass the allowance;
// the app then reads with the phone's own voice. Clips already made still play.

import { createHash } from 'node:crypto';
import { addCharge, sumCharges, type Store } from '../server/store.ts';
import { ElevenLabsError, type ElevenLabs, type ModelInfo, type Plan } from './elevenlabs.ts';
import { MODELS, speedFor, voiceFor, type Kind, type When } from './voices.ts';

export const MAX_CHARS = 2000;

// Credits held back from the allowance, so two clips made at once on different servers
// can't carry Margin past it.
const MARGIN = 300;

export interface VoiceDeps {
  store: Store;
  api: ElevenLabs | null;
  // Share of the plan's credits Margin may use each billing period.
  share: number;
  // The allowance when the plan can't be read (the API key lacks permission to see it).
  fallbackCredits: number;
  // Whether the tally outlives this process. Without that, a restarted server would forget
  // what Margin had spent, so no new clips are made.
  durable: boolean;
}

export interface Allowance {
  share: number;
  credits: number;
  spent: number;
  period: string;
  plan?: Plan;
}

export type ClipResult =
  | { ok: true; id: string; cached: boolean; model?: string; credits?: number }
  | { ok: false; status: 400 | 402 | 503; error: string };

export const normalize = (text: string) => text.replace(/\s+/g, ' ').trim();

// The same text in the same voice from the same kind of model is the same clip. (The labels in
// the hash are the ones the first clips were made under, so those stay found.)
export const clipId = (text: string, speaker: string, speed: 'quick' | 'ahead') =>
  createHash('sha256').update(`v1|${speed === 'quick' ? 'live' : 'narration'}|${voiceFor(speaker).id}|${normalize(text)}`).digest('hex').slice(0, 40);

export const clipKey = (id: string) => `clips/${id}.mp3`;

// The plan and the model list change rarely; each process asks again after a while.
const cache = new Map<string, { at: number; value: unknown }>();
async function remember<T>(key: string, ms: number, get: () => Promise<T>): Promise<T> {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ms) return hit.value as T;
  const value = await get();
  cache.set(key, { at: Date.now(), value });
  return value;
}
export const forgetCached = () => cache.clear();

const plan = (api: ElevenLabs) => remember('plan', 60_000, () => api.plan().catch((e) => {
  console.warn(`[voice] couldn't read the ElevenLabs plan: ${e instanceof Error ? e.message : e}`);
  return null;
}));

const models = (api: ElevenLabs) => remember('models', 3_600_000, () => api.models().then(
  (list) => new Map(list.filter((m) => m.tts).map((m) => [m.id, m] as const)),
  (e) => {
    console.warn(`[voice] couldn't list ElevenLabs models: ${e instanceof Error ? e.message : e}`);
    return null as Map<string, ModelInfo> | null;
  },
));

// Credits being spent right now in this process, not yet in the tally.
let inFlight = 0;

export async function allowance(deps: VoiceDeps): Promise<Allowance> {
  const p = deps.api ? await plan(deps.api) : null;
  const period = p?.resetsAt ? `p${p.resetsAt}` : `m${new Date().toISOString().slice(0, 7)}`;
  const credits = p ? Math.max(0, Math.floor(p.limit * deps.share) - MARGIN) : deps.fallbackCredits;
  return { share: deps.share, credits, spent: await sumCharges(deps.store, `ledger/${period}`), period, plan: p ?? undefined };
}

// The models to try, in order of preference: those the account lists, each with its credits
// per character.
async function candidates(deps: VoiceDeps, speed: 'quick' | 'ahead'): Promise<{ id: string; rate: number }[]> {
  const known = deps.api ? await models(deps.api) : null;
  const wanted = MODELS[speed];
  const usable = known ? wanted.filter((m) => known.has(m)) : wanted;
  // An unknown model's rate is taken as a full credit per character, the most any costs.
  return (usable.length ? usable : wanted).map((id) => ({ id, rate: known?.get(id)?.rate ?? 1 }));
}

export async function makeClip(deps: VoiceDeps, req: { text: string; speaker: string; kind: Kind; when?: When }, signal?: AbortSignal): Promise<ClipResult> {
  const text = normalize(req.text);
  if (!text || text.length > MAX_CHARS) return { ok: false, status: 400, error: `Send between 1 and ${MAX_CHARS} characters.` };
  // A clip already made by either model is used rather than paid for again; the fuller reading
  // is preferred when there are both.
  for (const made of ['ahead', 'quick'] as const) {
    const found = clipId(text, req.speaker, made);
    if (await deps.store.has(clipKey(found))) return { ok: true, id: found, cached: true };
  }
  const speed = speedFor(req.kind, req.when);
  const id = clipId(text, req.speaker, speed);
  if (!deps.api) return { ok: false, status: 503, error: 'ElevenLabs isn’t set up.' };
  if (!deps.durable) {
    console.error('[voice] no lasting storage for the allowance tally, so no new clips are made');
    return { ok: false, status: 503, error: 'The voice allowance can’t be tracked here.' };
  }

  const voice = voiceFor(req.speaker);
  for (const model of await candidates(deps, speed)) {
    const cost = Math.ceil(text.length * model.rate);
    const a = await allowance(deps);
    const left = a.credits - a.spent - inFlight;
    const planLeft = a.plan ? a.plan.limit - a.plan.used : Infinity;
    if (cost > left || cost > planLeft) return { ok: false, status: 402, error: 'Margin has used its share of this month’s ElevenLabs credits.' };
    inFlight += cost;
    try {
      const audio = await deps.api.speak(text, voice.id, model.id, signal);
      await deps.store.set(clipKey(id), audio);
      await addCharge(deps.store, `ledger/${a.period}`, cost);
      return { ok: true, id, cached: false, model: model.id, credits: cost };
    } catch (e) {
      if (e instanceof ElevenLabsError) {
        if (e.outOfCredits) return { ok: false, status: 402, error: 'The ElevenLabs account is out of credits.' };
        if (e.modelProblem) {
          console.warn(`[voice] ${model.id} failed (${e.status} ${e.code ?? ''}: ${e.message}); trying the next model`);
          continue;
        }
        console.warn(`[voice] ElevenLabs error ${e.status} ${e.code ?? ''}: ${e.message}`);
      } else if (!signal?.aborted) {
        console.warn(`[voice] ${e instanceof Error ? e.message : e}`);
      }
      return { ok: false, status: 503, error: 'The voice service didn’t answer.' };
    } finally {
      inFlight -= cost;
    }
  }
  return { ok: false, status: 503, error: 'No ElevenLabs voice model is available.' };
}
