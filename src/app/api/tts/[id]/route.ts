import { authorize } from '@/engine/server';
import { clipKey } from '@/voice/clips';
import { voiceDeps } from '@/voice/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/tts/<id> — a clip's MP3. A clip never changes, so the phone may keep it. Byte
// ranges are answered too: Safari's audio player asks for them and won't play without.
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const denied = authorize(request);
  if (denied) return denied;
  const { id } = await params;
  if (!/^[0-9a-f]{40}$/.test(id)) return new Response('Not found', { status: 404 });
  const audio = await (await voiceDeps()).store.get(clipKey(id));
  if (!audio) return new Response('Not found', { status: 404 });
  const headers: Record<string, string> = {
    'content-type': 'audio/mpeg',
    'accept-ranges': 'bytes',
    'cache-control': 'private, max-age=31536000, immutable',
  };
  const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.get('range') ?? '');
  if (range && (range[1] || range[2])) {
    const size = audio.length;
    let start = range[1] ? Number(range[1]) : size - Number(range[2]);
    let end = range[1] && range[2] ? Number(range[2]) : size - 1;
    start = Math.max(0, start);
    end = Math.min(end, size - 1);
    if (start > end) return new Response(null, { status: 416, headers: { 'content-range': `bytes */${size}` } });
    return new Response(audio.slice(start, end + 1), {
      status: 206,
      headers: { ...headers, 'content-range': `bytes ${start}-${end}/${size}`, 'content-length': String(end - start + 1) },
    });
  }
  return new Response(audio, { headers: { ...headers, 'content-length': String(audio.length) } });
}
