import type { User } from '@supabase/supabase-js'

/** Human-readable sign-in method for settings UI. */
export function getAuthProviderLabel(user: User): string {
  const providers = user.identities?.map(i => i.provider) ?? []
  if (providers.includes('google')) return 'Google'
  if (providers.includes('azure')) return 'Microsoft'
  if (providers.includes('email')) return 'Email & password'
  if (providers.length > 0) return providers[0] ?? 'Unknown'
  return 'Email & password'
}
