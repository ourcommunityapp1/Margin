import { androidAssetLinks } from '@/heir/applinks';

export const dynamic = 'force-dynamic';

export function GET() {
  const body = androidAssetLinks(process.env.ANDROID_CERT_SHA256);
  if (!body) return new Response('Not found', { status: 404 });
  return Response.json(body, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
