import { authorize, readJson, serverEngine } from '@/engine/server';
import { MAX_NOTE } from '@/engine/pipeline/plain';
import { OverBudget } from '@/engine/pipeline/spend';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Netlify cuts a request off at 30 seconds.
const DEADLINE_MS = 25_000;

// POST /api/plain — a commentary note in plain words. Body: { who: "henry" | "augustine" | …,
// text, ref? }. Each note is put into plain words once and kept; 429 once the day's spending
// limit for Claude is reached.
export async function POST(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  const body = await readJson<{ who?: string; text?: string; ref?: string }>(request);
  const who = body?.who ?? '';
  const text = body?.text?.trim() ?? '';
  if (!/^[a-z_]{2,40}$/.test(who) || who === 'bsb' || text.length < 20 || text.length > MAX_NOTE) {
    return Response.json({ error: `Send a writer and a note of 20 to ${MAX_NOTE} characters.` }, { status: 400 });
  }
  const ref = typeof body?.ref === 'string' ? body.ref.slice(0, 80) : undefined;
  const engine = await serverEngine();
  const timer = AbortSignal.timeout(DEADLINE_MS);
  try {
    const r = await engine.plain({ who, text, ref, signal: AbortSignal.any([request.signal, timer]) });
    return Response.json(r);
  } catch (e) {
    if (e instanceof OverBudget) return Response.json({ error: e.message }, { status: 429 });
    if (timer.aborted) return Response.json({ error: 'That took too long. Try again.' }, { status: 504 });
    console.warn(`[plain] ${e instanceof Error ? e.message : e}`);
    return Response.json({ error: 'Couldn’t put that into plain words just now.' }, { status: 502 });
  }
}
