import { authorize } from '@/engine/server';
import { clipKey } from '@/voice/clips';
import { mp3Response, voiceDeps } from '@/voice/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/tts/<id> — a clip's MP3. A clip never changes, so the phone may keep it.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = authorize(request);
  if (denied) return denied;
  const { id } = await params;
  if (!/^[0-9a-f]{40}$/.test(id)) return new Response('Not found', { status: 404 });
  const audio = await (await voiceDeps()).store.get(clipKey(id));
  if (!audio) return new Response('Not found', { status: 404 });
  return mp3Response(request, audio, 'private, max-age=31536000, immutable');
}
