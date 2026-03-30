import { NextRequest } from 'next/server'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const noCacheHeaders = {
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  Pragma: 'no-cache',
  Expires: '0',
}

export async function GET(
  _req: NextRequest,
  context: { params: { id?: string } | Promise<{ id?: string }> },
) {
  try {
    const resolvedParams = await Promise.resolve(context.params)
    const id = resolvedParams?.id

    console.log('[PDF] Route hit', { id })

    if (!id) {
      return new Response('Missing scorecard id', {
        status: 400,
        headers: noCacheHeaders,
      })
    }

    const [{ createClient }, { analyseGaps }, { generateRecommendations }] =
      await Promise.all([
        import('@/utils/supabase/server'),
        import('@/lib/scorecard/analysis'),
        import('@/lib/scorecard/recommendations'),
      ])

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return new Response('Unauthorized', {
        status: 401,
        headers: noCacheHeaders,
      })
    }

    const { data: scorecard, error: scorecardError } = await supabase
      .from('scorecards')
      .select(
        `
        *,
        company:companies(*)
      `,
      )
      .eq('id', id)
      .single()

    if (scorecardError || !scorecard) {
      console.error('[PDF] Scorecard fetch failed', {
        id,
        errorMessage: scorecardError?.message,
        code: scorecardError?.code,
      })
      return new Response('Scorecard not found', {
        status: 404,
        headers: noCacheHeaders,
      })
    }

    const company = Array.isArray(scorecard.company) ? scorecard.company[0] : scorecard.company
    if (!company || company.owner_id !== user.id) {
      return new Response('Scorecard not found', {
        status: 404,
        headers: noCacheHeaders,
      })
    }

    const companyName: string = scorecard.company?.name ?? 'Company'

    const { data: results, error: resultsError } = await supabase
      .from('scorecard_results')
      .select('*')
      .eq('scorecard_id', scorecard.id)
      .order('category_name')

    if (resultsError) {
      console.error('[PDF] Results fetch failed', {
        id,
        errorMessage: resultsError.message,
        code: resultsError.code,
      })
      return new Response('Scorecard results not found', {
        status: 404,
        headers: noCacheHeaders,
      })
    }

    const scorecardResult = {
      total_score: Number(scorecard.total_score ?? 0),
      score_level: scorecard.score_level ?? 'Non-Compliant',
      category_results:
        results?.map((r) => ({
          category_key: r.category_name.toLowerCase().replace(/\s+/g, '_'),
          category_name: r.category_name,
          score: Number(r.score),
          max_score: Number(r.max_score),
        })) ?? [],
    }

    const gapSummary = analyseGaps(scorecardResult)
    const recommendations = generateRecommendations(scorecardResult)

    // Consulting-style PDF (text/table only)
    const pdfDoc = await PDFDocument.create()
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica)
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold)

    const pageSize: [number, number] = [595.28, 841.89] // A4
    const margin = 54
    const contentWidth = pageSize[0] - margin * 2

    let page = pdfDoc.addPage(pageSize)
    let y = pageSize[1] - margin

    const colorText = rgb(0.07, 0.09, 0.14)
    const colorMuted = rgb(0.42, 0.45, 0.50)

    const ensureSpace = (needed: number) => {
      if (y - needed < margin) {
        page = pdfDoc.addPage(pageSize)
        y = pageSize[1] - margin
      }
    }

    const normalizeText = (text: string) =>
      text.replace(/[\u2010-\u2015]/g, '-')

    const wrapText = (rawText: string, size: number) => {
      const text = normalizeText(rawText)
      const words = text.split(/\s+/)
      const lines: string[] = []
      let line = ''
      for (const word of words) {
        const test = line ? `${line} ${word}` : word
        const w = fontRegular.widthOfTextAtSize(test, size)
        if (w <= contentWidth) {
          line = test
        } else {
          if (line) lines.push(line)
          line = word
        }
      }
      if (line) lines.push(line)
      return lines
    }

    const drawLine = (rawText: string, size: number, bold = false, muted = false) => {
      const text = normalizeText(rawText)
      ensureSpace(size + 6)
      page.drawText(text, {
        x: margin,
        y,
        size,
        font: bold ? fontBold : fontRegular,
        color: muted ? colorMuted : colorText,
      })
      y -= size + 6
    }

    const drawParagraph = (rawText: string, size = 10) => {
      const lines = wrapText(rawText, size)
      lines.forEach((ln) => drawLine(ln, size, false, false))
      y -= 4
    }

    const sectionTitle = (title: string) => {
      ensureSpace(26)
      y -= 8
      drawLine(title.toUpperCase(), 9, true, true)
      page.drawLine({
        start: { x: margin, y: y + 2 },
        end: { x: margin + contentWidth, y: y + 2 },
        thickness: 1,
        color: rgb(0.90, 0.91, 0.93),
      })
      y -= 10
    }

    // Header block
    drawLine('REAP SOLUTIONS', 10, true, true)
    drawLine('Procurement Scorecard Assessment', 18, true)
    drawLine(companyName, 12, true)
    drawLine(
      `Assessment date: ${new Date(scorecard.created_at).toLocaleString()}`,
      9,
      false,
      true,
    )
    y -= 10

    // Score snapshot
    ensureSpace(70)
    page.drawRectangle({
      x: margin,
      y: y - 54,
      width: contentWidth,
      height: 54,
      color: rgb(0.98, 0.98, 0.99),
      borderColor: rgb(0.90, 0.91, 0.93),
      borderWidth: 1,
    })
    page.drawText(`Final level: ${scorecardResult.score_level}`, {
      x: margin + 14,
      y: y - 22,
      size: 12,
      font: fontBold,
      color: colorText,
    })
    page.drawText(`Total score: ${scorecardResult.total_score} points`, {
      x: margin + 14,
      y: y - 40,
      size: 11,
      font: fontRegular,
      color: colorText,
    })
    y -= 72

    // Executive summary
    sectionTitle('Executive Summary')
    drawParagraph(
      `${companyName} currently achieves ${scorecardResult.total_score} points at ${scorecardResult.score_level} level. This report summarises performance across procurement categories and highlights priority opportunities to close identified gaps.`,
      10,
    )

    // Performance breakdown
    sectionTitle('Performance Breakdown')
    drawParagraph(
      'Category scores are assessed against their maximum attainable points. A higher completion percentage indicates stronger performance and lower remediation urgency.',
      10,
    )

    // Gap analysis table
    sectionTitle('Score Gap Analysis')
    ensureSpace(24)
    const col1 = margin
    const col2 = margin + contentWidth * 0.55
    const col3 = margin + contentWidth * 0.72
    const col4 = margin + contentWidth * 0.84

    page.drawText('Category', { x: col1, y, size: 9, font: fontBold, color: colorMuted })
    page.drawText('Achieved', { x: col2, y, size: 9, font: fontBold, color: colorMuted })
    page.drawText('Max', { x: col3, y, size: 9, font: fontBold, color: colorMuted })
    page.drawText('%', { x: col4, y, size: 9, font: fontBold, color: colorMuted })
    y -= 14

    for (const cat of gapSummary.categories) {
      ensureSpace(14)
      page.drawText(cat.category_name, { x: col1, y, size: 9, font: fontRegular, color: colorText })
      page.drawText(String(cat.score), { x: col2, y, size: 9, font: fontRegular, color: colorText })
      page.drawText(String(cat.max_score), {
        x: col3,
        y,
        size: 9,
        font: fontRegular,
        color: colorText,
      })
      page.drawText(`${(cat.completion * 100).toFixed(0)}%`, {
        x: col4,
        y,
        size: 9,
        font: fontRegular,
        color: colorText,
      })
      y -= 12
    }

    y -= 6

    // Improvement opportunities
    sectionTitle('Improvement Opportunities')
    for (const rec of recommendations) {
      ensureSpace(46)
      page.drawText(
        `${rec.category_name} (${(rec.completion * 100).toFixed(0)}% · gap ${rec.gap})`,
        {
          x: margin,
          y,
          size: 10,
          font: fontBold,
          color: colorText,
        },
      )
      y -= 14
      drawParagraph(rec.title, 9)
      drawParagraph(rec.description, 9)
      y -= 4
    }

    // Footer
    ensureSpace(24)
    y = Math.max(y, margin + 12)
    page.drawText('Prepared by REAP Solutions · Consulting deliverable', {
      x: margin,
      y: margin - 6,
      size: 8,
      font: fontRegular,
      color: colorMuted,
    })

    const pdfBytes = await pdfDoc.save()
    const length = pdfBytes?.length ?? 0
    const signature = length >= 5 ? Buffer.from(pdfBytes.slice(0, 5)).toString('ascii') : ''

    console.log('[PDF] Rendered', {
      id,
      companyName,
      length,
      signature,
      first10: length ? Buffer.from(pdfBytes.slice(0, 10)).toString('hex') : null,
    })

    if (!length) {
      console.error('[PDF] Empty PDF payload')
      return new Response('Failed to generate PDF', {
        status: 500,
        headers: noCacheHeaders,
      })
    }

    const safeCompany = companyName.replace(/[^a-zA-Z0-9-_]+/g, '_').slice(0, 60)
    const filename = `REAP-Scorecard-${safeCompany}-${id}.pdf`

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        ...noCacheHeaders,
      },
    })
  } catch (err: unknown) {
    console.error('[PDF] Unexpected error', err)
    return new Response('Failed to generate PDF', {
      status: 500,
      headers: noCacheHeaders,
    })
  }
}

