import { describe, expect, it } from 'vitest'
import { PDFDocument, StandardFonts } from 'pdf-lib'
import { BRAND_WORDMARK, DRAFT_FOOTER, ReportPdf } from '../document'
import { sanitizeForFont, truncateToWidth, wrapText } from '../text'
import { extractPdfText } from './pdf-text'

async function helvetica() {
  const doc = await PDFDocument.create()
  return doc.embedFont(StandardFonts.Helvetica)
}

describe('sanitizeForFont', () => {
  it('keeps text the built-in font can draw', async () => {
    const font = await helvetica()
    expect(sanitizeForFont('Café Ndlovu — 51% (Pty) Ltd', font)).toBe(
      'Café Ndlovu — 51% (Pty) Ltd',
    )
  })

  it('replaces characters the built-in font cannot draw instead of throwing', async () => {
    const font = await helvetica()
    const cleaned = sanitizeForFont('Łódź 北京 Trading\nCo ő − 5 ≥ 3 🚚', font)
    expect(cleaned).toBe('?ódz ?? Trading Co o - 5 >= 3 ?')
    // Proves the cleaned text is drawable: pdf-lib throws on unsupported glyphs.
    expect(() => font.encodeText(cleaned)).not.toThrow()
  })
})

describe('wrapText / truncateToWidth', () => {
  it('wraps on spaces and breaks words longer than the line', async () => {
    const font = await helvetica()
    const lines = wrapText('alpha beta gamma ' + 'x'.repeat(80), font, 10, 100)
    expect(lines.length).toBeGreaterThan(2)
    for (const line of lines) {
      expect(font.widthOfTextAtSize(line, 10)).toBeLessThanOrEqual(100)
    }
    expect(lines.join('').replace(/\s/g, '')).toBe('alphabetagamma' + 'x'.repeat(80))
  })

  it('breaks a too-long word after its hyphen before breaking it mid-word', async () => {
    const font = await helvetica()
    const width = font.widthOfTextAtSize('compliant', 7.5) + 1
    expect(wrapText('Non-compliant', font, 7.5, width)).toEqual(['Non-', 'compliant'])
  })

  it('truncates with an ellipsis only when the text is too wide', async () => {
    const font = await helvetica()
    expect(truncateToWidth('Short', font, 10, 100)).toBe('Short')
    const cut = truncateToWidth('A very long supplier name that will not fit', font, 10, 80)
    expect(cut.endsWith('…')).toBe(true)
    expect(font.widthOfTextAtSize(cut, 10)).toBeLessThanOrEqual(80)
  })
})

describe('ReportPdf', () => {
  it('puts the wordmark on every page and "Page X of Y" plus the draft line in every footer', async () => {
    const pdf = await ReportPdf.create({ title: 'Test', headerLabel: 'Acme (Pty) Ltd' })
    pdf.heading('First')
    pdf.paragraph('Hello')
    pdf.newPage()
    pdf.paragraph('Second page')
    const bytes = await pdf.save()
    const text = await extractPdfText(bytes)

    expect(text.pageCount).toBe(2)
    for (const [i, runs] of text.pages.entries()) {
      expect(runs).toContain(BRAND_WORDMARK)
      expect(runs).toContain(DRAFT_FOOTER)
      expect(runs).toContain(`Page ${i + 1} of 2`)
      expect(runs).toContain('Acme (Pty) Ltd')
    }
    // The text log matches what really landed in the file.
    expect(text.all.split('\n').sort()).toEqual([...pdf.textLog].sort())
  })

  it('repeats the table header and the continued label on every page a long table reaches', async () => {
    const pdf = await ReportPdf.create({ title: 'Test', headerLabel: 'Acme' })
    const columns = [
      { header: 'Supplier name', width: 300 },
      { header: 'Spend', width: pdf.contentWidth - 300, align: 'right' as const },
    ]
    const rows = Array.from({ length: 200 }, (_, i) => [`Supplier ${i + 1}`, `R ${i}.00`])
    pdf.table(columns, rows, { continuedLabel: 'Supplier list (continued)' })
    const text = await extractPdfText(await pdf.save())

    expect(text.pageCount).toBeGreaterThan(2)
    for (const [i, runs] of text.pages.entries()) {
      expect(runs).toContain('Supplier name')
      expect(runs).toContain('Spend')
      if (i > 0) expect(runs).toContain('Supplier list (continued)')
    }
    expect(text.all).toContain('Supplier 1\n')
    expect(text.all).toContain('Supplier 200')
  })

  it('prints every bar chart figure as text so it reads without colour', async () => {
    const pdf = await ReportPdf.create({ title: 'Test', headerLabel: 'Acme' })
    pdf.barChart(
      [
        { label: 'Line A', value: 0.4, marker: 0.8, valueLabel: '40.0% of 80.0% target: Below target' },
        { label: 'Line B', value: null, marker: 0.15, valueLabel: 'Not provided' },
      ],
      { scaleMax: 1, ticks: [[0, '0%'], [1, '100%']] },
    )
    const text = await extractPdfText(await pdf.save())
    expect(text.all).toContain('40.0% of 80.0% target: Below target')
    expect(text.all).toContain('Not provided')
    expect(text.all).toContain('100%')
  })
})
