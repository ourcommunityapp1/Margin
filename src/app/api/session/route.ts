import { authorize, readJson, serverEngine } from '@/engine/server';

export const runtime = 'nodejs';

// POST /api/session — a listening session (Scripture and commentary as timed spoken units).
export async function POST(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  const body = await readJson<{ title?: string; refs?: string[]; format?: string; voices?: string[] }>(request);
  const refs = (body?.refs ?? []).filter((r) => typeof r === 'string').slice(0, 6);
  if (!refs.length) return Response.json({ error: 'Send at least one reference, like "Romans 8".' }, { status: 400 });
  const engine = await serverEngine();
  const session = await engine.session({
    title: body?.title?.slice(0, 80), refs, voices: body?.voices?.slice(0, 6),
    format: body?.format === 'verse' ? 'verse' : 'read',
  });
  if (!session.chapters.length) return Response.json({ error: 'None of those references exist.' }, { status: 400 });
  return Response.json(session);
}
