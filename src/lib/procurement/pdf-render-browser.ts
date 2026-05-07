import fs from 'node:fs'

import type { Browser } from 'puppeteer-core'
import puppeteerCore from 'puppeteer-core'

/**
 * Netlify / AWS Lambda / Vercel serverless: no system Chrome — use bundled Chromium.
 * Local dev: system Chrome/Chromium or Puppeteer's downloaded binary (optional devDependency).
 */
export function isServerlessPdfEnvironment(): boolean {
  if (process.env.PROCUREMENT_PDF_USE_LOCAL_CHROME === 'true') {
    return false
  }
  if (process.env.PROCUREMENT_PDF_FORCE_SERVERLESS_CHROMIUM === 'true') {
    return true
  }
  return (
    process.env.NETLIFY === 'true' ||
    process.env.AWS_LAMBDA_FUNCTION_NAME !== undefined ||
    process.env.VERCEL === '1'
  )
}

async function resolveLocalChromeExecutable(): Promise<string> {
  const fromEnv = process.env.PUPPETEER_EXECUTABLE_PATH
  if (fromEnv && fs.existsSync(fromEnv)) {
    return fromEnv
  }

  try {
    const { default: puppeteer } = await import('puppeteer')
    const bundled = puppeteer.executablePath()
    if (bundled && fs.existsSync(bundled)) {
      return bundled
    }
  } catch {
    /* optional devDependency */
  }

  const candidates = [
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ]
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      return c
    }
  }

  throw new Error(
    'No Chrome/Chromium found for local PDF generation. Install Google Chrome, set PUPPETEER_EXECUTABLE_PATH, install optional devDependency puppeteer and run `npx puppeteer browsers install chrome`, or on Netlify/Vercel use the default serverless Chromium.',
  )
}

export async function launchProcurementPdfBrowser(): Promise<Browser> {
  if (isServerlessPdfEnvironment()) {
    const chromium = (await import('@sparticuz/chromium')).default
    return puppeteerCore.launch({
      args: chromium.args,
      executablePath: await chromium.executablePath(),
      headless: true,
    })
  }

  const executablePath = await resolveLocalChromeExecutable()
  return puppeteerCore.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
    ],
  })
}
