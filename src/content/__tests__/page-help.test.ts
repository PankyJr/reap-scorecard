import { execSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'
import { FAQS, PAGE_HELP, PAGE_HELP_LIST, TOURS, helpForPath } from '@/content/page-help'
import { GLOSSARY } from '@/lib/glossary'

/** Every data-help value written in the app's source (literal strings only). */
function markersInSource(): Set<string> {
  const out = execSync(`grep -rhoE "(data-help|helpId)=\\"[^\\"]+\\"" src || true`, { encoding: 'utf8' })
  const names = new Set<string>()
  for (const line of out.split('\n')) {
    const m = line.match(/="([^"]+)"/)
    if (m) for (const n of m[1].split(/\s+/)) names.add(n)
  }
  // Markers set from props or constants (helpId={…}, data-help={…}) are found by name below.
  const dynamic = execSync(`grep -rhoE "['\\\`][a-z0-9-]+['\\\`]" src/app src/components || true`, { encoding: 'utf8' })
  for (const line of dynamic.split('\n')) {
    const m = line.match(/^['`]([a-z0-9-]+)['`]$/)
    if (m) names.add(m[1])
  }
  return names
}

/** Problem ids that "Why?" links in the source point at (literal ids only). */
function whyIdsInSource(): string[] {
  const out = execSync(`grep -rhoE "problem=\\"[a-z0-9-]+\\"" src/app src/components || true`, { encoding: 'utf8' })
  return [...new Set(out.split('\n').map((l) => l.match(/problem="([^"]+)"/)?.[1]).filter((x): x is string => Boolean(x)))]
}

const LEGACY = (key: string) => key.startsWith('legacy-')

describe('page help content', () => {
  it('every page has a purpose, 3–6 steps and page-specific questions', () => {
    for (const entry of PAGE_HELP_LIST) {
      expect(entry.purpose.length, entry.key).toBeGreaterThan(20)
      expect(entry.steps.length, `${entry.key} steps`).toBeGreaterThanOrEqual(3)
      expect(entry.steps.length, `${entry.key} steps`).toBeLessThanOrEqual(6)
      if (!LEGACY(entry.key)) {
        expect(entry.problems.length, `${entry.key} questions`).toBeGreaterThanOrEqual(3)
        expect(entry.problems.length, `${entry.key} questions`).toBeLessThanOrEqual(5)
      }
    }
  })

  it('question ids are unique within a page and terms exist in the glossary', () => {
    for (const entry of PAGE_HELP_LIST) {
      const ids = entry.problems.map((p) => p.id)
      expect(new Set(ids).size, entry.key).toBe(ids.length)
      for (const t of entry.terms) expect(GLOSSARY[t], `${entry.key}: ${t}`).toBeDefined()
    }
    const faqIds = FAQS.map((f) => f.id)
    expect(new Set(faqIds).size).toBe(faqIds.length)
  })

  it('routes are unique and each route finds its own entry', () => {
    const routes = PAGE_HELP_LIST.map((e) => e.route)
    expect(new Set(routes).size).toBe(routes.length)
    for (const entry of PAGE_HELP_LIST) {
      const sample = entry.route.replace(/\[[^\]]+\]/g, '00000000-0000-0000-0000-000000000000')
      expect(helpForPath(sample)?.route, entry.key).toBe(entry.route)
    }
    // A static route wins over a dynamic one.
    expect(helpForPath('/companies/new')?.route).toBe('/companies/new')
  })

  it('every area page answers its own "Why?" questions', () => {
    for (const key of [
      'area-ownership',
      'area-management-control',
      'area-skills-development',
      'area-procurement',
      'area-supplier-development',
      'area-enterprise-development',
      'area-socio-economic-development',
    ] as const) {
      const ids = PAGE_HELP[key].problems.map((p) => p.id)
      expect(ids, key).toContain(`${key}-zero`)
    }
    for (const key of ['area-ownership', 'area-skills-development', 'area-procurement', 'area-supplier-development', 'area-enterprise-development'] as const) {
      expect(PAGE_HELP[key].problems.map((p) => p.id), key).toContain(`${key}-below-minimum`)
    }
  })

  it('every literal "Why?" link points at a question that exists', () => {
    const all = new Set(PAGE_HELP_LIST.flatMap((e) => e.problems.map((p) => p.id)))
    for (const id of whyIdsInSource()) expect(all.has(id), id).toBe(true)
  })

  it('every step and tour step targets a data-help marker that exists in the code', () => {
    const markers = markersInSource()
    for (const entry of PAGE_HELP_LIST) for (const s of entry.steps) expect(markers.has(s.target), `${entry.key}: ${s.target}`).toBe(true)
    for (const tour of TOURS) for (const s of tour.steps) expect(markers.has(s.target), `${tour.id}: ${s.target}`).toBe(true)
  })

  it('multi-page tours only visit pages that have help, and never a page with an id in it', () => {
    for (const tour of TOURS) {
      expect(tour.steps.length).toBeGreaterThanOrEqual(3)
      for (const s of tour.steps) {
        expect(s.path.includes('['), `${tour.id}: ${s.path}`).toBe(false)
        expect(helpForPath(s.path), `${tour.id}: ${s.path}`).not.toBeNull()
      }
    }
  })

  it('every glossary word has a meaning and an example', () => {
    for (const [key, g] of Object.entries(GLOSSARY)) {
      expect(g.meaning.length, key).toBeGreaterThan(20)
      expect(g.example.length, key).toBeGreaterThan(10)
    }
  })
})
