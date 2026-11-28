import { guard, MAX_AUDIO_BYTES, unavailable } from '@/think/server';
import { unclearWords } from '@/think/stt';
import { elevenLabs, ElevenLabsError } from '@/voice/elevenlabs';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// The speech model, newest first. THINK_STT_MODEL overrides; if the account can't use the
// first, the next is tried.
const STT_MODELS = ['scribe_v2', 'scribe_v1'];

// POST /api/think/transcribe: one stretch of recorded speech (the request body, any audio type
// the recorder produced) to verbatim text, plus the words the model wasn't sure of.
export async function POST(request: Request) {
  const denied = await guard(request);
  if (denied) return denied;
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return unavailable('Speech to text needs ELEVENLABS_API_KEY.');
  const type = request.headers.get('content-type') ?? 'audio/webm';
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength) return Response.json({ text: '', unclear: [] });
  if (bytes.byteLength > MAX_AUDIO_BYTES) return Response.json({ error: 'That recording is too long for one piece.' }, { status: 413 });
  const audio = new Blob([bytes], { type });
  const filename = `speech.${/mp4|m4a|aac/.test(type) ? 'mp4' : /ogg/.test(type) ? 'ogg' : /wav/.test(type) ? 'wav' : 'webm'}`;
  const api = elevenLabs({ apiKey });
  const models = process.env.THINK_STT_MODEL ? [process.env.THINK_STT_MODEL, ...STT_MODELS] : STT_MODELS;
  let last: unknown;
  for (const modelId of models) {
    try {
      const t = await api.transcribe(audio, { modelId, filename, signal: request.signal });
      return Response.json({ text: t.text, unclear: unclearWords(t.words) });
    } catch (e) {
      last = e;
      if (!(e instanceof ElevenLabsError && e.modelProblem)) break;
    }
  }
  const e = last as ElevenLabsError | Error;
  console.error('[think/transcribe]', e.message);
  if (e instanceof ElevenLabsError && e.outOfCredits) return Response.json({ error: 'ElevenLabs is out of credit for this month.', unavailable: true }, { status: 503 });
  if (e instanceof ElevenLabsError && e.status === 401) return unavailable('The ElevenLabs key isn’t valid.');
  return Response.json({ error: 'Couldn’t transcribe that stretch.' }, { status: 502 });
}
