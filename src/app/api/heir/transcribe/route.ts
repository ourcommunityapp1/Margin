import { adminClient } from '../stats/store';
import { elevenLabs, ElevenLabsError } from '@/voice/elevenlabs';
import { cleanTerms } from '@/heir/speech';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 25;

// POST /api/heir/transcribe?k=Melchizedek&k=hath  (body: the recording, any audio type the phone made)
// Turns a spoken answer into words with ElevenLabs Scribe, for "Say it from memory". The caller proves they are signed in
// with their Katekize sign-in token; the ElevenLabs key never leaves the server. `k` are words to listen out for (rare names
// and old words in the answer, chosen by the app; never the whole answer). Nothing is kept: the recording is passed on and
// dropped. 401 signed out, 413 too long, 503 when speech to text is off or out of credit (the app then uses the phone's own).

const MODELS = ['scribe_v2', 'scribe_v1'];
const MAX_BYTES = 4 * 1024 * 1024; // about four minutes of speech: far more than any answer

const off = (error: string) => Response.json({ error, unavailable: true }, { status: 503 });

export async function POST(request: Request) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return off('Speech to text isn’t switched on.');
  const db = adminClient();
  if (!db) return off('Not set up yet.');
  const token = /^Bearer (.+)$/.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token) return Response.json({ error: 'Sign in first.' }, { status: 401 });
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return Response.json({ error: 'Sign in first.' }, { status: 401 });

  const type = request.headers.get('content-type') ?? 'audio/mp4';
  const bytes = await request.arrayBuffer();
  if (!bytes.byteLength) return Response.json({ text: '', words: [] });
  if (bytes.byteLength > MAX_BYTES) return Response.json({ error: 'That recording is too long.' }, { status: 413 });
  const audio = new Blob([bytes], { type });
  const filename = `answer.${/mp4|m4a|aac/.test(type) ? 'm4a' : /ogg/.test(type) ? 'ogg' : /wav/.test(type) ? 'wav' : 'webm'}`;
  const terms = cleanTerms(new URL(request.url).searchParams.getAll('k'));

  const api = elevenLabs({ apiKey });
  // Scribe v2 with the hints; v2 without them if they are refused; v1 (which takes no hints) if v2 isn't on this plan.
  const tries: { modelId: string; keyterms?: string[] }[] = [
    ...(terms.length ? [{ modelId: MODELS[0], keyterms: terms }] : []),
    { modelId: MODELS[0] },
    { modelId: MODELS[1] },
  ];
  let last: unknown;
  for (const t of tries) {
    try {
      const r = await api.transcribe(audio, { ...t, filename, language: 'en', signal: request.signal });
      return Response.json({ text: r.text, words: r.words.map((w) => ({ text: w.text, logprob: w.logprob })) });
    } catch (e) {
      last = e;
      const retry = e instanceof ElevenLabsError && (e.modelProblem || ((e.status === 400 || e.status === 422) && !!t.keyterms));
      if (!retry) break;
    }
  }
  const e = last as ElevenLabsError | Error;
  console.error('[heir/transcribe]', e.message);
  if (e instanceof ElevenLabsError && (e.outOfCredits || e.status === 401)) return off('Speech to text is unavailable right now.');
  return Response.json({ error: 'Couldn’t hear that. Try again.' }, { status: 502 });
}
