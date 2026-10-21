import { authorize, readJson, serverEngine } from '@/engine/server';
import { isPersona, type Speaker } from '@/engine/corpus/sources';
import type { Turn } from '@/engine/model/types';

export const runtime = 'nodejs';
export const maxDuration = 60;

const DEADLINE_MS = 25_000;

interface Body {
  question?: string;
  speaker?: string;
  history?: Turn[];
  context?: { refs?: string[]; label?: string };
  voices?: string[];
  grade?: boolean;
}

// POST /api/ask — a grounded, checked answer with audio segments.
export async function POST(request: Request) {
  const started = Date.now();
  const denied = authorize(request);
  if (denied) return denied;
  const body = await readJson<Body>(request);
  const question = body?.question?.trim();
  if (!question || question.length > 1000) return Response.json({ error: 'Send a question of up to 1,000 characters.' }, { status: 400 });
  const speaker: Speaker = body?.speaker && (body.speaker === 'host' || isPersona(body.speaker)) ? body.speaker : 'host';
  const history: Turn[] = (body?.history ?? [])
    .filter((t) => (t.role === 'user' || t.role === 'assistant') && typeof t.text === 'string')
    .slice(-12)
    .map((t) => ({ role: t.role, text: t.text.slice(0, 4000), refs: Array.isArray(t.refs) ? t.refs.filter((r) => typeof r === 'string').slice(0, 6) : undefined }));
  const refs = (body?.context?.refs ?? []).filter((r) => typeof r === 'string').slice(0, 6);
  const engine = await serverEngine();
  const result = await engine.ask({
    question, speaker, history, voices: body?.voices?.slice(0, 6), grade: body?.grade, signal: request.signal,
    // Netlify cuts a request off at 30 seconds; past this the answer falls back to the passage.
    deadline: started + DEADLINE_MS,
    context: refs.length ? { refs, label: body?.context?.label } : undefined,
  });
  return Response.json(result, { status: result.status === 'error' ? 502 : 200 });
}
