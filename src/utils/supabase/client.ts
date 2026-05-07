import { createBrowserClient } from '@supabase/ssr'
import { getSupabaseAnonKey, getSupabaseProjectUrl } from '@/lib/supabase/public-env'

export function createClient() {
  return createBrowserClient(getSupabaseProjectUrl(), getSupabaseAnonKey())
}
