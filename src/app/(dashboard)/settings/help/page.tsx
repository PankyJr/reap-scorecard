import Link from 'next/link'
import { Building2, FileBarChart2, Activity } from 'lucide-react'
import { SettingsSection } from '@/components/settings/SettingsPanel'

export default function HelpCenterPage() {
  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#063b3f]">Resources</p>
        <h2 className="text-xl font-semibold tracking-tight text-slate-900">Help Center</h2>
        <p className="text-sm text-slate-500">Quick answers for using the REAP Scorecard platform.</p>
      </header>

      <SettingsSection title="Getting started">
        <ul className="space-y-5 text-sm text-slate-600">
          <li className="flex gap-3">
            <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-[#063b3f]" aria-hidden />
            <div>
              <p className="font-medium text-slate-800">How to add a company</p>
              <p className="mt-1 leading-relaxed">
                Go to{' '}
                <Link
                  href="/companies/new"
                  className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-[#063b3f]/40"
                >
                  New Company
                </Link>{' '}
                from the sidebar or Companies page. Enter the organisation details, then save. You need at least one company before creating scorecards tied to a client.
              </p>
            </div>
          </li>
          <li className="flex gap-3">
            <FileBarChart2 className="mt-0.5 h-4 w-4 shrink-0 text-[#063b3f]" aria-hidden />
            <div>
              <p className="font-medium text-slate-800">How to create a scorecard</p>
              <p className="mt-1 leading-relaxed">
                Open a company profile and use &quot;New scorecard&quot;, or go to{' '}
                <Link
                  href="/scorecards/new"
                  className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-[#063b3f]/40"
                >
                  New Scorecard
                </Link>{' '}
                and select a company. Complete the category inputs and save to generate REAP levels and insights.
              </p>
            </div>
          </li>
        </ul>
      </SettingsSection>

      <SettingsSection title="Understanding the platform">
        <ul className="space-y-5 text-sm text-slate-600">
          <li className="flex gap-3">
            <Activity className="mt-0.5 h-4 w-4 shrink-0 text-[#063b3f]" aria-hidden />
            <div>
              <p className="font-medium text-slate-800">What Activity shows</p>
              <p className="mt-1 leading-relaxed">
                The Activity page lists audited actions—such as creating or updating companies and scorecards—so you can trace changes over time.
              </p>
            </div>
          </li>
          <li>
            <p className="font-medium text-slate-800">What scorecards represent</p>
            <p className="mt-1 leading-relaxed">
              Scorecards capture B-BBEE-related inputs for a company and calculate totals and REAP levels. Use them to track compliance posture and compare runs over time.
            </p>
          </li>
        </ul>
      </SettingsSection>

      <SettingsSection title="Support">
        <p className="text-sm leading-relaxed text-slate-600">
          For access issues, product questions, or escalation, use your organisation&apos;s normal channel to reach{' '}
          <span className="font-medium text-slate-800">REAP Solutions</span> or the administrator who invited you to
          this workspace.
        </p>
      </SettingsSection>
    </div>
  )
}
