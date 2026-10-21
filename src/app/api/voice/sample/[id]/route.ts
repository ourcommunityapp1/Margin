import { authorize } from '@/engine/server';
import { mp3Response, voiceDeps, voiceSample } from '@/voice/server';
import { CHOICES } from '@/voice/voices';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/voice/sample/<voice id> — a short sample of a voice the listener can choose. Samples
// come from ElevenLabs for free; hearing one uses no credits.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = authorize(request);
  if (denied) return denied;
  const { id } = await params;
  const choice = CHOICES.find((c) => c.id === id);
  if (!choice) return new Response('Not found', { status: 404 });
  const audio = await voiceSample((await voiceDeps()).store, choice);
  if (!audio) return new Response('The sample isn’t available right now.', { status: 502 });
  return mp3Response(request, audio, 'private, max-age=86400');
}
