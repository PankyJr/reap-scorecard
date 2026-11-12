import fs from 'node:fs'
import path from 'node:path'

/** Where the tests run, and refusing anything that is not local or the staging preview. */
export function baseUrl() {
  const url = process.env.E2E_BASE_URL ?? 'http://localhost:3001'
  const host = new URL(url).hostname
  const allowed = host === 'localhost' || host === '127.0.0.1' || host === 'reap-scorecard-preview.netlify.app' || host.endsWith('--reap-scorecard-preview.netlify.app')
  if (!allowed && process.env.E2E_ALLOW_HOST !== host) {
    throw new Error(`Refusing to run the tour tests against ${host}: only localhost or the staging preview.`)
  }
  return url
}

/** The review login: from the environment, or the git-ignored staging secrets file. Never printed. */
export function credentials(): { email: string; password: string } {
  if (process.env.E2E_EMAIL && process.env.E2E_PASSWORD) return { email: process.env.E2E_EMAIL, password: process.env.E2E_PASSWORD }
  const file = path.join(process.cwd(), 'tmp/staging-secrets/review-shared.json')
  if (!fs.existsSync(file)) throw new Error('Set E2E_EMAIL and E2E_PASSWORD (a staging login with seeded data).')
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as { email: string; password: string }
  return { email: parsed.email, password: parsed.password }
}
