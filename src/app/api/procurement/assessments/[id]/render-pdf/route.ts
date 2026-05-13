import { NextRequest } from 'next/server'

import { launchProcurementPdfBrowser, isServerlessPdfEnvironment } from '@/lib/procurement/pdf-render-browser'
import { createClient } from '@/utils/supabase/server'
import { firstEmbeddedRow } from '@/utils/supabase/embed'
import { isReapInternalAdmin } from '@/lib/admin/internal-admin'
import { createServiceRoleSupabase } from '@/lib/supabase/service-role'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
/** Allow headless navigation + PDF generation on serverless hosts (Vercel). */
export const maxDuration = 60

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

  const sessionClient = await createClient()
  const {
    data: { user },
  } = await sessionClient.auth.getUser()

  if (!user) {
    return new Response('Not authenticated to view report', { status: 401 })
  }

  const isReapAdmin = await isReapInternalAdmin(user.id)
  const db = isReapAdmin ? createServiceRoleSupabase() : sessionClient

  const { data: assessment } = await db
    .from('procurement_assessments')
    .select(
      `
      id,
      company:companies(owner_id)
    `,
    )
    .eq('id', id)
    .single()

  type CompanyEmbed = { owner_id: string | null }
  const company = firstEmbeddedRow(
    assessment?.company as CompanyEmbed | CompanyEmbed[] | null | undefined,
  )

  const isOwner = Boolean(company?.owner_id && company.owner_id === user.id)
  const accessPassed = Boolean(
    assessment && company && (isReapAdmin || isOwner),
  )

  if (!assessment || !company || (!isReapAdmin && !isOwner)) {
    return new Response('Not found', { status: 404 })
  }

  const url = new URL(req.url)
  const baseUrl = `${url.protocol}//${url.host}`
  const reportUrl = `${baseUrl}/procurement/assessments/${encodeURIComponent(
    id,
  )}/report?print=1`

  console.info('[PROCUREMENT][PDF] start', {
    assessmentId: id,
    hasAuthenticatedUser: true,
    isReapInternalAdmin: isReapAdmin,
    accessPassed,
    reportUrl,
    chromiumBranch: isServerlessPdfEnvironment()
      ? 'serverless-chromium'
      : 'local-chrome',
  })

  let browser: Awaited<ReturnType<typeof launchProcurementPdfBrowser>> | null =
    null

  try {
    browser = await launchProcurementPdfBrowser()

    const page = await browser.newPage()

    if (incomingCookieHeader.trim()) {
      await page.setExtraHTTPHeaders({
        Cookie: incomingCookieHeader,
      })
    }

    await page.emulateMediaType('screen')
    await page.goto(reportUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 50000,
    })

    const finalUrl = page.url()
    if (finalUrl.includes('/login')) {
      return new Response('Not authenticated to view report', { status: 401 })
    }

    try {
      await page.waitForSelector('#procurement-report-root', {
        timeout: 40000,
      })
    } catch (waitErr) {
      console.error('[PROCUREMENT][PDF] report root selector timeout', {
        assessmentId: id,
        reportUrl,
        finalUrl: page.url(),
        message:
          waitErr instanceof Error ? waitErr.message : String(waitErr),
      })
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
    const message = err instanceof Error ? err.message : String(err)
    const stackPreview =
      err instanceof Error
        ? err.stack?.split('\n').slice(0, 8).join('\n')
        : undefined
    console.error('[PROCUREMENT][PDF] unexpected error', {
      assessmentId: id,
      chromiumBranch: isServerlessPdfEnvironment()
        ? 'serverless-chromium'
        : 'local-chrome',
      reportUrl,
      message,
      stackPreview,
    })
    if (
      message.includes('Could not find Chrome') ||
      message.includes('Could not find chromium') ||
      message.includes('Could not find Chromium')
    ) {
      return new Response(
        'PDF rendering dependencies missing. On Netlify/Vercel this should use serverless Chromium automatically; locally install Chrome or set PUPPETEER_EXECUTABLE_PATH.',
        { status: 503 },
      )
    }
    if (
      message.includes('No Chrome/Chromium found') ||
      message.includes('PDF generation')
    ) {
      return new Response(message, { status: 503 })
    }
    return new Response('Failed to render procurement PDF', { status: 500 })
  } finally {
    if (browser) {
      await browser.close()
    }
  }
}
