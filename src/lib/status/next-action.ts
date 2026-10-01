import type { AssessmentRow } from '@/lib/assessments/rows'

export type NextAction = {
  title: string
  body: string
  href: string
  button: string
}

/**
 * The single next thing to do, shown at the top of Home.
 * Order: no company yet; an unfinished scorecard (most recent first);
 * a company with nothing started; otherwise nothing is waiting.
 */
export function pickNextAction(args: {
  companies: Array<{ id: string; name: string }>
  rows: AssessmentRow[]
}): NextAction {
  if (args.companies.length === 0) {
    return {
      title: 'Start your first scorecard',
      body: 'Choose a full B-BBEE scorecard or procurement only, then add the company it is for.',
      href: '/start',
      button: 'Start',
    }
  }

  const unfinished = args.rows
    .filter((row) => !row.status.finished)
    .sort((a, b) => (b.updatedAt ?? '').localeCompare(a.updatedAt ?? ''))[0]
  if (unfinished) {
    return {
      title: `${unfinished.title} for ${unfinished.companyName}`,
      body: unfinished.status.explain,
      href: unfinished.status.href,
      button: unfinished.status.next,
    }
  }

  const started = new Set(args.rows.map((row) => row.companyId))
  const idle = args.companies.find((company) => !started.has(company.id))
  if (idle) {
    return {
      title: `Start a scorecard for ${idle.name}`,
      body: 'This company has no scorecards yet.',
      href: `/start?companyId=${idle.id}`,
      button: 'Start',
    }
  }

  return {
    title: 'Everything is up to date',
    body: 'All your scorecards are finished. Start a new one when you are ready.',
    href: '/start',
    button: 'Start new',
  }
}
