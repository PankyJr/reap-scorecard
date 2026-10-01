/**
 * Buttons whose aria-label does not contain the words they show (WCAG 2.5.3,
 * "Label in Name"): a voice-control user who says what they see cannot press
 * them. Text inside aria-hidden elements is decoration and is ignored.
 */
export function mismatchedButtons(html: string): string[] {
  const bad: string[] = []
  for (const m of html.matchAll(/<button\b([^>]*)>([\s\S]*?)<\/button>/g)) {
    const label = m[1].match(/aria-label="([^"]*)"/)?.[1]
    const visible = m[2]
      .replace(/<(\w+)[^>]*aria-hidden="true"[^>]*>[\s\S]*?<\/\1>/g, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    if (label && visible && !label.toLowerCase().includes(visible.toLowerCase())) bad.push(`"${visible}" is named "${label}"`)
  }
  return bad
}
