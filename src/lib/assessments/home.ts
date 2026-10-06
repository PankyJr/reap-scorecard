/**
 * One row per company on Home: its size, where it stands (a final level, or
 * "In progress" with how many of the seven areas are done), when it last
 * changed, and the one thing to press. Areas are counted from the engine's
 * preview, exactly as the scorecard's own checklist counts them.
 */
import type { GenericScorecardCalculation } from '@/lib/scorecard/generic'
import { describeCompanySize } from '@/lib/company/size'

export type HomeTone = 'ok' | 'info' | 'warn' | 'neutral'

export type HomeCompanyRow = {
  id: string
  name: string
  size: string | null
  status: string
  tone: HomeTone
  /** "5 of 7 areas done", while a full scorecard is in progress. */
  progress: string | null
  updatedAt: string | null
  action: { label: string; href: string }
  /** Something is wrong or waiting: an area below its minimum, evidence to confirm, or changed since calculated. */
  needsAttention: boolean
  attentionReason: string | null
}

export type HomeFullScorecard = {
  id: string
  updated_at: string | null
  needs_recalculation: boolean | null
  overall_result_snapshot: unknown
  preview: GenericScorecardCalculation | null
}

export type HomeProcurement = { id: string; created_at: string | null }

const SIZE_WORD = { eme: 'EME', qse: 'QSE', generic: 'Large company' } as const

function latest(...dates: Array<string | null | undefined>): string | null {
  return dates.filter((d): d is string => Boolean(d)).sort().at(-1) ?? null
}

export function homeCompanyRow(args: {
  company: { id: string; name: string; annual_turnover?: number | string | null; black_ownership_percentage?: number | string | null; updated_at?: string | null }
  full: HomeFullScorecard | null
  procurement: HomeProcurement | null
}): HomeCompanyRow {
  const { company, full, procurement } = args
  const size = describeCompanySize({
    turnover: company.annual_turnover == null ? null : Number(company.annual_turnover),
    blackOwnershipPercent: company.black_ownership_percentage == null ? null : Number(company.black_ownership_percentage),
  }).size
  const base = {
    id: company.id,
    name: company.name,
    size: size ? SIZE_WORD[size] : null,
    updatedAt: latest(company.updated_at, full?.updated_at, procurement?.created_at),
  }

  if (full) {
    const gen = `/scorecards/calculator/${full.id}/generic`
    const stored = full.overall_result_snapshot as GenericScorecardCalculation | null
    const preview = full.preview
    const failed = preview?.prioritySubminimums.some((s) => s.evaluated && s.passed === false) ?? false
    const waiting = preview?.elements.some((e) => e.status === 'pending_confirmation') ?? false
    const changed = Boolean(stored) && Boolean(full.needs_recalculation)
    const attentionReason = changed
      ? 'Changed since it was calculated'
      : failed
        ? 'An area is below its minimum'
        : waiting
          ? 'Evidence is waiting to be confirmed'
          : null

    if (stored && stored.readiness?.complete && !full.needs_recalculation) {
      return {
        ...base,
        status: stored.finalLevel.level,
        tone: 'ok',
        progress: null,
        action: { label: 'View result', href: `${gen}/result` },
        needsAttention: Boolean(attentionReason),
        attentionReason,
      }
    }
    const done = preview?.elements.filter((e) => e.status === 'scored').length ?? 0
    const total = preview?.elements.length ?? 7
    return {
      ...base,
      status: 'In progress',
      tone: 'info',
      progress: `${done} of ${total} areas done`,
      action: { label: 'Continue', href: gen },
      needsAttention: Boolean(attentionReason),
      attentionReason,
    }
  }

  if (procurement) {
    return {
      ...base,
      status: 'Procurement only',
      tone: 'neutral',
      progress: null,
      action: { label: 'View result', href: `/procurement/assessments/${procurement.id}` },
      needsAttention: false,
      attentionReason: null,
    }
  }

  return {
    ...base,
    status: 'Not started',
    tone: 'neutral',
    progress: null,
    action: { label: 'Continue', href: `/start?companyId=${company.id}` },
    needsAttention: false,
    attentionReason: null,
  }
}
