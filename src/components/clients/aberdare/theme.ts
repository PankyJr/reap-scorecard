/**
 * The Aberdare workspace's colours, now REAP's own tokens (src/app/tokens.css).
 * Aberdare keeps its logo and nothing else of its own: no blue. The names are
 * kept so the components did not have to change; each points at a token.
 */
export const ABERDARE_THEME = {
  cyan: 'var(--reap-brand)',
  cyanDark: 'var(--reap-brand)',
  cyanSoft: 'var(--reap-brand-soft)',
  charcoal: 'var(--reap-ink)',
  text: 'var(--reap-ink)',
  muted: 'var(--reap-muted)',
  border: 'var(--reap-line)',
  surface: 'var(--reap-surface)',
  canvas: 'var(--reap-canvas)',
  success: 'var(--reap-ok)',
  warning: 'var(--reap-warn)',
  danger: 'var(--reap-bad)',
} as const
