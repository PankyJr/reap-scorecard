import type { EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@/utils/supabase/server'
import { getRequestOriginForRedirect } from '@/lib/auth/redirect-origin'
import { logAuthError } from '@/lib/auth/auth-errors'
import { emailLinkErrorMessage, parseEmailConfirmParams } from '@/lib/auth/email-confirm'
import { isSupabasePublicConfigComplete } from '@/lib/supabase/public-env'

/**
 * Where the confirmation and password-reset e-mails send people. Works in any
 * browser: see src/lib/auth/email-confirm.ts for why this replaced the code
 * exchange in /auth/callback for e-mail links.
 */
export async function GET(request: NextRequest) {
  // The host the person actually opened, so the session cookie lands on it.
  const base = getRequestOriginForRedirect(request)
  if (!isSupabasePublicConfigComplete()) {
    return NextResponse.redirect(`${base}/login`)
  }

  const params = parseEmailConfirmParams(request.nextUrl.searchParams)
  if (!params) {
    const type = request.nextUrl.searchParams.get('type') as EmailOtpType | null
    return NextResponse.redirect(`${base}/login?error=${encodeURIComponent(emailLinkErrorMessage(type))}`)
  }

  const success = NextResponse.redirect(`${base}${params.next}`)
  const supabase = createRouteHandlerClient(request, success)
  const { error } = await supabase.auth.verifyOtp({ type: params.type, token_hash: params.tokenHash })
  if (!error) return success

  logAuthError('verifyOtp (e-mail link)', error)
  const mode = params.type === 'recovery' ? 'mode=forgot&' : ''
  return NextResponse.redirect(
    `${base}/login?${mode}error=${encodeURIComponent(emailLinkErrorMessage(params.type, error.message))}`,
  )
}
