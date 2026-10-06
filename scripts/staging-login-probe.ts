import fs from 'fs'
import { createClient } from '@supabase/supabase-js'
import { chromium } from 'playwright'

async function main() {
  const creds = JSON.parse(fs.readFileSync('tmp/staging-secrets/bongani-reviewer.json', 'utf8')) as {
    email: string
    password: string
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  if (!url.includes('jzvqyryblsfxlinvoiuf')) throw new Error('staging only')

  const client = createClient(url, anon, { auth: { persistSession: false } })
  const { data, error } = await client.auth.signInWithPassword({
    email: creds.email,
    password: creds.password,
  })
  console.log(
    JSON.stringify({
      apiOk: !error && Boolean(data.session),
      err: error?.message || null,
      user: data.user?.email || null,
    }),
  )

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage()
  await page.goto('https://reap-scorecard-staging.netlify.app/login', {
    waitUntil: 'domcontentloaded',
    timeout: 60_000,
  })
  await page.locator('#email').fill(creds.email)
  await page.locator('#password').fill(creds.password)
  await page.locator('form').filter({ has: page.locator('#password') }).evaluate((form) => {
    ;(form as HTMLFormElement).requestSubmit()
  })
  await page.waitForTimeout(8000)
  const text = await page.locator('body').innerText()
  console.log(
    JSON.stringify({
      url: page.url(),
      hasError: /invalid|incorrect|error/i.test(text),
      snippet: text.slice(0, 280).replace(/\s+/g, ' '),
    }),
  )
  await browser.close()
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
