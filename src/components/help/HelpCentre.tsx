'use client'

import { useMemo, useState, useSyncExternalStore, type ReactNode } from 'react'
import Link from 'next/link'
import { ArrowRight, CheckCircle2, Compass, PlayCircle, Rocket, Search } from 'lucide-react'
import { FAQS, PAGE_HELP_LIST, TOURS, staticHref, type HelpProblem, type HelpTopic } from '@/content/page-help'
import { GLOSSARY } from '@/lib/glossary'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { SectionTitle } from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { checklistDismissed, setChecklistDismissed, subscribeHelpStorage, tourFinished } from './help-storage'
import { useHelp } from './HelpProvider'

const TOPICS: HelpTopic[] = ['Getting started', 'Full scorecard', 'Scorecard areas', 'Procurement', 'Client workspace', 'Account']
const TOUR_ICON: Record<string, typeof Compass> = { 'first-time-setup': Rocket, 'full-platform': Compass }

const GLOSSARY_SORTED = Object.entries(GLOSSARY)
  .map(([key, entry]) => ({ key, ...entry }))
  .sort((a, b) => a.term.localeCompare(b.term, 'en'))

/** Every question: the general FAQs plus each page's own, grouped by topic. */
const ALL_QUESTIONS: Array<HelpProblem & { topic: HelpTopic; page?: string }> = [
  ...FAQS,
  ...PAGE_HELP_LIST.flatMap((entry) => entry.problems.map((p) => ({ ...p, topic: entry.topic, page: entry.title }))),
]

const has = (q: string, ...texts: Array<string | undefined>) => texts.some((t) => t?.toLowerCase().includes(q))

function useStored<T>(read: () => T, fallback: T) {
  return useSyncExternalStore(subscribeHelpStorage, read, () => fallback)
}

/** The Help centre (/settings/help): search, tours, guides by page, glossary A–Z, questions by topic. */
export function HelpCentre({ steps }: { steps: ReactNode }) {
  const help = useHelp()
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()
  const hidden = useStored(checklistDismissed, false)

  const results = useMemo(() => {
    if (q.length < 2) return null
    return {
      pages: PAGE_HELP_LIST.filter((e) => has(q, e.title, e.purpose, ...e.steps.flatMap((s) => [s.title, s.body]))),
      words: GLOSSARY_SORTED.filter((g) => has(q, g.term, g.meaning, g.example)),
      questions: ALL_QUESTIONS.filter((p) => has(q, p.q, p.a)),
    }
  }, [q])

  return (
    <div className="space-y-10">
      <div data-help="help-search">
        <label htmlFor="help-search" className="sr-only">
          Search help
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-icon" aria-hidden />
          <input
            id="help-search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search help, B-BBEE words and questions"
            className="h-11 w-full rounded-control border border-control-line bg-surface pl-9 pr-3 text-body text-ink placeholder:text-subtle focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25"
          />
        </div>
        {results ? <SearchResults results={results} onShowMe={(id, path) => help.startTour(id, path)} /> : null}
      </div>

      {results ? null : (
        <>
          <section aria-labelledby="hc-tours" data-help="help-tours">
            <SectionTitle as="h2" id="hc-tours">
              Guided tours
            </SectionTitle>
            <p className="mt-1 text-meta text-label">They move between pages for you. Esc or Skip ends a tour at any point.</p>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">
              {TOURS.map((tour) => (
                <TourCard key={tour.id} id={tour.id} title={tour.title} description={tour.description} steps={tour.steps.length} onStart={() => help.startTour(tour.id)} />
              ))}
            </ul>
          </section>

          <section aria-labelledby="hc-steps">
            <SectionTitle as="h2" id="hc-steps">
              From start to finished scorecard
            </SectionTitle>
            <div className="mt-4">{steps}</div>
          </section>

          <section aria-labelledby="hc-guides" data-help="help-guides">
            <SectionTitle as="h2" id="hc-guides">
              Guides by page
            </SectionTitle>
            <p className="mt-1 text-meta text-label">
              Every page also has this help behind its <span className="font-medium text-ink">?</span> button. Pages for one scorecard open from that
              scorecard.
            </p>
            {TOPICS.map((topic) => {
              const entries = PAGE_HELP_LIST.filter((e) => e.topic === topic)
              if (entries.length === 0) return null
              return (
                <div key={topic} className="mt-6">
                  <h3 className="text-caps font-semibold uppercase tracking-[0.08em] text-label">{topic}</h3>
                  <ul className="mt-3 grid gap-3 sm:grid-cols-2">
                    {entries.map((entry) => (
                      <GuideCard key={entry.key} entry={entry} onShowMe={() => help.startTour(`page:${entry.key}`)} />
                    ))}
                  </ul>
                </div>
              )
            })}
          </section>

          <section aria-labelledby="hc-glossary" data-help="help-glossary">
            <SectionTitle as="h2" id="hc-glossary">
              B-BBEE words, A to Z
            </SectionTitle>
            <dl className="mt-3 divide-y divide-divider">
              {GLOSSARY_SORTED.map((g) => (
                <div key={g.key} id={`term-${g.key}`} className="py-3">
                  <dt className="text-body font-medium text-ink">{g.term}</dt>
                  <dd className="text-meta text-label">{g.meaning}</dd>
                  <dd className="mt-0.5 text-meta text-subtle">For example: {g.example}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="hc-faqs" data-help="help-faqs">
            <SectionTitle as="h2" id="hc-faqs">
              Common questions
            </SectionTitle>
            {TOPICS.map((topic) => {
              const items = ALL_QUESTIONS.filter((p) => p.topic === topic)
              if (items.length === 0) return null
              return (
                <div key={topic} className="mt-5">
                  <h3 className="text-caps font-semibold uppercase tracking-[0.08em] text-label">{topic}</h3>
                  <div className="mt-1 divide-y divide-divider">
                    {items.map((p) => (
                      <Question key={`${p.page ?? 'faq'}-${p.id}`} problem={p} />
                    ))}
                  </div>
                </div>
              )
            })}
          </section>

          {hidden ? (
            <p className="text-meta text-label">
              You hid the setup checklist on Home.{' '}
              <button type="button" onClick={() => setChecklistDismissed(false)} className="font-medium text-teal hover:underline">
                Show it again
              </button>
            </p>
          ) : null}
        </>
      )}
    </div>
  )
}

function TourCard(args: { id: string; title: string; description: string; steps: number; onStart: () => void }) {
  const done = useStored(() => tourFinished(args.id), false)
  const Icon = TOUR_ICON[args.id] ?? Compass
  return (
    <li className="flex flex-col rounded-card border border-line bg-surface p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-control bg-wash text-teal">
          <Icon className="h-4 w-4" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-body font-medium text-ink">{args.title}</p>
          <p className="mt-0.5 text-meta text-label">{args.description}</p>
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="text-meta text-label">
          {args.steps} steps
          {done ? (
            <span className="ml-2 inline-flex items-center gap-1 text-success">
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden /> Seen
            </span>
          ) : null}
        </span>
        <button type="button" onClick={args.onStart} data-help-start-tour={args.id} className={buttonStyles({ variant: done ? 'secondary' : 'primary', size: 'sm' })}>
          <PlayCircle aria-hidden /> {done ? 'Run again' : 'Start'}
        </button>
      </div>
    </li>
  )
}

function GuideCard({ entry, onShowMe }: { entry: (typeof PAGE_HELP_LIST)[number]; onShowMe: () => void }) {
  const href = staticHref(entry)
  return (
    <li className="flex flex-col rounded-card border border-line bg-surface p-4" data-guide={entry.key}>
      <p className="text-body font-medium text-ink">{entry.title}</p>
      <p className="mt-0.5 flex-1 text-meta text-label">{entry.purpose}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {href ? (
          <>
            <Link href={href} className={buttonStyles({ variant: 'secondary', size: 'sm' })}>
              Open page
            </Link>
            <button type="button" onClick={onShowMe} className={buttonStyles({ variant: 'plain', size: 'sm' })}>
              <PlayCircle aria-hidden /> Show me
            </button>
          </>
        ) : (
          <span className="text-meta text-subtle">Open a scorecard, then press ? there for this page’s tour.</span>
        )}
      </div>
    </li>
  )
}

function Question({ problem }: { problem: HelpProblem & { page?: string } }) {
  return (
    <details className="group py-1">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-3 rounded-control py-2 text-body font-medium text-ink outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25 [&::-webkit-details-marker]:hidden">
        <span>
          {problem.q}
          {problem.page ? <span className="ml-2 text-meta font-normal text-subtle">{problem.page}</span> : null}
        </span>
        <ArrowRight className="mt-1 h-4 w-4 shrink-0 text-icon transition-transform duration-150 group-open:rotate-90" aria-hidden />
      </summary>
      <div className="pb-2 text-meta text-label">
        <p>{problem.a}</p>
        {problem.link ? (
          <Link href={problem.link.href} className="mt-1 inline-flex font-medium text-teal hover:underline">
            {problem.link.label}
          </Link>
        ) : null}
      </div>
    </details>
  )
}

function SearchResults({
  results,
  onShowMe,
}: {
  results: { pages: typeof PAGE_HELP_LIST; words: typeof GLOSSARY_SORTED; questions: typeof ALL_QUESTIONS }
  onShowMe: (id: string, path?: string) => void
}) {
  const count = results.pages.length + results.words.length + results.questions.length
  return (
    <div className="mt-6 space-y-8" aria-live="polite">
      <p className="text-meta text-label">{count === 0 ? 'Nothing found. Try a shorter word, such as “level” or “supplier”.' : `${count} found`}</p>
      {results.pages.length > 0 ? (
        <section>
          <h3 className="text-caps font-semibold uppercase tracking-[0.08em] text-label">Pages</h3>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2">
            {results.pages.map((entry) => (
              <GuideCard key={entry.key} entry={entry} onShowMe={() => onShowMe(`page:${entry.key}`)} />
            ))}
          </ul>
        </section>
      ) : null}
      {results.words.length > 0 ? (
        <section>
          <h3 className="text-caps font-semibold uppercase tracking-[0.08em] text-label">B-BBEE words</h3>
          <dl className="mt-2 divide-y divide-divider">
            {results.words.map((g) => (
              <div key={g.key} className="py-3">
                <dt className="text-body font-medium text-ink">{g.term}</dt>
                <dd className="text-meta text-label">{g.meaning}</dd>
                <dd className="mt-0.5 text-meta text-subtle">For example: {g.example}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      {results.questions.length > 0 ? (
        <section>
          <h3 className="text-caps font-semibold uppercase tracking-[0.08em] text-label">Questions</h3>
          <div className={cn('mt-1 divide-y divide-divider')}>
            {results.questions.map((p) => (
              <Question key={`${p.page ?? 'faq'}-${p.id}`} problem={p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  )
}
