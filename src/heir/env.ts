// Heir's own database settings. When they are unset, the household stays on the device and no sign-in is asked for.
// Written out in full so Next.js can put them in the browser bundle.
export const HEIR_SUPABASE_URL = process.env.NEXT_PUBLIC_HEIR_SUPABASE_URL ?? '';
export const HEIR_SUPABASE_KEY = process.env.NEXT_PUBLIC_HEIR_SUPABASE_PUBLISHABLE_KEY ?? '';
export const heirCloudConfigured = () => !!(HEIR_SUPABASE_URL && HEIR_SUPABASE_KEY);
