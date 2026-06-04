import { createBrowserClient } from '@supabase/ssr'

export type Note = {
  id: string
  session_id: string
  device_id: string
  content: string
  created_at: string
  updated_at: string
}

export function getSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
