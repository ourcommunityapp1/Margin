import { aiAvailable } from '@/think/ai';
import { supabaseConfigured } from '@/think/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/think/status: which parts of Deep Think this deployment can run. Holds no secrets;
// the app uses it to fall back clearly (browser speech recognition, local formatting, notes
// kept on this device) instead of failing.
export function GET() {
  return Response.json({
    ai: aiAvailable(),
    speech: !!process.env.ELEVENLABS_API_KEY,
    accounts: supabaseConfigured(),
  });
}
