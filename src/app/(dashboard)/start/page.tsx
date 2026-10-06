import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Building2, ClipboardList, FileBarChart2, Plus } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Panel'
import { Notice } from '@/components/ui/Notice'
import { EmptyState } from '@/components/ui/EmptyState'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { type FlowKind } from '@/lib/flows'
import { describeCompanySize } from '@/lib/company/size'

export const metadata = { title: 'What do you need?' }

type PageProps = {
  searchParams: Promise<{ type?: string; companyId?: string; mode?: string; created?: string }>
}

const CHOICES: Array<{
  kind: FlowKind
  title: string
  purpose: string
  covers: string
  useFor: string
  youNeed: string
  button: string
  icon: typeof FileBarChart2
}> = [
  {
    kind: 'full',
    title: 'Full B-BBEE scorecard',
    purpose: "Get your company's overall B-BBEE level.",
    covers: 'All seven areas of the scorecard.',
    useFor: 'A verification, a tender or a client request.',
    youNeed: 'Your scorecard workbook, or your figures.',
    button: 'Choose full scorecard',
    icon: FileBarChart2,
  },
  {
    kind: 'procurement',
    title: 'Procurement only',
    purpose: 'See how your spending with suppliers scores.',
    covers: 'One area: what you buy from B-BBEE suppliers.',
    useFor: 'Checking or improving your supplier spend.',
    youNeed: 'Your supplier list, what you spent with each, and their B-BBEE levels.',
    button: 'Choose procurement only',
    icon: ClipboardList,
  },
]

function nextHref(kind: FlowKind, companyId: string, modular = false) {
  return kind === 'full'
    ? `/scorecards/new?companyId=${companyId}${modular ? '&mode=modular' : ''}`
    : `/procurement/assessments/new?companyId=${companyId}`
}

/**
 * "What do you need?": the one starting point. Asks for the company first
 * (adding one goes straight back here), then offers the two kinds of work in
 * the same layout. One click picks.
 */
export default async function StartPage({ searchParams }: PageProps) {
  const params = await searchParams
  const modular = params.mode === 'modular'
  const kind: FlowKind | null = params.type === 'full' || params.type === 'procurement' ? params.type : null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, annual_turnover, black_ownership_percentage')
    .eq('owner_id', user.id)
    .order('name')
  const list = companies ?? []
  const company = params.companyId ? list.find((c) => c.id === params.companyId) ?? null : null

  // An older link that already says which kind and which company: carry on.
  if (kind && company) redirect(nextHref(kind, company.id, modular))

  if (!company) {
    const addHref = `/companies/new?next=${encodeURIComponent(`/start${kind ? `?type=${kind}` : ''}`)}`
    return (
      <div className="space-y-6">
        <PageHeader
          crumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Start new' }]}
          title="Which company is it for?"
          description="Everything you work out is saved under a company."
        />
        <Panel>
          {list.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-6 w-6" aria-hidden />}
              title="Add your first company"
              action={
                <Link href="/companies/new" className={buttonStyles({ variant: 'primary' })}>
                  <Plus className="h-4 w-4" aria-hidden /> Add your first company
                </Link>
              }
            >
              Five details: name, industry, financial year end, turnover and black ownership.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line rounded-control border border-line">
              {list.map((c) => (
                <li key={c.id}>
                  <Link
                    href={kind ? nextHref(kind, c.id, modular) : `/start?companyId=${c.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 text-base font-medium text-ink hover:bg-brand-soft"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Building2 className="h-5 w-5 shrink-0 text-faint" aria-hidden />
                      <span className="truncate">{c.name}</span>
                    </span>
                    <span className="shrink-0 text-[15px] font-semibold text-brand">Choose</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link href={addHref} className="flex items-center gap-3 px-4 py-3.5 text-base font-semibold text-brand hover:bg-brand-soft">
                  <Plus className="h-5 w-5" aria-hidden /> Add a company
                </Link>
              </li>
            </ul>
          )}
        </Panel>
      </div>
    )
  }

  const size = describeCompanySize({
    turnover: company.annual_turnover == null ? null : Number(company.annual_turnover),
    blackOwnershipPercent: company.black_ownership_percentage == null ? null : Number(company.black_ownership_percentage),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[
          { label: 'Home', href: '/dashboard' },
          { label: company.name, href: `/companies/${company.id}` },
          { label: 'What do you need?' },
        ]}
        title="What do you need?"
        description={`For ${company.name}. You can always do the other one later.`}
      />

      {params.created === '1' ? <Notice tone="ok">{company.name} is saved.</Notice> : null}

      {size.size ? (
        <div className="space-y-3">
          <p className="text-[15px] text-ink">{size.headline}</p>
          {size.automaticLevel ? (
            <Notice tone="ok" title="You may not need a full scorecard">
              {size.automaticLevel.reason} Confirm with your verification agency.
            </Notice>
          ) : null}
          {size.limitation ? <Notice tone="warn">{size.limitation}</Notice> : null}
        </div>
      ) : null}

      <ul className="grid gap-4 md:grid-cols-2">
        {CHOICES.map((choice) => {
          const Icon = choice.icon
          return (
            <li key={choice.kind}>
              <Link
                href={nextHref(choice.kind, company.id, modular)}
                className="flex h-full flex-col rounded-card border border-line bg-surface p-5 transition-colors hover:border-brand focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/30 sm:p-6"
              >
                <span className="flex items-start gap-4">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-brand-soft text-brand">
                    <Icon className="h-6 w-6" aria-hidden />
                  </span>
                  <span className="min-w-0 space-y-1">
                    <span className="block text-lg font-semibold text-ink">{choice.title}</span>
                    <span className="block text-base text-ink">{choice.purpose}</span>
                  </span>
                </span>
                <span className="mt-4 block flex-1 space-y-2 border-t border-line pt-4 text-[15px]">
                  <span className="block">
                    <span className="font-semibold text-ink">Covers: </span>
                    <span className="text-muted">{choice.covers}</span>
                  </span>
                  <span className="block">
                    <span className="font-semibold text-ink">Use it for: </span>
                    <span className="text-muted">{choice.useFor}</span>
                  </span>
                  <span className="block">
                    <span className="font-semibold text-ink">You need: </span>
                    <span className="text-muted">{choice.youNeed}</span>
                  </span>
                </span>
                <span className={buttonStyles({ variant: 'primary', className: 'mt-5 self-start' })}>{choice.button}</span>
              </Link>
            </li>
          )
        })}
      </ul>

      <p className="text-[15px] text-muted">
        <strong className="text-ink">Not sure?</strong> Start with procurement. You can turn it into a full scorecard
        later and keep everything you&apos;ve entered.
      </p>
    </div>
  )
}
