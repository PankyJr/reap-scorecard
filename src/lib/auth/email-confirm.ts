import type { EmailOtpType } from '@supabase/supabase-js'

/**
 * Links in the confirmation and password-reset e-mails point at
 * `/auth/confirm?token_hash=…&type=…&next=…`. The token is checked with
 * `verifyOtp`, which needs nothing stored in the browser, so the link works in
 * whichever browser opens it: the mail app's built-in browser on a phone, or a
 * different device from the one that asked for the e-mail.
 *
 * The older `{{ .ConfirmationURL }}` links go through `/auth/callback`, whose
 * code exchange needs a cookie that only exists in the browser that asked for
 * the e-mail. That is why a reset requested on a laptop, or opened from Gmail
 * or WhatsApp on a phone, failed with "This sign-in link is no longer valid".
 */

const EMAIL_LINK_TYPES: ReadonlySet<EmailOtpType> = new Set<EmailOtpType>([
  'signup',
  'email',
  'recovery',
  'invite',
  'magiclink',
  'email_change',
])

/** A path on this site, never another site: `/x` yes; `//x`, `x`, `https://…` no. */
export function safeNextPath(raw: string | null | undefined, fallback = '/dashboard'): string {
  if (!raw) return fallback
  const trimmed = raw.trim()
  if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('://') || trimmed.includes('\\')) {
    return fallback
  }
  return trimmed
}

export type EmailConfirmParams = { tokenHash: string; type: EmailOtpType; next: string }

/** Read an e-mail link's query. `null` when the token or the link type is missing or unknown. */
export function parseEmailConfirmParams(searchParams: URLSearchParams): EmailConfirmParams | null {
  const tokenHash = searchParams.get('token_hash')?.trim()
  const type = searchParams.get('type')?.trim() as EmailOtpType | undefined
  if (!tokenHash || !type || !EMAIL_LINK_TYPES.has(type)) return null
  // A reset link always ends on the page where the new password is chosen.
  const next = type === 'recovery' ? '/reset-password' : safeNextPath(searchParams.get('next'))
  return { tokenHash, type, next }
}

/** Plain words for a link that could not be used. */
export function emailLinkErrorMessage(type: EmailOtpType | null, raw?: string): string {
  const expired = /expired|otp_expired|invalid|not found/i.test(raw ?? '')
  if (type === 'recovery') {
    return expired
      ? 'This reset link has expired or has already been used. Use Forgot password to get a new one.'
      : 'This reset link could not be used. Use Forgot password to get a new one.'
  }
  return expired
    ? 'This link has expired or has already been used. Sign in, or ask for a new link.'
    : 'This link could not be used. Sign in, or ask for a new link.'
}
