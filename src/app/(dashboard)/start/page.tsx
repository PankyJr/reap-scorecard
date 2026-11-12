import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Building2, Plus } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { PageHeader } from '@/components/ui/PageHeader'
import { Notice } from '@/components/ui/Notice'
import { Callout } from '@/components/ui/Callout'
import { EmptyState } from '@/components/ui/EmptyState'
import { ProgressSteps } from '@/components/ui/ProgressSteps'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { CompanyPicker } from '@/components/start/CompanyPicker'
import { NeedChooser } from '@/components/start/NeedChooser'
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
}> = [
  {
    kind: 'full',
    title: 'Full B-BBEE scorecard',
    purpose: "Get your company's overall B-BBEE level.",
    covers: 'All seven areas of the scorecard.',
    useFor: 'A verification, a tender or a client request.',
    youNeed: 'Your scorecard workbook, or your figures.',
  },
  {
    kind: 'procurement',
    title: 'Procurement only',
    purpose: 'See how your spending with suppliers scores.',
    covers: 'One area: what you buy from B-BBEE suppliers.',
    useFor: 'Checking or improving your supplier spend.',
    youNeed: 'Your supplier list, what you spent with each, and their B-BBEE levels.',
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
    .select('id, name, industry, annual_turnover, black_ownership_percentage')
    .eq('owner_id', user.id)
    .order('name')
  const list = companies ?? []
  const company = params.companyId ? list.find((c) => c.id === params.companyId) ?? null : null

  // An older link that already says which kind and which company: carry on.
  if (kind && company) redirect(nextHref(kind, company.id, modular))

  if (!company) {
    const addHref = `/companies/new?next=${encodeURIComponent(`/start${kind ? `?type=${kind}` : ''}`)}`
    return (
      <div className="mx-auto max-w-[640px] space-y-8 pt-2">
        <ProgressSteps label="Start new" steps={[{ label: 'Company', state: 'current' }, { label: 'What you need', state: 'todo' }]} />
        <PageHeader title="Which company is it for?" description="Everything you work out is saved under a company." />
        {list.length === 0 ? (
          <div className="border-t border-line">
            <EmptyState
              icon={<Building2 aria-hidden />}
              title="Add your first company"
              action={
                <Link href="/companies/new" className={buttonStyles({ variant: 'primary' })}>
                  <Plus aria-hidden /> Add your first company
                </Link>
              }
            >
              Five details: name, industry, financial year end, turnover and black ownership.
            </EmptyState>
          </div>
        ) : (
          <CompanyPicker
            addHref={addHref}
            companies={list.map((c) => ({ id: c.id, name: c.name, sub: c.industry ?? null, href: kind ? nextHref(kind, c.id, modular) : `/start?companyId=${c.id}${modular ? '&mode=modular' : ''}` }))}
          />
        )}
      </div>
    )
  }

  const size = describeCompanySize({
    turnover: company.annual_turnover == null ? null : Number(company.annual_turnover),
    blackOwnershipPercent: company.black_ownership_percentage == null ? null : Number(company.black_ownership_percentage),
  })

  return (
    <div className="mx-auto max-w-[640px] space-y-8 pt-2">
      <ProgressSteps
        label="Start new"
        steps={[
          { label: 'Company', state: 'done', href: `/start${modular ? '?mode=modular' : ''}` },
          { label: 'What you need', state: 'current' },
        ]}
      />
      <PageHeader title="What do you need?" description={`For ${company.name}. You can always do the other one later.`} />

      {params.created === '1' ? <Notice tone="ok">{company.name} is saved.</Notice> : null}

      {size.size ? (
        <div className="space-y-3">
          <p className="text-body text-ink">{size.headline}</p>
          {size.automaticLevel ? (
            <Callout title="You may not need a full scorecard">
              {size.automaticLevel.reason} Confirm with your verification agency.
            </Callout>
          ) : null}
          {size.limitation ? <Callout tone="attention">{size.limitation}</Callout> : null}
        </div>
      ) : null}

      <NeedChooser choices={CHOICES.map((choice) => ({ ...choice, href: nextHref(choice.kind, company.id, modular) }))} />

      <p className="border-t border-line pt-6 text-meta text-label">
        <span className="font-medium text-ink">Not sure?</span> Start with procurement. You can turn it into a full scorecard
        later and keep everything you&apos;ve entered.
      </p>
    </div>
  )
}
