// Deep Think's own database settings. They are separate from the listening app's
// NEXT_PUBLIC_SUPABASE_* settings, because the two apps may use different Supabase projects.
// When these are unset, notes stay on the device and the API is guarded by the listening app's
// access code instead of a sign-in.
//
// They are written out in full so Next.js can inline them into the browser bundle.
export const THINK_SUPABASE_URL = process.env.NEXT_PUBLIC_THINK_SUPABASE_URL ?? '';
export const THINK_SUPABASE_KEY = process.env.NEXT_PUBLIC_THINK_SUPABASE_PUBLISHABLE_KEY ?? '';
export const thinkAccountsConfigured = () => !!(THINK_SUPABASE_URL && THINK_SUPABASE_KEY);
