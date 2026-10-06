import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
  type RGB,
} from 'pdf-lib'
import { sanitizeForFont, truncateToWidth, wrapTextLimited } from './text'

/**
 * Small layout engine for server-generated reports, on top of pdf-lib.
 *
 * Netlify-safe by construction: built-in Helvetica only (no font files),
 * no images, no file system access, no browser. Every string drawn is also
 * appended to `textLog`, which tests use to check what the reader will see.
 *
 * Everything must read in black and white: colour is only ever a second cue
 * next to a word ("Met", "Below target") or a shape (solid bar vs outline).
 */

export const A4_PORTRAIT: [number, number] = [595.28, 841.89]

export const BRAND_WORDMARK = 'REAP Solutions'
export const DRAFT_FOOTER = 'Draft, not a verified B-BBEE certificate'

const MARGIN_X = 40
const HEADER_BASELINE = A4_PORTRAIT[1] - 34
const CONTENT_TOP = A4_PORTRAIT[1] - 62
const CONTENT_BOTTOM = 52
const FOOTER_BASELINE = 26

/** Greys only, so a black-and-white print loses nothing. */
export const PALETTE = {
  ink: rgb(0.07, 0.09, 0.14),
  muted: rgb(0.36, 0.39, 0.44),
  rule: rgb(0.74, 0.76, 0.8),
  hairline: rgb(0.86, 0.87, 0.89),
  bar: rgb(0.24, 0.27, 0.32),
  tint: rgb(0.93, 0.94, 0.95),
} as const

export interface TextStyle {
  size?: number
  bold?: boolean
  color?: RGB
}

export interface TableColumn {
  header: string
  /** Width in points. Columns should add up to `contentWidth`. */
  width: number
  align?: 'left' | 'right'
  /** 1 (default) truncates with "…"; more wraps up to that many lines. */
  maxLines?: number
}

export interface TableOptions {
  size?: number
  headerSize?: number
  /** Drawn above the repeated header on every page after the first. */
  continuedLabel?: string
  /** Row indexes drawn in bold (totals, for example). */
  boldRows?: ReadonlySet<number>
  /** Space above and below each row's text. Smaller packs long lists tighter. */
  rowPadding?: number
}

export interface BarChartRow {
  label: string
  /** Length of the solid bar, in the same units as `scaleMax`. Null = no bar. */
  value: number | null
  /** Where the outlined track ends. Defaults to the full scale. */
  trackMax?: number | null
  /** A vertical tick, e.g. the target. */
  marker?: number | null
  /** Printed after the bar, so the figure never depends on reading the bar. */
  valueLabel: string
}

export interface BarChartOptions {
  scaleMax: number
  labelWidth?: number
  valueWidth?: number
  /** Tick labels under the chart: [position, text]. */
  ticks?: ReadonlyArray<readonly [number, string]>
}

export interface ReportPdfOptions {
  /** Document title stored in the PDF metadata. */
  title: string
  /** Short text at the top right of every page, e.g. the company name. */
  headerLabel: string
  /** Fixed creation date, so a test can produce identical bytes. */
  createdAt?: Date
}

export class ReportPdf {
  readonly textLog: string[] = []
  readonly contentWidth = A4_PORTRAIT[0] - MARGIN_X * 2

  private page!: PDFPage
  private cursor = CONTENT_TOP

  private constructor(
    readonly doc: PDFDocument,
    readonly regular: PDFFont,
    readonly bold: PDFFont,
    private readonly headerLabel: string,
  ) {}

  static async create(options: ReportPdfOptions): Promise<ReportPdf> {
    const doc = await PDFDocument.create()
    const when = options.createdAt ?? new Date()
    doc.setTitle(options.title)
    doc.setAuthor(BRAND_WORDMARK)
    doc.setCreator(BRAND_WORDMARK)
    doc.setProducer(BRAND_WORDMARK)
    doc.setCreationDate(when)
    doc.setModificationDate(when)
    const regular = await doc.embedFont(StandardFonts.Helvetica)
    const bold = await doc.embedFont(StandardFonts.HelveticaBold)
    const report = new ReportPdf(doc, regular, bold, options.headerLabel)
    report.newPage()
    return report
  }

  get y(): number {
    return this.cursor
  }

  get pageCount(): number {
    return this.doc.getPageCount()
  }

  /** Starts a new page with the REAP header. */
  newPage(): void {
    this.page = this.doc.addPage(A4_PORTRAIT)
    this.cursor = CONTENT_TOP
    this.drawRaw(BRAND_WORDMARK, MARGIN_X, HEADER_BASELINE, {
      size: 11,
      bold: true,
    })
    const label = this.fitText(this.headerLabel, 8, false, this.contentWidth - 140)
    const labelWidth = this.regular.widthOfTextAtSize(label, 8)
    this.drawRaw(label, A4_PORTRAIT[0] - MARGIN_X - labelWidth, HEADER_BASELINE, {
      size: 8,
      color: PALETTE.muted,
    })
    this.page.drawLine({
      start: { x: MARGIN_X, y: HEADER_BASELINE - 8 },
      end: { x: A4_PORTRAIT[0] - MARGIN_X, y: HEADER_BASELINE - 8 },
      thickness: 0.75,
      color: PALETTE.rule,
    })
  }

  /** Moves to a new page if fewer than `height` points remain. */
  ensureSpace(height: number): void {
    if (this.cursor - height < CONTENT_BOTTOM) this.newPage()
  }

  moveDown(height: number): void {
    this.cursor -= height
  }

  /** Cleans a string so the built-in font can draw it. */
  clean(text: string, bold = false): string {
    return sanitizeForFont(text, bold ? this.bold : this.regular)
  }

  private font(bold?: boolean): PDFFont {
    return bold ? this.bold : this.regular
  }

  private fitText(text: string, size: number, bold: boolean, width: number): string {
    return truncateToWidth(this.clean(text, bold), this.font(bold), size, width)
  }

  /** Draws one already-measured line. Every visible string passes through here. */
  private drawRaw(text: string, x: number, y: number, style: TextStyle = {}): void {
    const font = this.font(style.bold)
    const clean = sanitizeForFont(text, font)
    if (!clean) return
    this.textLog.push(clean)
    this.page.drawText(clean, {
      x,
      y,
      size: style.size ?? 10,
      font,
      color: style.color ?? PALETTE.ink,
    })
  }

  /** Wrapped text at the cursor. */
  paragraph(
    text: string,
    style: TextStyle & { indent?: number; after?: number; maxLines?: number } = {},
  ): void {
    const size = style.size ?? 10
    const font = this.font(style.bold)
    const indent = style.indent ?? 0
    const lineHeight = size * 1.35
    const lines = wrapTextLimited(
      this.clean(text, style.bold),
      font,
      size,
      this.contentWidth - indent,
      style.maxLines ?? 200,
    )
    // Short paragraphs stay on one page rather than leaving a stray line.
    if (lines.length <= 4) this.ensureSpace(lines.length * lineHeight)
    for (const line of lines) {
      this.ensureSpace(lineHeight)
      this.cursor -= size
      this.drawRaw(line, MARGIN_X + indent, this.cursor, style)
      this.cursor -= lineHeight - size
    }
    this.cursor -= style.after ?? 6
  }

  /** A bulleted list; each item wraps under its own text. */
  bullets(items: ReadonlyArray<string>, style: TextStyle = {}): void {
    const size = style.size ?? 10
    const lineHeight = size * 1.35
    for (const item of items) {
      const lines = wrapTextLimited(
        this.clean(item, style.bold),
        this.font(style.bold),
        size,
        this.contentWidth - 14,
        200,
      )
      lines.forEach((line, i) => {
        this.ensureSpace(lineHeight)
        this.cursor -= size
        if (i === 0) this.drawRaw('•', MARGIN_X + 2, this.cursor, style)
        this.drawRaw(line, MARGIN_X + 14, this.cursor, style)
        this.cursor -= lineHeight - size
      })
      this.cursor -= 3
    }
    this.cursor -= 4
  }

  /** Section heading. Never left alone at the bottom of a page. */
  heading(text: string, level: 1 | 2 | 3 = 1): void {
    const size = level === 1 ? 17 : level === 2 ? 12.5 : 10.5
    const before = level === 1 ? 4 : 10
    this.ensureSpace(before + size + 72)
    this.cursor -= before
    this.paragraph(text, { size, bold: true, after: level === 1 ? 10 : 6 })
  }

  /** Label/value pairs, label in grey on the left. */
  keyValues(
    rows: ReadonlyArray<readonly [string, string]>,
    options: { labelWidth?: number; size?: number; boldValues?: boolean } = {},
  ): void {
    const size = options.size ?? 10
    const labelWidth = options.labelWidth ?? 220
    const lineHeight = size * 1.4
    for (const [label, value] of rows) {
      const labelLines = wrapTextLimited(this.clean(label), this.regular, size, labelWidth - 10, 3)
      const valueLines = wrapTextLimited(
        this.clean(value, options.boldValues),
        this.font(options.boldValues),
        size,
        this.contentWidth - labelWidth,
        6,
      )
      const lines = Math.max(labelLines.length, valueLines.length)
      this.ensureSpace(lines * lineHeight + 4)
      const top = this.cursor
      labelLines.forEach((line, i) =>
        this.drawRaw(line, MARGIN_X, top - size - i * lineHeight, {
          size,
          color: PALETTE.muted,
        }),
      )
      valueLines.forEach((line, i) =>
        this.drawRaw(line, MARGIN_X + labelWidth, top - size - i * lineHeight, {
          size,
          bold: options.boldValues,
        }),
      )
      this.cursor = top - lines * lineHeight - 3
    }
    this.cursor -= 4
  }

  /** A bordered box for warnings such as the draft label. */
  box(title: string, body: string, options: { titleSize?: number } = {}): void {
    const titleSize = options.titleSize ?? 18
    const bodySize = 10
    const pad = 14
    const inner = this.contentWidth - pad * 2
    const titleLines = wrapTextLimited(this.clean(title, true), this.bold, titleSize, inner, 4)
    const bodyLines = body
      ? wrapTextLimited(this.clean(body), this.regular, bodySize, inner, 12)
      : []
    const height =
      pad * 2 +
      titleLines.length * titleSize * 1.25 +
      (bodyLines.length ? 6 + bodyLines.length * bodySize * 1.4 : 0)
    this.ensureSpace(height + 8)
    const top = this.cursor
    this.page.drawRectangle({
      x: MARGIN_X,
      y: top - height,
      width: this.contentWidth,
      height,
      borderColor: PALETTE.ink,
      borderWidth: 2,
    })
    let y = top - pad
    for (const line of titleLines) {
      y -= titleSize
      this.drawRaw(line, MARGIN_X + pad, y, { size: titleSize, bold: true })
      y -= titleSize * 0.25
    }
    if (bodyLines.length) y -= 6
    for (const line of bodyLines) {
      y -= bodySize
      this.drawRaw(line, MARGIN_X + pad, y, { size: bodySize })
      y -= bodySize * 0.4
    }
    this.cursor = top - height - 12
  }

  /**
   * A table that continues across pages, repeating its header (and an
   * optional "continued" label) at the top of every page it reaches.
   */
  table(
    columns: ReadonlyArray<TableColumn>,
    rows: ReadonlyArray<ReadonlyArray<string>>,
    options: TableOptions = {},
  ): void {
    const size = options.size ?? 8.5
    const headerSize = options.headerSize ?? size
    const padX = 4
    const padY = options.rowPadding ?? 3.5
    const lineHeight = size * 1.25
    const headerLineHeight = headerSize * 1.2

    const headerCells = columns.map((col) =>
      wrapTextLimited(this.clean(col.header, true), this.bold, headerSize, col.width - padX * 2, 3),
    )
    const headerLines = Math.max(...headerCells.map((c) => c.length))
    const headerHeight = headerLines * headerLineHeight + padY * 2

    const drawHeader = (continued: boolean) => {
      if (continued && options.continuedLabel) {
        this.cursor -= 9
        this.drawRaw(options.continuedLabel, MARGIN_X, this.cursor, {
          size: 8,
          color: PALETTE.muted,
        })
        this.cursor -= 6
      }
      const top = this.cursor
      this.page.drawRectangle({
        x: MARGIN_X,
        y: top - headerHeight,
        width: this.contentWidth,
        height: headerHeight,
        color: PALETTE.tint,
      })
      let x = MARGIN_X
      columns.forEach((col, i) => {
        headerCells[i].forEach((line, li) => {
          const y = top - padY - headerSize - li * headerLineHeight
          const w = this.bold.widthOfTextAtSize(line, headerSize)
          const tx = col.align === 'right' ? x + col.width - padX - w : x + padX
          this.drawRaw(line, tx, y, { size: headerSize, bold: true })
        })
        x += col.width
      })
      this.page.drawLine({
        start: { x: MARGIN_X, y: top - headerHeight },
        end: { x: MARGIN_X + this.contentWidth, y: top - headerHeight },
        thickness: 0.9,
        color: PALETTE.ink,
      })
      this.cursor = top - headerHeight
    }

    this.ensureSpace(headerHeight + lineHeight * 2 + padY * 2)
    drawHeader(false)

    rows.forEach((row, rowIndex) => {
      const bold = options.boldRows?.has(rowIndex) ?? false
      const font = this.font(bold)
      const cells = columns.map((col, i) => {
        const text = this.clean(row[i] ?? '', bold)
        const width = col.width - padX * 2
        const maxLines = col.maxLines ?? 1
        return maxLines > 1
          ? wrapTextLimited(text, font, size, width, maxLines)
          : [truncateToWidth(text, font, size, width)]
      })
      const lines = Math.max(1, ...cells.map((c) => c.length))
      const height = lines * lineHeight + padY * 2
      if (this.cursor - height < CONTENT_BOTTOM) {
        this.newPage()
        drawHeader(true)
      }
      const top = this.cursor
      let x = MARGIN_X
      columns.forEach((col, i) => {
        cells[i].forEach((line, li) => {
          if (!line) return
          const y = top - padY - size - li * lineHeight + 1
          const tx =
            col.align === 'right'
              ? x + col.width - padX - font.widthOfTextAtSize(line, size)
              : x + padX
          this.drawRaw(line, tx, y, { size, bold })
        })
        x += col.width
      })
      this.cursor = top - height
      this.page.drawLine({
        start: { x: MARGIN_X, y: this.cursor },
        end: { x: MARGIN_X + this.contentWidth, y: this.cursor },
        thickness: 0.4,
        color: PALETTE.hairline,
      })
    })
    this.cursor -= 10
  }

  /**
   * Horizontal bar chart drawn with rectangles. Solid bar = the value;
   * outlined track = what is possible; vertical tick = the marker (target).
   * Every row also prints its figures as text.
   */
  barChart(rows: ReadonlyArray<BarChartRow>, options: BarChartOptions): void {
    const labelWidth = options.labelWidth ?? 150
    const valueWidth = options.valueWidth ?? 150
    const gap = 8
    const barArea = this.contentWidth - labelWidth - valueWidth - gap * 2
    const x0 = MARGIN_X + labelWidth + gap
    const scale = options.scaleMax > 0 ? options.scaleMax : 1
    const toX = (v: number) => x0 + Math.max(0, Math.min(v / scale, 1)) * barArea
    const size = 8.5
    const lineHeight = size * 1.25
    const barHeight = 11

    for (const row of rows) {
      const labelLines = wrapTextLimited(this.clean(row.label), this.regular, size, labelWidth, 2)
      const valueLines = wrapTextLimited(this.clean(row.valueLabel), this.regular, size, valueWidth, 2)
      const textHeight = Math.max(labelLines.length, valueLines.length) * lineHeight
      const rowHeight = Math.max(textHeight, barHeight + 4) + 8
      this.ensureSpace(rowHeight)
      const top = this.cursor
      const mid = top - rowHeight / 2 + 2
      labelLines.forEach((line, i) =>
        this.drawRaw(line, MARGIN_X, mid + (labelLines.length - 1) * lineHeight / 2 - i * lineHeight - size / 2 + 1, { size }),
      )
      const barBottom = mid - barHeight / 2
      const trackEnd = toX(row.trackMax ?? scale)
      this.page.drawRectangle({
        x: x0,
        y: barBottom,
        width: Math.max(trackEnd - x0, 0.5),
        height: barHeight,
        borderColor: PALETTE.rule,
        borderWidth: 0.75,
      })
      if (row.value !== null && Number.isFinite(row.value) && row.value > 0) {
        this.page.drawRectangle({
          x: x0,
          y: barBottom,
          width: Math.max(toX(row.value) - x0, 0.75),
          height: barHeight,
          color: PALETTE.bar,
        })
      }
      if (row.marker !== null && row.marker !== undefined && Number.isFinite(row.marker)) {
        const mx = toX(row.marker)
        this.page.drawLine({
          start: { x: mx, y: barBottom - 3 },
          end: { x: mx, y: barBottom + barHeight + 3 },
          thickness: 1.6,
          color: PALETTE.ink,
        })
      }
      valueLines.forEach((line, i) =>
        this.drawRaw(line, x0 + barArea + gap, mid + (valueLines.length - 1) * lineHeight / 2 - i * lineHeight - size / 2 + 1, { size }),
      )
      this.cursor = top - rowHeight
    }

    if (options.ticks?.length) {
      this.ensureSpace(14)
      this.cursor -= 9
      for (const [pos, text] of options.ticks) {
        const clean = this.clean(text)
        const w = this.regular.widthOfTextAtSize(clean, 7)
        const tx = Math.min(Math.max(toX(pos) - w / 2, x0), x0 + barArea - w)
        this.drawRaw(clean, tx, this.cursor, { size: 7, color: PALETTE.muted })
      }
    }
    this.cursor -= 10
  }

  /** Adds the footer to every page and returns the PDF bytes. */
  async save(): Promise<Uint8Array> {
    const pages = this.doc.getPages()
    const total = pages.length
    pages.forEach((page, i) => {
      this.page = page
      page.drawLine({
        start: { x: MARGIN_X, y: FOOTER_BASELINE + 12 },
        end: { x: A4_PORTRAIT[0] - MARGIN_X, y: FOOTER_BASELINE + 12 },
        thickness: 0.5,
        color: PALETTE.rule,
      })
      this.drawRaw(DRAFT_FOOTER, MARGIN_X, FOOTER_BASELINE, { size: 8, color: PALETTE.muted })
      const label = `Page ${i + 1} of ${total}`
      const w = this.regular.widthOfTextAtSize(label, 8)
      this.drawRaw(label, A4_PORTRAIT[0] - MARGIN_X - w, FOOTER_BASELINE, {
        size: 8,
        color: PALETTE.muted,
      })
    })
    return this.doc.save({ useObjectStreams: true })
  }
}
