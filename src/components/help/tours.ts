import { PAGE_HELP, getTour, staticHref, type PageKey, type TourStepDef } from '@/content/page-help'

/** One tour's title and steps, each with the route it runs on. */
export function resolveTour(id: string, path?: string): { title: string; steps: TourStepDef[] } | null {
  if (id.startsWith('page:')) {
    const key = id.slice(5) as PageKey
    const entry = PAGE_HELP[key]
    if (!entry) return null
    const where = path ?? staticHref(entry)
    if (!where) return null
    return { title: `${entry.title}: show me`, steps: entry.steps.map((step) => ({ ...step, path: where })) }
  }
  const tour = getTour(id)
  return tour ? { title: tour.title, steps: tour.steps } : null
}

