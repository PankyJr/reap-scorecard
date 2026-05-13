/** Narrow Postgrest-style error fields for server logs without `any`. */
export function postgrestLogExtras(err: unknown): { details?: string; hint?: string } {
  if (!err || typeof err !== 'object') return {}
  const o = err as Record<string, unknown>
  return {
    details: typeof o.details === 'string' ? o.details : undefined,
    hint: typeof o.hint === 'string' ? o.hint : undefined,
  }
}
