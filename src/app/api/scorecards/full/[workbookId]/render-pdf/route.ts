import { NextRequest } from 'next/server'
import puppeteer, { type Browser, type CookieData } from 'puppeteer'
import { createClient } from '@/utils/supabase/server'
import { devLog, devWarn } from '@/lib/dev-log'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function safeFilenamePart(name: string): string {
  const s = name
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 48)
  return s || 'company'
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ workbookId?: string }> },
) {
  const { workbookId } = await context.params
  const incomingCookieHeader = req.headers.get('cookie') ?? ''

  devLog('[PDF][full-scorecard] Route hit', { workbookId, hasCookies: !!incomingCookieHeader })

  if (!workbookId) {
    return new Response('Missing workbook id', { status: 400 })
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  const { data: workbook } = await supabase
    .from('scorecard_workbooks')
    .select('id, company_id')
    .eq('id', workbookId)
    .single()

  if (!workbook) {
    return new Response('Workbook not found', { status: 404 })
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id, name, owner_id')
    .eq('id', workbook.company_id)
    .single()

  if (!company || company.owner_id !== user.id) {
    return new Response('Forbidden', { status: 403 })
  }

  const { data: latestRun } = await supabase
    .from('scorecard_engine_runs')
    .select('id')
    .eq('workbook_id', workbook.id)
    .order('started_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!latestRun) {
    return new Response('No engine run for this workbook', { status: 404 })
  }

  const { data: latestResult } = await supabase
    .from('scorecard_engine_results')
    .select('id')
    .eq('engine_run_id', latestRun.id)
    .maybeSingle()

  if (!latestResult) {
    return new Response('No engine result to export', { status: 404 })
  }

  const url = new URL(req.url)
  const baseUrl = `${url.protocol}//${url.host}`
  const reportUrl = `${baseUrl}/scorecards/full/${encodeURIComponent(workbookId)}/report?print=1`

  devLog('[PDF][full-scorecard] Report URL', reportUrl)

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
      devLog('[PDF][full-scorecard] Applied cookies', { count: cookies.length })
    } else {
      devWarn('[PDF][full-scorecard] No cookies on request')
    }

    await page.emulateMediaType('screen')
    await page.goto(reportUrl, {
      waitUntil: ['networkidle0', 'domcontentloaded'],
      timeout: 60000,
    })

    const finalUrl = page.url()
    if (finalUrl.includes('/login')) {
      console.error('[PDF][full-scorecard] Landed on login')
      return new Response('Not authenticated to view report', { status: 401 })
    }

    try {
      await page.waitForSelector('#full-scorecard-report-root', { timeout: 15000 })
      devLog('[PDF][full-scorecard] Report root detected')
    } catch {
      console.error('[PDF][full-scorecard] Report root missing')
      return new Response('Failed to reach full scorecard report page', { status: 500 })
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

    const datePart = new Date().toISOString().slice(0, 10)
    const filename = `full-scorecard-${safeFilenamePart(company.name)}-${datePart}.pdf`

    return new Response(Buffer.from(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (err) {
    console.error('[PDF][full-scorecard] Error', err)
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
