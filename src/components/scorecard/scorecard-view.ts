/**
 * The engine's result, arranged for the score hero and the element bar.
 *
 * DISPLAY ONLY. Every number here is read from the engine's own result
 * (calculateGenericScorecard / a stored snapshot). The only arithmetic is
 * adding the three ESD parts together for the ESD legend row and subtracting
 * earned from available for "shortfall"; nothing is re-scored, nothing feeds
 * back into a calculation.
 *
 * The B-BBEE generic scorecard has five elements. The engine scores ESD as
 * three (preferential procurement, supplier development, enterprise
 * development); the bar shows them as three shades of one colour.
 */
import type { GenericScorecardCalculation } from '@/lib/scorecard/generic'
import type { ElementResult } from '@/lib/scorecard/generic/types'
import { AREA_COPY, failedMinimum, losingPoints, type AreaKey } from '@/lib/scorecard/generic/ux/areas'

export type ElementGroupKey = 'own' | 'mc' | 'skills' | 'esd' | 'sed'

export type BarPart = {
  key: AreaKey
  label: string
  earned: number
  available: number
  /** Tailwind token class for this part's colour. */
  colour: string
  /** The same part as a light tint on the teal score hero. */
  colourOnTeal: string
}

export type ElementGroup = {
  key: ElementGroupKey
  label: string
  short: string
  earned: number
  available: number
  bonusEarned: number
  bonusAvailable: number
  shortfall: number
  colour: string
  dot: string
  /** Light tint for the teal score hero. */
  colourOnTeal: string
  /** One per engine element: one for most groups, three for ESD. */
  parts: BarPart[]
  /** The engine's priority sub-minimum outcome, when one is evaluated and failed. */
  belowSubminimum: { threshold: number; achieved: number } | null
  /**
   * From the engine's existing "where you're losing points" list: the
   * indicator with the most points still to win. Null when nothing is lost.
   * Not a recommendation we wrote: it is the engine's own indicator.
   */
  biggestGap: { name: string; achieved: number; available: number } | null
  /** Where this area is entered, for links. */
  slug: string
  status: 'scored' | 'partial' | 'not_started'
}

const GROUPS: Array<{ key: ElementGroupKey; label: string; short: string; members: AreaKey[]; colour: string; dot: string; onTeal: string; parts?: string[]; partsOnTeal?: string[] }> = [
  { key: 'own', label: 'Ownership', short: 'Ownership', members: ['ownership'], colour: 'bg-el-own', dot: 'bg-el-own', onTeal: 'bg-el-own-on-teal' },
  { key: 'mc', label: 'Management control', short: 'Management', members: ['management_control'], colour: 'bg-el-mc', dot: 'bg-el-mc', onTeal: 'bg-el-mc-on-teal' },
  { key: 'skills', label: 'Skills development', short: 'Skills', members: ['skills_development'], colour: 'bg-el-skills', dot: 'bg-el-skills', onTeal: 'bg-el-skills-on-teal' },
  {
    key: 'esd',
    label: 'Enterprise and supplier development',
    short: 'ESD',
    members: ['preferential_procurement', 'supplier_development', 'enterprise_development'],
    colour: 'bg-el-esd',
    dot: 'bg-el-esd',
    onTeal: 'bg-el-esd-on-teal',
    parts: ['bg-el-esd-pp', 'bg-el-esd-sd', 'bg-el-esd-ed'],
    partsOnTeal: ['bg-el-esd-pp-on-teal', 'bg-el-esd-sd-on-teal', 'bg-el-esd-ed-on-teal'],
  },
  { key: 'sed', label: 'Socio-economic development', short: 'SED', members: ['socio_economic_development'], colour: 'bg-el-sed', dot: 'bg-el-sed', onTeal: 'bg-el-sed-on-teal' },
]

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

export type ScorecardView = {
  groups: ElementGroup[]
  earned: number
  available: number
  bonusEarned: number
  /** The engine's total, base + bonus: the figure the level is decided on. */
  total: number
  level: string
  /** The engine's recognition percentage for the final level. */
  recognition: number
  isFinal: boolean
  levelNumber: number | null
  /** Areas with no figures yet (engine status not scored). */
  unfinishedAreas: number
}

export function buildScorecardView(result: GenericScorecardCalculation): ScorecardView {
  const byKey = new Map<string, ElementResult>(result.elements.map((e) => [e.elementKey, e]))
  const groups: ElementGroup[] = []
  for (const group of GROUPS) {
    const members = group.members.map((key) => ({ key, element: byKey.get(key) })).filter((m): m is { key: AreaKey; element: ElementResult } => Boolean(m.element))
    if (members.length === 0) continue
    const earned = round2(members.reduce((s, m) => s + m.element.basePointsAchieved, 0))
    const available = round2(members.reduce((s, m) => s + m.element.basePointsAvailable, 0))
    const failed = members.map((m) => failedMinimum(result, m.key)).find(Boolean) ?? null
    const gaps = members.flatMap((m) => losingPoints(m.element, 1)).sort((a, b) => b.available - b.achieved - (a.available - a.achieved))
    const statuses = members.map((m) => m.element.status)
    groups.push({
      key: group.key,
      label: group.label,
      short: group.short,
      earned,
      available,
      bonusEarned: round2(members.reduce((s, m) => s + m.element.bonusPointsAchieved, 0)),
      bonusAvailable: round2(members.reduce((s, m) => s + m.element.bonusPointsAvailable, 0)),
      shortfall: round2(Math.max(0, available - earned)),
      colour: group.colour,
      dot: group.dot,
      colourOnTeal: group.onTeal,
      parts: members.map((m, i) => ({
        key: m.key,
        label: AREA_COPY[m.key]?.label ?? m.element.displayName,
        earned: m.element.basePointsAchieved,
        available: m.element.basePointsAvailable,
        colour: group.parts?.[i] ?? group.colour,
        colourOnTeal: group.partsOnTeal?.[i] ?? group.onTeal,
      })),
      belowSubminimum: failed ? { threshold: failed.thresholdPoints, achieved: failed.achievedPoints ?? 0 } : null,
      biggestGap: gaps[0] ? { name: gaps[0].name, achieved: gaps[0].achieved, available: gaps[0].available } : null,
      slug: AREA_COPY[members[0].key]?.slug ?? '',
      status: statuses.every((s) => s === 'scored') ? 'scored' : statuses.every((s) => s === 'not_started') ? 'not_started' : 'partial',
    })
  }
  const match = result.finalLevel.level.match(/([1-8])/)
  return {
    groups,
    earned: result.totalBasePointsAchieved,
    available: result.totalBasePointsAvailable,
    bonusEarned: result.totalBonusPointsAchieved,
    total: result.rawTotalPoints,
    level: result.finalLevel.level,
    recognition: result.finalLevel.recognitionPercentage,
    isFinal: result.readiness.complete,
    levelNumber: match ? Number(match[1]) : null,
    unfinishedAreas: result.elements.filter((e) => e.status !== 'scored').length,
  }
}

/**
 * The hero sentence, from the engine's own outcomes. Never advice we made up:
 *   - an area below its priority sub-minimum is what "holds you back" (the
 *     engine drops the level for it);
 *   - otherwise, the area with the most points still to win;
 *   - not final yet: how many areas still need figures.
 * Returns the level part and the reason part separately, so the level can be
 * set in the serif and the reason can wrap.
 */
export function heroSentence(view: ScorecardView): { lead: string; reason: string | null } {
  const lead = !view.isFinal ? `${view.level} so far.` : `${view.level}.`
  if (!view.isFinal && view.unfinishedAreas > 0) {
    return { lead, reason: `${view.unfinishedAreas}\u00a0${view.unfinishedAreas === 1 ? 'area still needs' : 'areas still need'} figures.` }
  }
  const failed = view.groups.find((g) => g.belowSubminimum)
  if (failed) return { lead, reason: `${failed.label} is holding you back.` }
  const widest = [...view.groups].sort((a, b) => b.shortfall - a.shortfall)[0]
  if (widest && widest.shortfall > 0.004) return { lead, reason: `${widest.label} has the most points to win.` }
  return { lead, reason: null }
}

/** Which of the five bar areas an engine element belongs to (ESD's three parts all map to "esd"). */
export function groupKeyForArea(key: string): ElementGroupKey | null {
  return GROUPS.find((g) => (g.members as string[]).includes(key))?.key ?? null
}
