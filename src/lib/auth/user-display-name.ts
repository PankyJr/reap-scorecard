/**
 * Derive a safe string display name from Supabase user_metadata + email.
 * Metadata values are untyped; OAuth can supply non-strings — callers must not
 * assume .charAt / string methods work without coercion.
 */
export function userDisplayNameFromMetadata(
  meta: Record<string, unknown> | null | undefined,
  email: string | null | undefined,
): string {
  const pick = (value: unknown): string | null => {
    if (value == null) return null
    const s = typeof value === 'string' ? value.trim() : String(value).trim()
    return s.length > 0 ? s : null
  }
  const localPart = email?.includes('@') ? email.split('@')[0] : undefined
  return pick(meta?.full_name) ?? pick(meta?.name) ?? pick(localPart) ?? 'User'
}
