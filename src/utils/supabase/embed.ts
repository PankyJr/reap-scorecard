/**
 * PostgREST foreign-table embeds are typed as arrays in some generated clients.
 * At runtime they are usually a single object for many-to-one relations.
 */
export function firstEmbeddedRow<T extends Record<string, unknown>>(
  embed: T | T[] | null | undefined,
): T | null {
  if (embed == null) return null
  return Array.isArray(embed) ? (embed[0] ?? null) : embed
}
