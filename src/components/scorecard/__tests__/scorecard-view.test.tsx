import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { calculateGenericScorecard } from '@/lib/scorecard/generic'
import {
  completeScorecardInputs,
} from '@/lib/scorecard/generic/__tests__/fixtures'
import { buildScorecardView, heroSentence, type ScorecardView } from '../scorecard-view'

vi.mock('next/navigation', () => ({ usePathname: () => '/dashboard', useRouter: () => ({ push: vi.fn() }) }))

import { ElementBar } from '../ElementBar'
import { ScoreHero } from '../ScoreHero'
import { TooltipProvider } from '@/components/ui/Tooltip'

const result = calculateGenericScorecard(completeScorecardInputs())
const view = buildScorecardView(result)

describe('the scorecard view only rearranges the engine result', () => {
  it('shows five areas, with ESD made of its three engine elements', () => {
    expect(view.groups.map((g) => g.key)).toEqual(['own', 'mc', 'skills', 'esd', 'sed'])
    expect(view.groups.find((g) => g.key === 'esd')!.parts.map((p) => p.key)).toEqual([
      'preferential_procurement',
      'supplier_development',
      'enterprise_development',
    ])
  })

  it('the five areas add up to exactly the engine total, earned and available', () => {
    const earned = view.groups.reduce((s, g) => s + g.earned, 0)
    const available = view.groups.reduce((s, g) => s + g.available, 0)
    expect(earned).toBeCloseTo(result.totalBasePointsAchieved, 2)
    expect(available).toBeCloseTo(result.totalBasePointsAvailable, 2)
    expect(view.total).toBe(result.rawTotalPoints)
    expect(view.level).toBe(result.finalLevel.level)
  })

  it('each element keeps its own engine figures, untouched', () => {
    for (const element of result.elements) {
      const part = view.groups.flatMap((g) => g.parts).find((p) => p.key === element.elementKey)!
      expect(part.earned).toBe(element.basePointsAchieved)
      expect(part.available).toBe(element.basePointsAvailable)
    }
  })

  it('flags an area below its priority sub-minimum only when the engine failed it', () => {
    const failedKeys = result.prioritySubminimums.filter((s) => s.evaluated && s.passed === false).map((s) => s.elementKey)
    for (const group of view.groups) {
      const engineFailed = group.parts.some((p) => (failedKeys as string[]).includes(p.key))
      expect(Boolean(group.belowSubminimum), group.key).toBe(engineFailed)
    }
  })
})

describe('the hero sentence', () => {
  const base: ScorecardView = { ...view, isFinal: true, level: 'Level 4', levelNumber: 4, unfinishedAreas: 0 }
  it('names the area below its priority sub-minimum first', () => {
    const groups = base.groups.map((g) => (g.key === 'skills' ? { ...g, belowSubminimum: { threshold: 8, achieved: 2 } } : { ...g, belowSubminimum: null }))
    expect(heroSentence({ ...base, groups })).toEqual({ lead: 'Level 4.', reason: 'Skills development is holding you back.' })
  })
  it('otherwise names the area with the most points still to win', () => {
    const groups = base.groups.map((g) => ({ ...g, belowSubminimum: null, shortfall: g.key === 'mc' ? 9 : 1 }))
    expect(heroSentence({ ...base, groups }).reason).toBe('Management control has the most points to win.')
  })
  it('says "so far" and how many areas are missing when the level is not final', () => {
    expect(heroSentence({ ...base, isFinal: false, level: 'Level 6', unfinishedAreas: 3 })).toEqual({ lead: 'Level 6 so far.', reason: '3\u00a0areas still need figures.' })
  })
  it('makes no claim when there is nothing to win', () => {
    const groups = base.groups.map((g) => ({ ...g, belowSubminimum: null, shortfall: 0 }))
    expect(heroSentence({ ...base, groups }).reason).toBeNull()
  })
})

describe('rendering', () => {
  it('the bar: one segment per area with points, a track for the rest, every figure also in text', () => {
    const html = renderToStaticMarkup(
      <TooltipProvider>
        <ElementBar view={view} />
      </TooltipProvider>,
    )
    const segments = view.groups.filter((g) => g.earned > 0).length
    expect(html.match(/<button[^>]*aria-label="[^"]+: [0-9.]+ of [0-9.]+"/g)?.length).toBe(segments)
    for (const group of view.groups) expect(html).toContain(group.label)
    expect(html).toContain(`of ${view.available} points`)
    expect(html).not.toMatch(/#[0-9a-f]{6}|bg-(slate|gray|teal|green)-\d/i)
  })

  it('the hero: label, sentence, score out of the maximum, level, and no delta without a previous result', () => {
    const html = renderToStaticMarkup(<TooltipProvider><ScoreHero view={view} company="Golden Sample" year={2026} /></TooltipProvider>)
    expect(html).toContain('B-BBEE score · Golden Sample · 2026')
    // Number Flow renders the real value on the server: no blank first frame.
    expect(html).toContain(view.total.toFixed(2))
    expect(html).toContain(`of ${view.available}`)
    expect(html).toContain(view.level)
    expect(html).not.toContain('since last calculated')
  })

  it('the hero shows a delta only when there is a previous total', () => {
    const html = renderToStaticMarkup(<TooltipProvider><ScoreHero view={view} company="G" year={null} previousTotal={view.total - 6} /></TooltipProvider>)
    expect(html).toContain('+6.00 since last calculated')
  })
})
