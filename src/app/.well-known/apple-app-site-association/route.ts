import { appleAssociation } from '@/heir/applinks';

export const dynamic = 'force-dynamic';

export function GET() {
  const body = appleAssociation(process.env.APPLE_TEAM_ID);
  if (!body) return new Response('Not found', { status: 404 });
  return Response.json(body, { headers: { 'Cache-Control': 'public, max-age=3600' } });
}
