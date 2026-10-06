import type { PDFFont } from 'pdf-lib'

/**
 * The PDF uses the built-in Helvetica fonts so nothing is read from disk at
 * run time. Those fonts only cover the Windows-1252 ("WinAnsi") character
 * set; pdf-lib throws on anything else. Supplier names come from uploaded
 * workbooks and can contain any character, so every string is cleaned here
 * before it is drawn.
 */

const charsetCache = new WeakMap<PDFFont, Set<number>>()

function charsetOf(font: PDFFont): Set<number> {
  let set = charsetCache.get(font)
  if (!set) {
    set = new Set(font.getCharacterSet())
    charsetCache.set(font, set)
  }
  return set
}

const REPLACEMENTS: Record<string, string> = {
  '−': '-', // minus sign
  '‐': '-',
  '‑': '-',
  '‒': '-',
  '―': '—',
  '′': "'",
  '″': '"',
  '≤': '<=',
  '≥': '>=',
  '→': '->',
  ' ': ' ',
  ' ': ' ',
  ' ': ' ',
  ' ': ' ',
}

/**
 * Returns `text` with every character the font cannot draw replaced:
 * accents are dropped where that leaves a drawable letter ("ł" stays "?" but
 * "é" is kept, "ő" becomes "o"), a few symbols get ASCII stand-ins, and
 * anything left becomes "?". Line breaks and tabs become spaces.
 */
export function sanitizeForFont(text: string, font: PDFFont): string {
  const set = charsetOf(font)
  let out = ''
  let clean = true
  for (const ch of text) {
    const cp = ch.codePointAt(0) as number
    if (set.has(cp) && cp >= 0x20) {
      out += ch
      continue
    }
    clean = false
    if (cp === 0x09 || cp === 0x0a || cp === 0x0d) {
      out += ' '
      continue
    }
    const replacement = REPLACEMENTS[ch]
    if (replacement !== undefined) {
      out += replacement
      continue
    }
    const stripped = ch.normalize('NFKD').replace(/[̀-ͯ]/g, '')
    if (stripped && [...stripped].every((c) => set.has(c.codePointAt(0) as number))) {
      out += stripped
      continue
    }
    if (cp < 0x20 || (cp >= 0x7f && cp < 0xa0)) continue // control characters
    out += '?'
  }
  return clean ? text : out
}

/** Splits text into lines no wider than `maxWidth`. Long words are broken. */
export function wrapText(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  if (words.length === 0) return ['']
  const lines: string[] = []
  let line = ''
  const fits = (s: string) => font.widthOfTextAtSize(s, size) <= maxWidth

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (fits(candidate)) {
      line = candidate
      continue
    }
    if (line) lines.push(line)
    if (fits(word)) {
      line = word
      continue
    }
    // A single word wider than the column: break after a hyphen first
    // ("Non-" / "compliant"), and by characters only as a last resort.
    let piece = ''
    for (const part of word.split(/(?<=-)/)) {
      if (fits(piece + part)) {
        piece += part
        continue
      }
      if (piece) lines.push(piece)
      piece = ''
      if (fits(part)) {
        piece = part
        continue
      }
      for (const ch of part) {
        if (fits(piece + ch)) {
          piece += ch
        } else {
          if (piece) lines.push(piece)
          piece = ch
        }
      }
    }
    line = piece
  }
  if (line) lines.push(line)
  return lines
}

const ELLIPSIS = '…'

/** Shortens text to fit `maxWidth`, ending in "…" when anything was cut. */
export function truncateToWidth(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text
  const chars = [...text]
  let lo = 0
  let hi = chars.length
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2)
    const candidate = chars.slice(0, mid).join('').trimEnd() + ELLIPSIS
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) lo = mid
    else hi = mid - 1
  }
  return lo === 0 ? ELLIPSIS : chars.slice(0, lo).join('').trimEnd() + ELLIPSIS
}

/** Wraps to at most `maxLines`; the last line is truncated with "…" if needed. */
export function wrapTextLimited(
  text: string,
  font: PDFFont,
  size: number,
  maxWidth: number,
  maxLines: number,
): string[] {
  const lines = wrapText(text, font, size, maxWidth)
  if (lines.length <= maxLines) return lines
  const kept = lines.slice(0, maxLines)
  const rest = lines.slice(maxLines - 1).join(' ')
  kept[maxLines - 1] = truncateToWidth(rest, font, size, maxWidth)
  return kept
}
