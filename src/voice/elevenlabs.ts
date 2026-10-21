// A small ElevenLabs client: the models the account can use and what each costs, the plan's
// credits for this billing period, and speech as MP3.

export interface ModelInfo { id: string; tts: boolean; rate: number }
export interface Plan { tier?: string; limit: number; used: number; resetsAt?: number }

export class ElevenLabsError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  constructor(status: number, code: string | undefined, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
  // A problem with the model itself (unknown, not on this plan), so another model may work.
  get modelProblem(): boolean {
    return [400, 404, 422].includes(this.status) && !/voice/i.test(`${this.code} ${this.message}`);
  }
  get outOfCredits(): boolean {
    return /quota|credit|character_limit/i.test(`${this.code ?? ''}`);
  }
}

export interface ElevenLabs {
  models(): Promise<ModelInfo[]>;
  plan(): Promise<Plan>;
  speak(text: string, voiceId: string, modelId: string, signal?: AbortSignal): Promise<Uint8Array>;
}

// 64 kbps keeps a clip small for a phone on cellular; speech loses nothing audible.
const FORMAT = 'mp3_44100_64';

export function elevenLabs(opts: { apiKey: string; base?: string; fetch?: typeof fetch }): ElevenLabs {
  const base = (opts.base ?? process.env.ELEVENLABS_BASE_URL ?? 'https://api.elevenlabs.io').replace(/\/$/, '');
  const f = opts.fetch ?? fetch;
  const call = async (path: string, init: RequestInit = {}) => {
    const r = await f(base + path, { ...init, headers: { 'xi-api-key': opts.apiKey, ...(init.headers ?? {}) } });
    if (r.ok) return r;
    let code: string | undefined;
    let message = `ElevenLabs answered ${r.status}`;
    try {
      const body = await r.json();
      const d = body?.detail;
      if (d && typeof d === 'object' && !Array.isArray(d)) {
        code = d.status ?? d.code;
        message = d.message ?? message;
      } else if (Array.isArray(d)) {
        message = d.map((x: { msg?: string }) => x.msg).filter(Boolean).join('; ') || message;
      }
    } catch { /* not JSON */ }
    throw new ElevenLabsError(r.status, code, message);
  };
  return {
    async models() {
      const list = (await (await call('/v1/models')).json()) as {
        model_id: string; can_do_text_to_speech?: boolean; model_rates?: { character_cost_multiplier?: number };
      }[];
      return list.map((m) => ({ id: m.model_id, tts: m.can_do_text_to_speech !== false, rate: m.model_rates?.character_cost_multiplier ?? 1 }));
    },
    async plan() {
      const s = (await (await call('/v1/user/subscription')).json()) as {
        tier?: string; character_limit: number; character_count: number; next_character_count_reset_unix?: number;
      };
      return { tier: s.tier, limit: s.character_limit, used: s.character_count, resetsAt: s.next_character_count_reset_unix };
    },
    async speak(text, voiceId, modelId, signal) {
      const r = await call(`/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=${FORMAT}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', accept: 'audio/mpeg' },
        body: JSON.stringify({ text, model_id: modelId }),
        signal,
      });
      return new Uint8Array(await r.arrayBuffer());
    },
  };
}
