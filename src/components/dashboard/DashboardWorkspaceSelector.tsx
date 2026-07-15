import Image from 'next/image'
import Link from 'next/link'
import { ArrowRight, ClipboardList, LineChart } from 'lucide-react'
import { DASHBOARD_WORKSPACE_SELECTOR } from '@/lib/demo/workspaceSelectorConfig'

/**
 * Premium workspace destination tiles for the dashboard demo experience.
 * Not linked from permanent production sidebar navigation.
 */
export function DashboardWorkspaceSelector() {
  const { heading, supporting, formal, aberdare } = DASHBOARD_WORKSPACE_SELECTOR

  return (
    <section
      aria-labelledby="dashboard-workspace-selector-heading"
      data-testid="dashboard-workspace-selector"
      className="relative rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-white p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] sm:p-7"
    >
      {/* Short accent — separates Workspaces without a full-bleed rule */}
      <div
        className="mb-5 flex items-center gap-3"
        aria-hidden
      >
        <span className="h-1 w-12 rounded-full bg-[#063b3f]" />
        <span className="h-px flex-1 max-w-[7rem] bg-slate-200" />
      </div>

      <div className="max-w-3xl">
        <h2
          id="dashboard-workspace-selector-heading"
          className="text-2xl font-semibold tracking-tight text-slate-900"
        >
          {heading}
        </h2>
        <p className="mt-2 text-base leading-relaxed text-slate-600">
          {supporting}
        </p>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.05fr_1fr]">
        {/* REAP formal workspace — deep teal destination tile */}
        <article
          className="group relative flex min-h-[280px] flex-col overflow-hidden rounded-2xl border border-[#042f34] bg-[#063b3f] p-7 text-white shadow-[0_1px_0_rgba(255,255,255,0.06)_inset] transition motion-reduce:transition-none hover:border-[#0a5258] focus-within:ring-2 focus-within:ring-[#063b3f] focus-within:ring-offset-2 sm:p-8"
          data-testid="workspace-card-formal"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.png"
                alt="REAP Solutions"
                width={36}
                height={36}
                className="h-9 w-9 rounded-md bg-white/10 p-1 object-contain"
              />
              <p className="text-sm font-semibold tracking-wide text-sky-100/90">
                {formal.label}
              </p>
            </div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-sky-100">
              <ClipboardList className="h-5 w-5" aria-hidden />
            </span>
          </div>

          <h3 className="mt-6 text-2xl font-semibold tracking-tight text-white sm:text-[1.65rem]">
            {formal.title}
          </h3>
          <p className="mt-3 text-base leading-relaxed text-sky-100/85">
            {formal.description}
          </p>

          <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-base text-sky-50/90">
            {formal.capabilities.map((item) => (
              <li key={item} className="inline-flex items-center gap-2">
                <span
                  className="h-1.5 w-1.5 rounded-full bg-emerald-300"
                  aria-hidden
                />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-8">
            <Link
              href={formal.href}
              data-testid="workspace-open-formal"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-5 text-base font-semibold text-[#042f34] transition hover:bg-sky-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#063b3f] sm:w-auto"
            >
              {formal.primaryAction}
              <ArrowRight
                className="h-4 w-4 transition group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden
              />
            </Link>
          </div>
        </article>

        {/* Aberdare client workspace — cool surface with cyan accent */}
        <article
          className="group relative flex min-h-[280px] flex-col overflow-hidden rounded-2xl border border-[#C5DCE8] bg-[#F7FBFD] p-7 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition motion-reduce:transition-none hover:border-[#0087BC]/45 hover:bg-white focus-within:ring-2 focus-within:ring-[#0087BC] focus-within:ring-offset-2 sm:p-8"
          data-testid="workspace-card-aberdare"
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-[#0087BC]"
            aria-hidden
          />
          <div className="flex flex-wrap items-start justify-between gap-3">
            <Image
              src="/clients/aberdare/logo.jpg"
              alt="Aberdare Cables"
              width={176}
              height={48}
              className="h-11 w-auto max-w-[180px] object-contain object-left"
            />
            <span
              className="inline-flex items-center rounded-md border border-[#0087BC]/30 bg-white px-2.5 py-1 text-sm font-semibold text-[#0087BC]"
              aria-label="Client workspace"
            >
              {aberdare.badge}
            </span>
          </div>

          <p className="mt-5 text-sm font-semibold tracking-wide text-[#0087BC]">
            {aberdare.label}
          </p>
          <h3 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900 sm:text-[1.65rem]">
            {aberdare.title}
          </h3>
          <p className="mt-3 text-base leading-relaxed text-slate-600">
            {aberdare.description}
          </p>

          <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-2 text-base text-slate-700">
            {aberdare.capabilities.map((item) => (
              <li key={item} className="inline-flex items-center gap-2">
                <LineChart className="h-4 w-4 text-[#0087BC]" aria-hidden />
                {item}
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-8">
            <Link
              href={aberdare.href}
              data-testid="workspace-open-aberdare"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0087BC] px-5 text-base font-semibold text-white transition hover:bg-[#0070A0] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0087BC] focus-visible:ring-offset-2 sm:w-auto"
            >
              {aberdare.primaryAction}
              <ArrowRight
                className="h-4 w-4 transition group-hover:translate-x-0.5 motion-reduce:transition-none"
                aria-hidden
              />
            </Link>
          </div>
        </article>
      </div>
    </section>
  )
}
