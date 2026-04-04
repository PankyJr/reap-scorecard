import { NextRequest } from 'next/server'
import puppeteer, { type Browser, type CookieData } from 'puppeteer'
import { devLog, devWarn } from '@/lib/dev-log'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  context: { params: { id?: string } | Promise<{ id?: string }> },
) {
  const resolved = await Promise.resolve(context.params)
  const id = resolved?.id

  const incomingCookieHeader = req.headers.get('cookie') ?? ''

  devLog('[PDF][render] Route hit', { id, hasCookies: !!incomingCookieHeader })

  if (!id) {
    return new Response('Missing scorecard id', { status: 400 })
  }

  const url = new URL(req.url)
  const baseUrl = `${url.protocol}//${url.host}`
  const reportUrl = `${baseUrl}/scorecards/${encodeURIComponent(id)}/report`

  devLog('[PDF][render] Using report URL', reportUrl)

  let browser: Browser | null = null

  try {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    })

    const page = await browser.newPage()

    // Apply auth cookies from the incoming request so middleware sees the user as logged in
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
      devLog('[PDF][render] Applied cookies to page', {
        count: cookies.length,
        names: cookies.map((c) => c.name),
      })
    } else {
      devWarn('[PDF][render] No cookies on incoming request; report route may redirect to login')
    }

    await page.emulateMediaType('screen')

    devLog('[PDF][render] Navigating to report')
    await page.goto(reportUrl, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 60000,
    })

    const finalUrl = page.url()
    devLog('[PDF][render] Final URL after navigation', { finalUrl })

    // Hard guard: do not print login page
    if (finalUrl.includes('/login')) {
      console.error('[PDF][render] Navigation ended on login page, aborting PDF generation')
      return new Response('Not authenticated to view report', { status: 401 })
    }

    // Ensure we are on the scorecard report page
    try {
      await page.waitForSelector('#scorecard-report-root', { timeout: 15000 })
      devLog('[PDF][render] Report root detected')
    } catch {
      console.error('[PDF][render] Report root not detected; aborting')
      return new Response('Failed to reach scorecard report page', { status: 500 })
    }

    // Hide client-only controls before printing
    await page.$$eval('.no-print', (elements: Element[]) => {
      elements.forEach((el: Element) => {
        ;(el as HTMLElement).style.display = 'none'
      })
    })

    // Best-effort check that the chart has rendered
    try {
      await page.waitForSelector('#performance-chart', { timeout: 10000 })
      devLog('[PDF][render] Chart element detected')
    } catch {
      devWarn('[PDF][render] Chart element not detected before PDF generation')
    }

    const pdf = await page.pdf({
      printBackground: true,
      preferCSSPageSize: true,
      format: 'A4',
    })

    devLog('[PDF][render] Generated PDF bytes', {
      length: pdf.length,
      signature: Buffer.from(pdf.subarray(0, 5)).toString('ascii'),
    })

    if (!pdf.length) {
      return new Response('Failed to generate PDF', { status: 500 })
    }

    const filename = `REAP-Scorecard-${id}.pdf`

    return new Response(Buffer.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[PDF][render] Unexpected error', err)
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
    return new Response('Failed to render PDF', { status: 500 })
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}


