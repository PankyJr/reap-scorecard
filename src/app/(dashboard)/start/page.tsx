import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Building2, ClipboardList, FileBarChart2, Plus } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { Panel } from '@/components/ui/Panel'
import { ProgressSteps } from '@/components/ui/ProgressSteps'
import { EmptyState } from '@/components/ui/EmptyState'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { stepsFor, type FlowKind } from '@/lib/flows'

export const metadata = { title: 'Start new' }

type PageProps = { searchParams: Promise<{ type?: string; companyId?: string; mode?: string }> }

const CHOICES: Array<{ kind: FlowKind; title: string; sentence: string; detail: string; icon: typeof FileBarChart2 }> = [
  {
    kind: 'full',
    title: 'Full B-BBEE scorecard',
    sentence: 'Works out the company’s B-BBEE level from all seven elements.',
    detail: 'You upload the REAP scorecard workbook, check what it read, fill in any gaps, and calculate. Procurement is one of the seven elements: you attach a procurement scorecard to it.',
    icon: FileBarChart2,
  },
  {
    kind: 'procurement',
    title: 'Procurement only',
    sentence: 'Scores how much the company buys from B-BBEE suppliers, out of 29 points.',
    detail: 'You enter the total spend and the list of suppliers. Use it on its own, or attach it to a full scorecard later so it counts towards the level.',
    icon: ClipboardList,
  },
]

function nextHref(kind: FlowKind, companyId: string, modular = false) {
  return kind === 'full'
    ? `/scorecards/new?companyId=${companyId}${modular ? '&mode=modular' : ''}`
    : `/procurement/assessments/new?companyId=${companyId}`
}

export default async function StartPage({ searchParams }: PageProps) {
  const params = await searchParams
  const modular = params.mode === 'modular'
  const kind: FlowKind | null = params.type === 'full' || params.type === 'procurement' ? params.type : null

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: companies } = await supabase.from('companies').select('id, name').eq('owner_id', user.id).order('name')
  const list = companies ?? []

  // Arriving back from "Add a new company": carry straight on.
  if (kind && params.companyId && list.some((c) => c.id === params.companyId)) {
    redirect(nextHref(kind, params.companyId, modular))
  }

  return (
    <div className="space-y-6">
      <PageHeader
        crumbs={[{ label: 'Home', href: '/dashboard' }, { label: 'Start new' }]}
        title="What do you want to work out?"
        description="Choose one. You can always do the other later for the same company."
      />
      {kind ? <ProgressSteps steps={stepsFor(kind, 0)} label={kind === 'full' ? 'Full scorecard steps' : 'Procurement steps'} /> : null}

      <div className="grid gap-4 md:grid-cols-2" role="list">
        {CHOICES.map((choice) => {
          const selected = kind === choice.kind
          const Icon = choice.icon
          return (
            <Link
              role="listitem"
              key={choice.kind}
              href={`/start?type=${choice.kind}${params.companyId ? `&companyId=${params.companyId}` : ''}`}
              aria-current={selected ? 'true' : undefined}
              className={`block rounded-card border bg-surface p-5 transition-colors sm:p-6 ${
                selected ? 'border-brand ring-2 ring-brand' : 'border-line hover:border-brand'
              }`}
            >
              <span className="flex items-start gap-4">
                <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-control ${selected ? 'bg-brand text-brand-ink' : 'bg-brand-soft text-brand'}`}>
                  <Icon className="h-6 w-6" aria-hidden />
                </span>
                <span className="min-w-0 space-y-1.5">
                  <span className="block text-lg font-semibold text-ink">{choice.title}</span>
                  <span className="block text-base text-ink">{choice.sentence}</span>
                  <span className="block text-[15px] text-muted">{choice.detail}</span>
                </span>
              </span>
            </Link>
          )
        })}
      </div>

      {kind ? (
        <Panel
          title="Which company is it for?"
          description={
            kind === 'full'
              ? 'The scorecard is saved under this company, next to its procurement scorecards.'
              : 'The procurement scorecard is saved under this company, so it can be attached to its full scorecard later.'
          }
        >
          {list.length === 0 ? (
            <EmptyState
              icon={<Building2 className="h-6 w-6" aria-hidden />}
              title="Add the company first"
              action={
                <Link href={`/companies/new?next=${encodeURIComponent(`/start?type=${kind}${modular ? '&mode=modular' : ''}`)}`} className={buttonStyles({ variant: 'primary' })}>
                  <Plus className="h-4 w-4" aria-hidden /> Add a company
                </Link>
              }
            >
              It only needs a name. You can add contact details later.
            </EmptyState>
          ) : (
            <ul className="divide-y divide-line rounded-control border border-line">
              {list.map((company) => (
                <li key={company.id}>
                  <Link
                    href={nextHref(kind, company.id, modular)}
                    className="flex items-center justify-between gap-3 px-4 py-3.5 text-base font-medium text-ink hover:bg-brand-soft"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <Building2 className="h-5 w-5 shrink-0 text-faint" aria-hidden />
                      <span className="truncate">{company.name}</span>
                    </span>
                    <span className="shrink-0 text-[15px] font-semibold text-brand">Choose</span>
                  </Link>
                </li>
              ))}
              <li>
                <Link
                  href={`/companies/new?next=${encodeURIComponent(`/start?type=${kind}${modular ? '&mode=modular' : ''}`)}`}
                  className="flex items-center gap-3 px-4 py-3.5 text-base font-semibold text-brand hover:bg-brand-soft"
                >
                  <Plus className="h-5 w-5" aria-hidden /> Add a new company
                </Link>
              </li>
            </ul>
          )}
        </Panel>
      ) : (
        <p className="text-[15px] text-muted">
          Not sure? A <strong className="text-ink">full scorecard</strong> gives the B-BBEE level that appears on a certificate.
          Choose <strong className="text-ink">procurement only</strong> when you just need the supplier spend score, for
          example to test the effect of changing suppliers.
        </p>
      )}
    </div>
  )
}
