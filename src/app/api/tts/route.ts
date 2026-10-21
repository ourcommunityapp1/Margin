import { authorize, readJson } from '@/engine/server';
import { makeClip } from '@/voice/clips';
import { voiceDeps } from '@/voice/server';
import { isKind } from '@/voice/voices';

export const runtime = 'nodejs';
export const maxDuration = 60;

// POST /api/tts — make sure a spoken clip exists and say where to fetch it.
// Body: { text, voice: "bsb" | "host" | "henry" | …, kind: "scripture" | "comment" | "intro" | "answer",
// when?: "now" | "ahead", voiceId? }. Clips wanted now get the fast model; clips made ahead, the
// fuller one. voiceId is the ElevenLabs voice the listener chose for that speaker, from the list
// GET /api/voice gives.
// 402 means Margin's ElevenLabs allowance is used up for this billing period: read the text
// with the device's voice instead.
export async function POST(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  const body = await readJson<{ text?: string; voice?: string; kind?: string; when?: string; voiceId?: string }>(request);
  if (typeof body?.text !== 'string' || !isKind(body.kind)) return Response.json({ error: 'Send text, a voice and a kind.' }, { status: 400 });
  const when = body.when === 'ahead' ? 'ahead' : 'now';
  const voiceId = typeof body.voiceId === 'string' ? body.voiceId : undefined;
  const result = await makeClip(await voiceDeps(), { text: body.text, speaker: String(body.voice ?? 'host'), kind: body.kind, when, voiceId }, request.signal);
  if (!result.ok) return Response.json({ error: result.error }, { status: result.status });
  return Response.json({ ...result, url: `/api/tts/${result.id}` });
}
