/**
 * Dashboard workspace selector visibility.
 *
 * - Local development (NODE_ENV !== 'production'): visible by default
 * - Production: hidden unless NEXT_PUBLIC_ABERDARE_DEMO=true is set explicitly
 *
 * Independent of onboarding, company records, tour state, or user role.
 */
export function isAberdareDemoEnabled(): boolean {
  if (process.env.NODE_ENV !== 'production') {
    return true
  }
  return process.env.NEXT_PUBLIC_ABERDARE_DEMO === 'true'
}

export const ABERDARE_DEMO_FLAG_ENV = 'NEXT_PUBLIC_ABERDARE_DEMO' as const
