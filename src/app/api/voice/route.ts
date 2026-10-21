import { authorize } from '@/engine/server';
import { allowance } from '@/voice/clips';
import { voiceDeps } from '@/voice/server';
import { MODELS, VOICES } from '@/voice/voices';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/voice — whether ElevenLabs is on, and how much of Margin's allowance is left.
export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;
  const deps = await voiceDeps();
  if (!deps.api) return Response.json({ on: false });
  const a = await allowance(deps);
  return Response.json({
    on: true,
    share: a.share,
    credits: a.credits,
    spent: a.spent,
    left: Math.max(0, a.credits - a.spent),
    planKnown: !!a.plan,
    tier: a.plan?.tier,
    resetsAt: a.plan?.resetsAt,
    models: MODELS,
    voices: Object.fromEntries(Object.entries(VOICES).map(([k, v]) => [k, v.name])),
  });
}
