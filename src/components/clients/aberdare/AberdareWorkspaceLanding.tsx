'use client'

import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ClipboardCheck, Upload } from 'lucide-react'
import {
  ABERDARE_LIVE_HREF,
  DASHBOARD_WORKSPACE_FORMAL,
} from '@/lib/demo/workspaceSelectorConfig'
import { AberdareWorkspaceHeader } from './AberdareWorkspaceHeader'
import { ABERDARE_THEME } from './theme'

const LIVE_STEPS = [
  'Upload the latest spend report',
  'Review the current procurement position',
  'Adjust suppliers and compare impact',
] as const

const FORMAL_CAPABILITIES = [
  'Structured assessment',
  'Formal score breakdown',
  'Reporting and PDF output',
] as const

const RELATIONSHIP = [
  'Monthly supplier report',
  'Live monitoring and scenario testing',
  'Formal REAP assessment and reporting',
] as const

export function AberdareWorkspaceLanding() {
  return (
    <div
      className="min-h-screen text-base"
      style={{ background: ABERDARE_THEME.canvas, color: ABERDARE_THEME.text }}
      data-testid="aberdare-workspace-landing"
    >
      <AberdareWorkspaceHeader
        subtitle="Monitor supplier-spend performance, test procurement scenarios and access formal assessments."
        showReturnToDashboard
      />

      <main className="mx-auto max-w-[1200px] px-5 pb-10 pt-4 sm:px-6 sm:pt-5">
        {/* Compact workspace hero — intentional, not a marketing splash */}
        <section
          className="rounded-2xl border bg-white px-5 py-5 sm:px-7 sm:py-5"
          style={{ borderColor: ABERDARE_THEME.border }}
          aria-labelledby="aberdare-hero-heading"
        >
          <p
            className="text-sm font-semibold tracking-wide"
            style={{ color: ABERDARE_THEME.cyanDark }}
          >
            Configured workspace
          </p>
          <h2
            id="aberdare-hero-heading"
            className="mt-1.5 max-w-3xl text-2xl font-semibold tracking-tight sm:text-[1.75rem]"
            style={{ color: ABERDARE_THEME.charcoal }}
          >
            Procurement decisions, clearly understood
          </h2>
          <p
            className="mt-2 max-w-3xl text-base leading-snug"
            style={{ color: ABERDARE_THEME.muted }}
          >
            Use the latest supplier-spend position to test changes during the year,
            then use REAP’s formal assessment workflow when structured reporting is
            required.
          </p>
          <ol
            className="mt-3.5 flex flex-wrap items-center gap-2 text-base font-medium"
            aria-label="Workflow relationship"
          >
            {(['Monitor', 'Adjust suppliers', 'Formal assessment'] as const).map(
              (label, index, arr) => (
                <li key={label} className="inline-flex items-center gap-2">
                  <span
                    className="inline-flex min-h-10 items-center rounded-lg border bg-[#F7FBFD] px-3"
                    style={{
                      borderColor: ABERDARE_THEME.border,
                      color: ABERDARE_THEME.charcoal,
                    }}
                  >
                    {label}
                  </span>
                  {index < arr.length - 1 ? (
                    <span
                      className="text-slate-400"
                      aria-hidden
                    >
                      →
                    </span>
                  ) : null}
                </li>
              ),
            )}
          </ol>
        </section>

        {/* Asymmetric primary / secondary workflows */}
        <div className="mt-4 grid gap-4 lg:grid-cols-[1.65fr_1fr] lg:items-stretch">
          <section
            className="relative flex flex-col overflow-hidden rounded-2xl border bg-white p-6 sm:p-7"
            style={{ borderColor: '#C5DCE8' }}
            data-testid="aberdare-live-panel"
            aria-labelledby="live-workflow-heading"
          >
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-1"
              style={{ background: ABERDARE_THEME.cyanDark }}
              aria-hidden
            />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  className="text-sm font-semibold tracking-wide"
                  style={{ color: ABERDARE_THEME.cyanDark }}
                >
                  Live workflow
                </p>
                <h3
                  id="live-workflow-heading"
                  className="mt-1 text-2xl font-semibold tracking-tight"
                  style={{ color: ABERDARE_THEME.charcoal }}
                >
                  Live Procurement Control
                </h3>
              </div>
              <span
                className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: ABERDARE_THEME.cyanSoft,
                  color: ABERDARE_THEME.cyanDark,
                }}
                aria-hidden
              >
                <Upload className="h-5 w-5" />
              </span>
            </div>
            <p
              className="mt-3 text-base leading-relaxed"
              style={{ color: ABERDARE_THEME.muted }}
            >
              Upload the latest supplier-spend report and test how supplier changes
              may affect procurement points without altering the original data.
            </p>

            <ol
              className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:gap-3"
              aria-label="Live procurement steps"
            >
              {LIVE_STEPS.map((step, index) => (
                <li
                  key={step}
                  className="flex min-w-[12rem] flex-1 items-start gap-2.5 text-base"
                  style={{ color: ABERDARE_THEME.text }}
                >
                  <span
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-sm font-semibold text-white"
                    style={{ background: ABERDARE_THEME.cyanDark }}
                    aria-hidden
                  >
                    {index + 1}
                  </span>
                  <span className="pt-0.5 font-medium leading-snug">{step}</span>
                </li>
              ))}
            </ol>

            <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-center">
              <Link
                href={ABERDARE_LIVE_HREF}
                data-testid="open-live-procurement"
                aria-label="Open Live Procurement"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-6 text-base font-semibold text-white transition hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0087BC] focus-visible:ring-offset-2"
                style={{ background: ABERDARE_THEME.cyanDark }}
              >
                Open Live Procurement
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
            <p
              className="mt-3 text-sm leading-snug"
              style={{ color: ABERDARE_THEME.muted }}
            >
              Your uploaded baseline remains unchanged while scenarios are tested.
            </p>
          </section>

          <section
            className="flex flex-col rounded-2xl border p-5 sm:p-6"
            style={{
              borderColor: '#0a5258',
              background: '#063b3f',
              color: '#fff',
            }}
            data-testid="aberdare-formal-panel"
            aria-labelledby="formal-workflow-heading"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold tracking-wide text-sky-100/90">
                  Formal workflow
                </p>
                <h3
                  id="formal-workflow-heading"
                  className="mt-1 text-xl font-semibold tracking-tight text-white sm:text-2xl"
                >
                  REAP Formal Assessment
                </h3>
              </div>
              <Image
                src="/logo.png"
                alt="REAP Solutions"
                width={36}
                height={36}
                className="h-9 w-9 rounded-md bg-white/10 p-1 object-contain"
              />
            </div>
            <p className="mt-3 text-base leading-relaxed text-sky-100/85">
              Run the structured procurement assessment used for formal scoring,
              review and reporting.
            </p>
            <ul className="mt-4 space-y-2 text-base text-sky-50/95">
              {FORMAL_CAPABILITIES.map((item) => (
                <li key={item} className="flex w-full items-center gap-2">
                  <ClipboardCheck
                    className="h-4 w-4 shrink-0 text-emerald-300"
                    aria-hidden
                  />
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-6">
              <Link
                href={DASHBOARD_WORKSPACE_FORMAL.href}
                data-testid="open-formal-assessment"
                aria-label="Open Formal Assessment"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-base font-semibold text-[#042f34] transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#063b3f]"
              >
                Open Formal Assessment
                <ArrowRight className="h-4 w-4" aria-hidden />
              </Link>
            </div>
          </section>
        </div>

        {/* Concise relationship strip */}
        <section
          className="mt-4 rounded-2xl border bg-white px-5 py-4 sm:px-6"
          style={{ borderColor: ABERDARE_THEME.border }}
          aria-labelledby="workflows-together-heading"
        >
          <h2
            id="workflows-together-heading"
            className="text-lg font-semibold tracking-tight"
            style={{ color: ABERDARE_THEME.charcoal }}
          >
            How the two workflows work together
          </h2>
          <ol
            className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center"
            aria-label="End-to-end workflow"
          >
            {RELATIONSHIP.map((label, index) => (
              <li key={label} className="inline-flex items-center gap-3">
                <span
                  className="inline-flex min-h-11 items-center rounded-xl border px-4 text-base font-medium"
                  style={{
                    borderColor: ABERDARE_THEME.border,
                    color: ABERDARE_THEME.text,
                    background: index === 1 ? ABERDARE_THEME.cyanSoft : '#F8FAFB',
                  }}
                >
                  {label}
                </span>
                {index < RELATIONSHIP.length - 1 ? (
                  <span
                    className="hidden text-slate-400 sm:inline"
                    aria-hidden
                  >
                    →
                  </span>
                ) : null}
              </li>
            ))}
          </ol>
        </section>
      </main>
    </div>
  )
}
