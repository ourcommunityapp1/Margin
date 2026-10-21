import { authorize, readJson, serverEngine } from '@/engine/server';
import type { Voices } from '@/engine/pipeline/playlist';

export const runtime = 'nodejs';
export const maxDuration = 60;

const VOICES: Voices[] = ['all', 'henry', 'spurgeon', 'fathers'];

// POST /api/playlist — a drafted study playlist with every passage checked.
export async function POST(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  const body = await readJson<{ topic?: string; from?: string; sessions?: number }>(request);
  const topic = body?.topic?.trim();
  if (!topic || topic.length > 500) return Response.json({ error: 'Send a topic of up to 500 characters.' }, { status: 400 });
  const from = VOICES.includes(body?.from as Voices) ? (body!.from as Voices) : 'all';
  const engine = await serverEngine();
  try {
    return Response.json(await engine.playlist({ topic, from, sessions: body?.sessions, signal: request.signal }));
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : 'Drafting failed' }, { status: 502 });
  }
}
