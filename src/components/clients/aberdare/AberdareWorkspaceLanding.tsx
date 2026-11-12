'use client'

import { buttonStyles } from '@/components/ui/buttonStyles'
import Link from 'next/link'
import { ArrowRight, Check, ClipboardCheck, Upload } from 'lucide-react'
import { CLIENT_WORKSPACE_LIVE_HREF, DASHBOARD_WORKSPACE_FORMAL } from '@/lib/demo/workspaceSelectorConfig'
import { CARD_FRAME, CARD_INTERACTIVE, SectionTitle } from '@/components/ui/Card'
import { cn } from '@/components/ui/cn'
import { AberdareWorkspaceHeader } from './AberdareWorkspaceHeader'

const LIVE_STEPS = ['Upload the latest spend report', 'Review the current procurement position', 'Adjust suppliers and compare impact'] as const

const FORMAL_CAPABILITIES = ['Structured assessment', 'Formal score breakdown', 'Reporting and PDF output'] as const

const RELATIONSHIP = ['Monthly supplier report', 'Live monitoring and scenario testing', 'Formal REAP assessment and reporting'] as const

/**
 * The Aberdare workspace inside the app shell: the page header, two option
 * cards in the Start-page style (an icon, a title, three short lines, one
 * action), then how they work together as a three-step horizontal stepper.
 */
export function AberdareWorkspaceLanding() {
  return (
    <div className="space-y-6" data-testid="aberdare-workspace-landing">
      <AberdareWorkspaceHeader
        subtitle="Monitor supplier-spend performance, test procurement scenarios and access formal assessments."
        showReturnToDashboard
      />

      <section className="border-t border-line pt-6" aria-labelledby="aberdare-hero-heading">
        <SectionTitle id="aberdare-hero-heading">Procurement decisions, clearly understood</SectionTitle>
        <p className="mt-0.5 max-w-[72ch] text-meta text-label">
          Use the latest supplier-spend position to test changes during the year, then use REAP’s formal assessment workflow
          when structured reporting is required.
        </p>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <OptionCard
            testId="aberdare-live-panel"
            headingId="live-workflow-heading"
            icon={<Upload className="h-[18px] w-[18px]" />}
            title="Live procurement control"
            body="Upload the latest supplier-spend report and test how supplier changes may affect procurement points without altering the original data."
            lines={LIVE_STEPS}
            note="Your uploaded baseline remains unchanged while scenarios are tested."
            action={
              <Link href={CLIENT_WORKSPACE_LIVE_HREF} data-testid="open-live-procurement" aria-label="Open Live Procurement" className={buttonStyles({ variant: 'primary' })}>
                Open live procurement <ArrowRight aria-hidden />
              </Link>
            }
          />
          <OptionCard
            testId="aberdare-formal-panel"
            headingId="formal-workflow-heading"
            icon={<ClipboardCheck className="h-[18px] w-[18px]" />}
            title="Formal assessment"
            body="Run the structured procurement assessment used for formal scoring, review and reporting."
            lines={FORMAL_CAPABILITIES}
            action={
              <Link href={DASHBOARD_WORKSPACE_FORMAL.href} data-testid="open-formal-assessment" aria-label="Open Formal Assessment" className={buttonStyles({ variant: 'secondary' })}>
                Open formal assessment <ArrowRight aria-hidden />
              </Link>
            }
          />
        </div>
      </section>

      <section className="border-t border-line pt-6" aria-labelledby="workflows-together-heading">
        <SectionTitle id="workflows-together-heading">How the two workflows work together</SectionTitle>
        <ol className="mt-5 grid gap-4 sm:grid-cols-3" aria-label="End-to-end workflow">
          {RELATIONSHIP.map((label, index) => (
            <li key={label} className="relative">
              {index < RELATIONSHIP.length - 1 ? <span className="absolute left-7 right-0 top-3 hidden h-px bg-teal sm:block" aria-hidden /> : null}
              <span className="relative z-[1] flex h-6 w-6 items-center justify-center rounded-full bg-surface text-caps font-semibold tabular-nums text-teal ring-2 ring-teal">{index + 1}</span>
              <span className="mt-2 block pr-4 text-body text-ink">{label}</span>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

function OptionCard(args: { testId: string; headingId: string; icon: React.ReactNode; title: string; body: string; lines: readonly string[]; note?: string; action: React.ReactNode }) {
  return (
    <section className={cn('flex flex-col p-5 sm:p-6', CARD_FRAME, CARD_INTERACTIVE)} data-testid={args.testId} aria-labelledby={args.headingId}>
      <span className="flex h-10 w-10 items-center justify-center rounded-control border border-line text-teal" aria-hidden>
        {args.icon}
      </span>
      <h3 id={args.headingId} className="mt-4 text-section font-semibold text-ink">
        {args.title}
      </h3>
      <p className="mt-1 text-body text-label">{args.body}</p>
      <ul className="mt-4 space-y-1.5 border-t border-line pt-4">
        {args.lines.map((line) => (
          <li key={line} className="flex items-center gap-2 text-meta text-ink">
            <Check className="h-3.5 w-3.5 shrink-0 text-teal" aria-hidden />
            {line}
          </li>
        ))}
      </ul>
      <div className="mt-auto pt-6">{args.action}</div>
      {args.note ? <p className="mt-3 text-meta text-label">{args.note}</p> : null}
    </section>
  )
}
