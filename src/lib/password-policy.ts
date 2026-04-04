/**
 * Shared password policy for REAP Scorecard (reset password, signup, etc.).
 * Keep client and server validation in sync — server must re-validate.
 */

export const PASSWORD_MIN_LENGTH = 12

/** Characters considered “special” for policy checks */
const SPECIAL_RE = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?`~]/

const COMMON_PASSWORDS = new Set([
  'password',
  'password123',
  'password12!',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty',
  'qwerty123',
  'letmein',
  'welcome',
  'welcome123',
  'admin',
  'admin123',
  'monkey',
  'dragon',
  'master',
  'login',
  'princess',
  'passw0rd',
  'starwars',
  'football',
  'baseball',
  'iloveyou',
  'trustno1',
  'sunshine',
  'reap',
  'reapsolutions',
  'changeme',
  'mustchange',
])

export interface PasswordRuleCheck {
  id: 'length' | 'upper' | 'lower' | 'number' | 'special'
  label: string
  met: boolean
}

export function isCommonPassword(password: string): boolean {
  const normalized = password.toLowerCase().trim()
  if (normalized.length === 0) return false
  if (COMMON_PASSWORDS.has(normalized)) return true
  if (/^password[!@#\d]*$/i.test(normalized)) return true
  if (/^(qwerty|letmein|welcome|admin|login)\d*!*$/i.test(normalized)) return true
  return false
}

export function getPasswordRuleChecks(password: string): PasswordRuleCheck[] {
  return [
    {
      id: 'length',
      label: `At least ${PASSWORD_MIN_LENGTH} characters`,
      met: password.length >= PASSWORD_MIN_LENGTH,
    },
    { id: 'upper', label: 'One uppercase letter', met: /[A-Z]/.test(password) },
    { id: 'lower', label: 'One lowercase letter', met: /[a-z]/.test(password) },
    { id: 'number', label: 'One number', met: /\d/.test(password) },
    { id: 'special', label: 'One special character', met: SPECIAL_RE.test(password) },
  ]
}

export function allPolicyRulesMet(password: string): boolean {
  return getPasswordRuleChecks(password).every(r => r.met) && !isCommonPassword(password)
}

/** 0–4 segments for strength meter */
export function getPasswordStrengthSegments(password: string): 0 | 1 | 2 | 3 | 4 {
  if (!password) return 0
  if (isCommonPassword(password)) return 1
  const met = getPasswordRuleChecks(password).filter(r => r.met).length
  if (met <= 1) return 1
  if (met === 2) return 2
  if (met <= 4) return 3
  return 4
}

export function validatePasswordForReset(password: string): { ok: true } | { ok: false; message: string } {
  if (!password.trim()) return { ok: false, message: 'Enter a password.' }
  const checks = getPasswordRuleChecks(password)
  const failed = checks.find(c => !c.met)
  if (failed) {
    return { ok: false, message: `Password must meet all requirements (${failed.label.toLowerCase()}).` }
  }
  if (isCommonPassword(password)) {
    return { ok: false, message: 'This password is too common. Choose a stronger, unique password.' }
  }
  return { ok: true }
}

/** Map Supabase Auth errors to safe user-facing copy */
export function mapPasswordUpdateError(raw: string): string {
  const lower = raw.toLowerCase()
  if (
    lower.includes('jwt') ||
    lower.includes('expired') ||
    lower.includes('session') ||
    lower.includes('not authenticated') ||
    lower.includes('auth session missing')
  ) {
    return 'Your reset session has expired. Open the link from your email again, or request a new reset from sign in.'
  }
  if (lower.includes('invalid') && (lower.includes('token') || lower.includes('grant'))) {
    return 'This reset link is invalid or has already been used. Request a new password reset.'
  }
  if (lower.includes('same') && lower.includes('password')) {
    return 'Choose a new password that is different from your current one.'
  }
  if (lower.includes('weak') || lower.includes('strength') || lower.includes('too short')) {
    return 'That password does not meet our strength requirements. Use a longer, more complex password.'
  }
  if (lower.includes('rate') || lower.includes('too many')) {
    return 'Too many attempts. Please wait a moment and try again.'
  }
  return 'Could not update your password. Please try again or request a new reset link.'
}
