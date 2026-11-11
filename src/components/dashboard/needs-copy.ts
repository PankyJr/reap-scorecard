/**
 * "Needs you" as actions, not names. DISPLAY ONLY: which items appear, and in
 * what order, is decided by data the dashboard already loads (the next step,
 * companies needing attention, the engine's readiness reasons). This file only
 * words them. Titles are at most two lines, sub-lines one short line.
 *
 * See the mapping table in the hand-back and the tests beside this file.
 */
export type NeedCopy = { title: string; sub: string }

const possessive = (company: string) => (/s$/i.test(company) ? `${company}’` : `${company}’s`)

/** The next step, keyed by the status function's own "next" verb. */
export function nextStepCopy(args: { company: string | null; next: string; fallbackTitle: string; fallbackBody: string }): NeedCopy {
  const c = args.company
  if (!c) return { title: args.fallbackTitle, sub: firstSentence(args.fallbackBody) }
  switch (args.next) {
    case 'Continue':
    case 'See what is missing':
      return { title: `Finish ${possessive(c)} scorecard`, sub: 'Some information is still missing' }
    case 'Calculate again':
      return { title: `Recalculate ${possessive(c)} scorecard`, sub: 'Figures changed after it was calculated' }
    case 'Check imported data':
      return { title: `Check ${possessive(c)} imported workbook`, sub: 'Confirm what was read from it' }
    case 'Upload the workbook':
      return { title: `Upload ${possessive(c)} workbook`, sub: 'The scorecard fills in from it' }
    case 'Open':
      return { title: `Open ${possessive(c)} scorecard`, sub: 'It scores selected areas only' }
    default:
      return { title: `Choose a scorecard for ${c}`, sub: 'Full B-BBEE scorecard or procurement only' }
  }
}

/** A company the home page flags (homeCompanyRow's attention reason). */
export function attentionCopy(company: string, reason: string): NeedCopy {
  if (/changed since/i.test(reason)) return { title: `Recalculate ${possessive(company)} scorecard`, sub: 'Figures changed after it was calculated' }
  if (/below its minimum/i.test(reason)) return { title: `Lift ${possessive(company)} weakest area`, sub: 'It is below its minimum, which drops a level' }
  if (/evidence/i.test(reason)) return { title: `Confirm ${possessive(company)} evidence`, sub: 'Contributions are waiting for you' }
  return { title: reason.replace(/\.$/, ''), sub: company }
}

/**
 * The engine's readiness reason for the scorecard in the hero.
 * @param areaName the app's name for the area it is about (from reasonLink), or null
 */
export function reasonCopy(company: string, reason: string, areaName: string | null): NeedCopy {
  const text = reason.trim()
  const area = areaName ? areaName.charAt(0).toLowerCase() + areaName.slice(1) : null
  if (/is an Exempted Micro-Enterprise/i.test(text)) return { title: `${company} is an EME`, sub: 'The full scorecard doesn’t apply. Use the EME route.' }
  if (/is an Qualifying Small Enterprise|is a Qualifying Small Enterprise/i.test(text)) return { title: `${company} is a QSE`, sub: 'The full scorecard doesn’t apply. Use the QSE route.' }
  if (/election .* requires both a recorded reason and supporting evidence/i.test(text)) return { title: `Record why ${company} uses the full scorecard`, sub: 'A reason and evidence are needed' }
  if (/sector code\b.*applies to this entity|applies to this entity, so the generic codes/i.test(text)) return { title: `Measure ${company} on its sector code`, sub: 'The generic codes don’t give its level' }
  if (/could not be classified because annual revenue/i.test(text)) return { title: `Add ${possessive(company)} turnover`, sub: 'Its size is worked out from it' }
  if (/Applicability inputs are incomplete/i.test(text)) return { title: `Finish ${possessive(company)} size and sector`, sub: 'Some details are still missing' }
  if (/NPAT denominator has not been resolved/i.test(text)) return { title: `Add ${possessive(company)} profit after tax`, sub: 'Several targets are worked out from it' }
  if (/NPAT denominator still requires authorised confirmation/i.test(text)) return { title: `Confirm ${possessive(company)} profit after tax`, sub: 'A REAP administrator must approve it' }
  if (/reserved draft/i.test(text)) return { title: 'Switch to a published rule set', sub: 'A draft rule set gives no final level' }
  if (area) {
    if (/ is partial\.$/i.test(text)) return { title: `Finish the ${area} figures`, sub: company }
    if (/ is missing inputs\.$/i.test(text)) return { title: `Add the ${area} figures`, sub: company }
    if (/ is not started\.$/i.test(text)) return { title: `Start ${area}`, sub: company }
    if (/ is pending confirmation\.$/i.test(text)) return { title: `Confirm the ${area} evidence`, sub: company }
    if (/ has not been calculated\.$/i.test(text)) return { title: `Work out ${area}`, sub: company }
    if (/priority sub-minimum could not be tested/i.test(text)) return { title: `Finish ${area} to test its minimum`, sub: company }
  }
  return { title: text.replace(/\.$/, ''), sub: company }
}

function firstSentence(text: string): string {
  return text.split(/(?<=\.)\s/)[0].replace(/\.$/, '')
}

/** Kept for older callers: drop "for {company}" when the title already names it. */
export function withoutRepeatedName(title: string): string {
  const at = title.lastIndexOf(' for ')
  if (at < 0) return title
  const what = title.slice(0, at)
  const who = title.slice(at + 5).trim()
  const core = who.replace(/\s*\((pty|proprietary)\)\s*(ltd|limited)?\.?$/i, '').trim()
  return core && what.toLowerCase().includes(core.toLowerCase()) ? what : title
}
