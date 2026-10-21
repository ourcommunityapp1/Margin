// Server wiring for the voice: the ElevenLabs key in ELEVENLABS_API_KEY, clips and the
// allowance tally in the same lasting store as the engine.

import { openStore, type Store } from '../server/store.ts';
import type { VoiceDeps } from './clips.ts';
import { elevenLabs } from './elevenlabs.ts';
import type { Choice } from './voices.ts';

// MARGIN_TTS_SHARE: the share of the ElevenLabs plan's credits Margin may use in a billing
// period (default 0.05, 5%). MARGIN_TTS_CREDITS: the allowance in credits when the API key
// can't read the plan (default 1,500, 5% of the smallest paid plan).
export async function voiceDeps(): Promise<VoiceDeps> {
  const key = process.env.ELEVENLABS_API_KEY;
  const share = Number(process.env.MARGIN_TTS_SHARE ?? 0.05);
  const fallback = Number(process.env.MARGIN_TTS_CREDITS ?? 1500);
  const store = await openStore('margin');
  return {
    store,
    // Files count as lasting only off a serverless host, or when MARGIN_DATA_DIR names a folder.
    durable: store.kind === 'blobs' || !!process.env.MARGIN_DATA_DIR || process.env.NODE_ENV !== 'production',
    api: key ? elevenLabs({ apiKey: key }) : null,
    share: Number.isFinite(share) && share >= 0 && share <= 1 ? share : 0.05,
    fallbackCredits: Number.isFinite(fallback) && fallback >= 0 ? fallback : 1500,
  };
}

// ElevenLabs' sample of a voice the listener can choose, fetched once and kept. It's served from
// Margin rather than its own host, which labels it as plain text and doesn't let the phone sign
// in for it.
export async function voiceSample(store: Store, choice: Choice, get: typeof fetch = fetch): Promise<Uint8Array<ArrayBuffer> | null> {
  const key = `samples/${choice.id}.mp3`;
  const kept = await store.get(key);
  if (kept) return kept;
  const r = await get(choice.sample, { signal: AbortSignal.timeout(10_000) }).catch(() => null);
  if (!r?.ok) return null;
  const audio = new Uint8Array(await r.arrayBuffer());
  await store.set(key, audio);
  return audio;
}

// An MP3 for the phone's audio player. Byte ranges are answered too: Safari's player asks for
// them and won't play without.
export function mp3Response(request: Request, audio: Uint8Array<ArrayBuffer>, cache: string): Response {
  const headers: Record<string, string> = { 'content-type': 'audio/mpeg', 'accept-ranges': 'bytes', 'cache-control': cache };
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '');
  if (range && (range[1] || range[2])) {
    const size = audio.length;
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(end, size - 1);
    if (start > end) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}` } });
    return new Response(audio.slice(start, end + 1), {
      status: 206,
      headers: { ...headers, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': String(end - start + 1) },
    });
  }
  return new Response(audio, { headers: { ...headers, 'content-length': String(audio.length) } });
}
