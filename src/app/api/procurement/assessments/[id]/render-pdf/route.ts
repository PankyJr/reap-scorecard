import { NextRequest } from 'next/server'
import puppeteer, { type Browser, type CookieData } from 'puppeteer'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  context: { params: { id?: string } | Promise<{ id?: string }> },
) {
  const resolved = await Promise.resolve(context.params)
  const id = resolved?.id

  const incomingCookieHeader = req.headers.get('cookie') ?? ''

  if (!id) {
    return new Response('Missing procurement assessment id', { status: 400 })
  }

  const url = new URL(req.url)
  const baseUrl = `${url.protocol}//${url.host}`
  const reportUrl = `${baseUrl}/procurement/assessments/${encodeURIComponent(
    id,
  )}/report?print=1`

  let browser: Browser | null = null

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()

    if (incomingCookieHeader) {
      const cookiePairs = incomingCookieHeader
        .split(';')
        .map((c) => c.trim())
        .filter(Boolean)

      const cookies: CookieData[] = cookiePairs.map((pair) => {
        const [name, ...rest] = pair.split('=')
        const value = rest.join('=') ?? ''
        return {
          name,
          value,
          domain: url.hostname,
          path: '/',
        }
      })

      await page.setCookie(...cookies)
    }

    await page.emulateMediaType('screen')
    await page.goto(reportUrl, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 60000,
    })

    const finalUrl = page.url()
    if (finalUrl.includes('/login')) {
      return new Response('Not authenticated to view report', { status: 401 })
    }

    try {
      await page.waitForSelector('#procurement-report-root', { timeout: 15000 })
    } catch {
      return new Response('Failed to reach procurement report page', {
        status: 500,
      })
    }

    await page.$$eval('.no-print', (elements: Element[]) => {
      elements.forEach((el: Element) => {
        ;(el as HTMLElement).style.display = 'none'
      })
    })

    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      format: 'A4',
    })

    if (!pdf.length) {
      return new Response('Failed to generate PDF', { status: 500 })
    }

    const filename = `Procurement-Scorecard-${id}.pdf`

    return new Response(Buffer.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[PROCUREMENT][PDF] Unexpected error', err)
    const message = err instanceof Error ? err.message : String(err)
    if (
      message.includes('Could not find Chrome') ||
      message.includes('Could not find chromium') ||
      message.includes('Could not find Chromium')
    ) {
      return new Response(
        'PDF rendering dependencies missing. Run `npx puppeteer browsers install chrome` (or ensure a Chromium binary is available) and try again.',
        { status: 503 },
      )
    }
    return new Response('Failed to render procurement PDF', { status: 500 })
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}

