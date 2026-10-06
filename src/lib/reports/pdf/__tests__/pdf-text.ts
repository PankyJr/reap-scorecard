import {
  PDFArray,
  PDFDocument,
  PDFRawStream,
  decodePDFRawStream,
} from 'pdf-lib'

/**
 * Test helper: reads the text runs back out of a finished PDF.
 *
 * pdf-lib writes built-in-font text as hex strings followed by `Tj` inside
 * Flate-compressed content streams. This loads the bytes with pdf-lib,
 * inflates each page's streams and decodes those strings, so a test checks
 * what is really in the file rather than what the code meant to draw.
 */

/** WinAnsi bytes 0x80–0x9F that differ from Latin-1. */
const WIN_ANSI_HIGH: Record<number, string> = {
  0x80: '€',
  0x85: '…',
  0x91: '‘',
  0x92: '’',
  0x93: '“',
  0x94: '”',
  0x95: '•',
  0x96: '–',
  0x97: '—',
}

function decodeHex(hex: string): string {
  let out = ''
  for (let i = 0; i + 1 < hex.length; i += 2) {
    const byte = parseInt(hex.slice(i, i + 2), 16)
    out += WIN_ANSI_HIGH[byte] ?? String.fromCharCode(byte)
  }
  return out
}

export interface ExtractedPdf {
  pageCount: number
  /** Text runs per page, in drawing order. */
  pages: string[][]
  /** Every run on every page joined by newlines. */
  all: string
}

export async function extractPdfText(bytes: Uint8Array): Promise<ExtractedPdf> {
  const doc = await PDFDocument.load(bytes)
  const pages = doc.getPages().map((page) => {
    const contents = page.node.Contents()
    const streams =
      contents instanceof PDFArray
        ? contents.asArray().map((ref) => doc.context.lookup(ref))
        : [contents]
    const runs: string[] = []
    for (const stream of streams) {
      if (!(stream instanceof PDFRawStream)) continue
      const decoded = Buffer.from(decodePDFRawStream(stream).decode()).toString('latin1')
      for (const match of decoded.matchAll(/<([0-9A-Fa-f]*)>\s*Tj/g)) {
        runs.push(decodeHex(match[1]))
      }
    }
    return runs
  })
  return {
    pageCount: doc.getPageCount(),
    pages,
    all: pages.map((p) => p.join('\n')).join('\n'),
  }
}
