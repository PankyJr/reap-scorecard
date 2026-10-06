import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

// A server action, as Next.js hands it to the page: React asks it how to post
// itself ($$FORM_ACTION) so the server-rendered form works with no JavaScript.
function serverAction(id: string) {
  const fn = vi.fn() as unknown as ((fd: FormData) => Promise<void>) & {
    $$FORM_ACTION: () => { name: string; method: string; encType: string; data: null; action: null }
  }
  fn.$$FORM_ACTION = () => ({ name: `$ACTION_ID_${id}`, method: 'POST', encType: 'multipart/form-data', data: null, action: null })
  return fn
}

let search = ''
vi.mock('server-only', () => ({}))
vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(search),
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  redirect: vi.fn(),
}))
vi.mock('../actions', () => ({
  login: serverAction('login'),
  forgotPassword: serverAction('forgot'),
  signInWithGoogle: vi.fn(),
  signInWithMicrosoft: vi.fn(),
  resendSignupConfirmation: serverAction('resend'),
}))
vi.mock('../SignupAdvancedForm', () => ({ SignupAdvancedForm: () => null }))

import { AuthForm } from '../AuthForm'

function signInForm(query = '') {
  search = query
  const html = renderToStaticMarkup(createElement(AuthForm, {}))
  const form = html.match(/<form[^>]*>[\s\S]*?<\/form>/g)?.find((f) => f.includes('id="email"'))
  return form ?? ''
}

describe('sign-in works when submitted before the page has loaded', () => {
  // The defect this guards: the form only worked through an onSubmit handler.
  // On a phone, a tap that lands before the JavaScript loads submitted the
  // bare form: on main a GET that put the password in the address bar, on
  // this branch a POST to /login that did nothing. Either way, no sign-in.
  it('posts the sign-in form straight to the server action', () => {
    const form = signInForm()
    expect(form).toMatch(/<form[^>]*method="POST"/i)
    expect(form).toContain('name="$ACTION_ID_login"')
    expect(form).not.toContain('javascript:')
  })

  it('carries where to go after signing in, without JavaScript', () => {
    expect(signInForm('next=%2Fcompanies')).toMatch(/<input[^>]*name="next"[^>]*value="\/companies"/)
    expect(signInForm()).toMatch(/<input[^>]*name="next"[^>]*value="\/dashboard"/)
  })

  it('posts the reset form straight to its own server action', () => {
    const form = signInForm('mode=forgot')
    expect(form).toContain('name="$ACTION_ID_forgot"')
    expect(form).not.toContain('id="password"')
  })
})
