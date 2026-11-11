/**
 * Plain English for "Needs you". The engine writes its readiness reasons for
 * auditors ("Management Control is partial."); this says the same thing the
 * way a consultant would. Copy only: the reason itself, and whether it shows,
 * are the engine's.
 */
const STATUS_WORDS: Array<{ test: RegExp; say: string }> = [
  { test: / is partial\.$/i, say: 'some figures are still missing' },
  { test: / is missing inputs\.$/i, say: 'figures are still needed' },
  { test: / is not started\.$/i, say: 'not started yet' },
  { test: / is pending confirmation\.$/i, say: 'evidence is waiting for you to confirm it' },
  { test: / has not been calculated\.$/i, say: 'not worked out yet' },
]

/**
 * @param reason   the engine's readiness reason
 * @param areaName the area it is about, in the app's own words ("Management
 *                 control"), from reasonLink(); null when it names none
 */
export function plainReason(reason: string, areaName: string | null): string {
  const text = reason.trim()
  if (/NPAT denominator has not been resolved/i.test(text)) return 'Profit after tax is still needed'
  if (/NPAT denominator still requires authorised confirmation/i.test(text)) return 'Profit after tax needs a REAP administrator to confirm it'
  if (/reserved draft/i.test(text)) return 'This scorecard uses a draft rule set, so it cannot give a final level'
  const minimum = text.match(/^The (.+) priority sub-minimum could not be tested\.$/i)
  if (minimum) return `${areaName ?? minimum[1]}: its minimum cannot be checked yet`
  for (const rule of STATUS_WORDS) {
    if (rule.test.test(text) && areaName) return `${areaName}: ${rule.say}`
  }
  return text.replace(/\.$/, '')
}

/**
 * "FY2026 scorecard for Halfway Logistics FY2026 scorecard" style repeats:
 * drop the "for {company}" when the title already names the company.
 */
export function withoutRepeatedName(title: string): string {
  const at = title.lastIndexOf(' for ')
  if (at < 0) return title
  const what = title.slice(0, at)
  const who = title.slice(at + 5).trim()
  const core = who.replace(/\s*\((pty|proprietary)\)\s*(ltd|limited)?\.?$/i, '').trim()
  return core && what.toLowerCase().includes(core.toLowerCase()) ? what : title
}
