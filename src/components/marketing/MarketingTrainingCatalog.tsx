import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { cn } from '@/components/marketing/cn'
import {
  marketingBrandBgClass,
  marketingBrandBgHoverClass,
  marketingBrandBorderClass,
  marketingBrandTextClass,
  marketingBrandTintBgClass,
  marketingBrandTintBgHoverClass,
  marketingDarkBgClass,
  marketingDarkBorderClass,
  marketingDarkTextClass,
  marketingDarkTintBgClass,
  marketingDarkTintBgHoverClass,
  marketingSectionContainerClass,
} from '@/components/marketing/marketingLayout'
import {
  trainingCategories,
  TRAINING_PROGRAM_ICONS,
} from '@/components/marketing/marketingTrainingData'

/** brand = footer teal; dark = slate CTA panels */
type TrainingAccent = 'brand' | 'dark'

const trainingAccentStyles: Record<
  TrainingAccent,
  {
    sectionIndex: string
    iconBox: string
    programIndex: string
    sectionRule: string
    listAccent: string
    formatLabel: string
    ctaHover: string
  }
> = {
  brand: {
    sectionIndex: cn('font-mono text-sm font-semibold tabular-nums', marketingBrandTextClass),
    iconBox: cn('border', marketingBrandTintBgClass, marketingBrandBorderClass, marketingBrandTextClass),
    programIndex: cn(
      'font-mono text-xs font-medium tabular-nums text-[#05363A]/80 sm:text-sm',
    ),
    sectionRule: 'border-l-4 border-[#05363A]',
    listAccent: 'border-t-2 border-t-[#05363A]',
    formatLabel: marketingBrandTextClass,
    ctaHover: 'group-hover:text-[#05363A]',
  },
  dark: {
    sectionIndex: cn('font-mono text-sm font-semibold tabular-nums', marketingDarkTextClass),
    iconBox: cn('border', marketingDarkTintBgClass, marketingDarkBorderClass, marketingDarkTextClass),
    programIndex: cn(
      'font-mono text-xs font-medium tabular-nums text-slate-900/80 sm:text-sm',
    ),
    sectionRule: cn('border-l-4', marketingDarkBorderClass),
    listAccent: cn('border-t-2', 'border-t-slate-900'),
    formatLabel: marketingDarkTextClass,
    ctaHover: 'group-hover:text-slate-900',
  },
}

function ProgramIndex({ n, accent }: { n: number; accent: TrainingAccent }) {
  return <span className={trainingAccentStyles[accent].programIndex}>{String(n).padStart(2, '0')}</span>
}

function SectionIndex({ n, accent }: { n: number; accent: TrainingAccent }) {
  return (
    <p className={trainingAccentStyles[accent].sectionIndex}>{String(n).padStart(2, '0')}</p>
  )
}

function ProgramRow({
  program,
  index,
  isLast,
  accent,
}: {
  program: (typeof trainingCategories)[0]['programs'][0]
  index: number
  isLast: boolean
  accent: TrainingAccent
}) {
  const Icon = TRAINING_PROGRAM_ICONS[program.slug]
  const { iconBox, ctaHover } = trainingAccentStyles[accent]
  const rowHover =
    accent === 'brand' ? marketingBrandTintBgHoverClass : marketingDarkTintBgHoverClass

  return (
    <Link
      href={`/contact?intent=training&program=${encodeURIComponent(program.slug)}`}
      className={cn(
        'group grid gap-4 px-6 py-8 transition-colors sm:grid-cols-[3rem_1fr_auto] sm:items-start sm:gap-6 sm:px-8 sm:py-9 lg:px-10',
        rowHover,
        !isLast && 'border-b border-slate-200',
      )}
    >
      <ProgramIndex n={index} accent={accent} />

      <div className="min-w-0 sm:col-span-1">
        <div className="flex flex-wrap items-center gap-3">
          {Icon ? (
            <span
              className={cn(
                'inline-flex h-8 w-8 items-center justify-center border bg-white',
                iconBox,
              )}
            >
              <Icon className="h-4 w-4" strokeWidth={1.25} aria-hidden />
            </span>
          ) : null}
          <h3 className="text-lg font-semibold tracking-tight text-slate-900 sm:text-xl">
            {program.title}
          </h3>
        </div>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600 sm:text-[15px]">
          {program.description}
        </p>
        <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
          <div>
            <dt className="inline font-semibold uppercase tracking-wide text-slate-400">Format </dt>
            <dd className="inline text-slate-700">{program.format}</dd>
          </div>
          <div>
            <dt className="inline font-semibold uppercase tracking-wide text-slate-400">Audience </dt>
            <dd className="inline text-slate-700">{program.audience}</dd>
          </div>
        </dl>
      </div>

      <span
        className={cn(
          'inline-flex items-center gap-1.5 self-start text-sm font-medium text-slate-900 transition-colors sm:pt-1',
          ctaHover,
        )}
      >
        Enquire
        <ArrowRight
          className="h-4 w-4 transition group-hover:translate-x-0.5"
          strokeWidth={1.5}
          aria-hidden
        />
      </span>
    </Link>
  )
}

function WorkshopCard({
  program,
  index,
  accent,
}: {
  program: (typeof trainingCategories)[1]['programs'][0]
  index: number
  accent: TrainingAccent
}) {
  const Icon = TRAINING_PROGRAM_ICONS[program.slug]
  const { iconBox, formatLabel, ctaHover } = trainingAccentStyles[accent]
  const cardHover =
    accent === 'brand' ? marketingBrandTintBgHoverClass : marketingDarkTintBgHoverClass

  return (
    <Link
      href={`/contact?intent=training&program=${encodeURIComponent(program.slug)}`}
      className={cn(
        'group flex h-full min-h-[320px] flex-col border border-slate-200 bg-white p-8 transition-colors sm:p-10',
        cardHover,
      )}
    >
      <ProgramIndex n={index} accent={accent} />
      {Icon ? (
        <span
          className={cn(
            'mt-6 inline-flex h-9 w-9 items-center justify-center border bg-white',
            iconBox,
          )}
        >
          <Icon className="h-4 w-4" strokeWidth={1.25} aria-hidden />
        </span>
      ) : null}
      <p
        className={cn(
          'mt-6 text-[11px] font-semibold uppercase tracking-[0.16em]',
          formatLabel,
        )}
      >
        {program.format}
      </p>
      <h3 className="mt-2 text-xl font-semibold tracking-tight text-slate-900">{program.title}</h3>
      <p className="mt-4 flex-1 text-sm leading-relaxed text-slate-600">{program.description}</p>
      <p className="mt-4 text-xs text-slate-500">
        <span className="font-semibold uppercase tracking-wide text-slate-400">Audience </span>
        {program.audience}
      </p>
      <span
        className={cn(
          'mt-8 inline-flex items-center gap-1.5 text-sm font-medium text-slate-900 transition-colors',
          ctaHover,
        )}
      >
        Request programme
        <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" strokeWidth={1.5} aria-hidden />
      </span>
    </Link>
  )
}

export default function MarketingTrainingCatalog() {
  const [coreCategory, workshopsCategory] = trainingCategories

  return (
    <>
      <section className="border-b border-[#05363A]/15 bg-gradient-to-b from-[#05363A]/8 via-slate-50 to-slate-50">
        <div className={marketingSectionContainerClass}>
          <div className="flex flex-col gap-6 py-10 sm:flex-row sm:items-end sm:justify-between sm:py-12">
            <div className="max-w-2xl">
              <p
                className={cn(
                  'text-[11px] font-semibold uppercase tracking-[0.2em]',
                  marketingBrandTextClass,
                )}
              >
                Program catalogue
              </p>
              <p className="mt-3 text-base leading-relaxed text-slate-600 sm:text-lg">
                Executive education built for South African organisations—grounded in the Codes,
                structured for implementation, and designed for teams who own the scorecard.
              </p>
            </div>
            <nav
              className="flex flex-wrap gap-2"
              aria-label="Jump to training categories"
            >
              {trainingCategories.map((cat) => (
                <a
                  key={cat.id}
                  href={`#${cat.id}`}
                  className="border border-[#05363A]/20 bg-white px-4 py-2 text-sm font-medium text-slate-800 transition hover:border-[#05363A] hover:bg-[#05363A]/5 hover:text-[#05363A]"
                >
                  {cat.name}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </section>

      {coreCategory ? (
        <section id={coreCategory.id} className="scroll-mt-28 bg-white">
          <div className={marketingSectionContainerClass}>
            <div className="grid gap-10 py-16 lg:grid-cols-12 lg:gap-16 lg:py-20">
              <header
                className={cn(
                  'lg:col-span-4 lg:sticky lg:top-28 lg:self-start pl-6',
                  trainingAccentStyles.brand.sectionRule,
                )}
              >
                <SectionIndex n={1} accent="brand" />
                <h2 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-slate-900 md:text-[32px]">
                  {coreCategory.name}
                </h2>
                <p
                  id={`${coreCategory.id}-overview`}
                  className="mt-4 text-base leading-relaxed text-slate-600"
                >
                  {coreCategory.overview}
                </p>
                <p className="mt-6 text-sm text-slate-500">
                  <span
                    className={cn(
                      'mr-2 inline-block rounded-none px-2 py-0.5 text-xs font-semibold text-white',
                      marketingBrandBgClass,
                    )}
                  >
                    {coreCategory.programs.length}
                  </span>
                  programmes
                </p>
              </header>

              <div className="lg:col-span-8">
                <div
                  className={cn(
                    'overflow-hidden border border-slate-200',
                    trainingAccentStyles.brand.listAccent,
                  )}
                >
                  {coreCategory.programs.map((program, i) => (
                    <div key={program.slug} id={`program-${program.slug}`} className="scroll-mt-28">
                      <ProgramRow
                        program={program}
                        index={i + 1}
                        isLast={i === coreCategory.programs.length - 1}
                        accent="brand"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {workshopsCategory ? (
        <section
          id={workshopsCategory.id}
          className="scroll-mt-28 border-t border-slate-200 bg-gradient-to-b from-slate-100/60 to-slate-50"
        >
          <div className={marketingSectionContainerClass}>
            <div className="py-16 lg:py-20">
              <header
                className={cn('max-w-3xl pl-6', trainingAccentStyles.dark.sectionRule)}
              >
                <SectionIndex n={2} accent="dark" />
                <h2 className="mt-2 text-[28px] font-semibold leading-tight tracking-tight text-slate-900 md:text-[32px]">
                  {workshopsCategory.name}
                </h2>
                <p
                  id={`${workshopsCategory.id}-overview`}
                  className="mt-4 text-base leading-relaxed text-slate-600"
                >
                  {workshopsCategory.overview}
                </p>
              </header>

              <div
                className={cn(
                  'mt-10 grid gap-0 overflow-hidden border border-slate-200 sm:grid-cols-2 sm:divide-x sm:divide-slate-200',
                  trainingAccentStyles.dark.listAccent,
                )}
              >
                {workshopsCategory.programs.map((program, i) => (
                  <div key={program.slug} id={`program-${program.slug}`} className="scroll-mt-28">
                    <WorkshopCard program={program} index={i + 1} accent="dark" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-white pb-16 sm:pb-20 lg:pb-24">
        <div className={cn(marketingSectionContainerClass, 'pt-12 sm:pt-16 lg:pt-20')}>
          <div
            className={cn(
              'relative overflow-hidden border px-8 py-12 text-white sm:px-12 sm:py-14 lg:flex lg:items-center lg:justify-between lg:gap-12',
              'bg-gradient-to-br from-slate-900 via-slate-900 to-[#05363A]',
              marketingDarkBorderClass,
            )}
          >
            <div
              className="pointer-events-none absolute inset-y-0 right-0 w-1/3 bg-[#05363A]/30"
              aria-hidden
            />
            <div className="relative max-w-xl">
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Ready to build{' '}
                <span className="text-emerald-300">transformation capability?</span>
              </h2>
              <p className="mt-3 text-base leading-relaxed text-white/70">
                Book a workshop or tell us which programme fits your team—we&apos;ll shape format,
                timing, and outcomes around your context.
              </p>
            </div>
            <div className="relative mt-8 flex flex-col gap-3 sm:flex-row lg:mt-0 lg:flex-col lg:items-stretch">
              <Link
                href="/contact?intent=training"
                className={cn(
                  'inline-flex h-11 items-center justify-center border px-8 text-sm font-medium text-white transition',
                  marketingBrandBorderClass,
                  marketingBrandBgClass,
                  marketingBrandBgHoverClass,
                )}
              >
                Book a workshop
                <ArrowRight className="ml-2 h-4 w-4" strokeWidth={1.5} aria-hidden />
              </Link>
              <Link
                href="/contact?intent=training"
                className="inline-flex h-11 items-center justify-center border border-white/50 bg-transparent px-8 text-sm font-medium text-white transition hover:border-white hover:bg-white/10"
              >
                Request training
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
