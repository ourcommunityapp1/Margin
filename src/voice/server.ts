// Server wiring for the voice: the ElevenLabs key in ELEVENLABS_API_KEY, clips and the
// allowance tally in the same lasting store as the engine.

import { openStore } from '../server/store.ts';
import type { VoiceDeps } from './clips.ts';
import { elevenLabs } from './elevenlabs.ts';

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
