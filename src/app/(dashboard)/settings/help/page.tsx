import Link from 'next/link'
import { Building2, ClipboardList, Activity } from 'lucide-react'
import { HelpGuideButtons } from '@/components/tour/HelpGuideButtons'
import { SettingsPanel, SettingsSection } from '@/components/settings/SettingsPanel'

export default function HelpCenterPage() {
  return (
    <SettingsPanel
      title="Help Center"
      description="Quick answers for using the REAP Scorecard platform."
    >
      <div className="space-y-5">
        <HelpGuideButtons />

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
                  from the sidebar or Companies page. Enter the organisation details, then save.
                  You need at least one company before running a procurement assessment.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <ClipboardList className="mt-0.5 h-4 w-4 shrink-0 text-[#063b3f]" aria-hidden />
              <div>
                <p className="font-medium text-slate-800">How to run a procurement assessment</p>
                <p className="mt-1 leading-relaxed">
                  Open a company profile and choose &quot;New procurement assessment&quot;, or go to{' '}
                  <Link
                    href="/procurement/assessments/new"
                    className="font-medium text-slate-900 underline decoration-slate-300 underline-offset-2 hover:decoration-[#063b3f]/40"
                  >
                    New Procurement Assessment
                  </Link>
                  . Confirm TMPS, import or enter supplier rows, review the live preview, then save.
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
                  The Activity page lists audited actions—such as creating or updating companies and
                  assessments—so you can trace changes over time.
                </p>
              </div>
            </li>
            <li>
              <p className="font-medium text-slate-800">What procurement assessments represent</p>
              <p className="mt-1 leading-relaxed">
                Procurement assessments capture supplier spend, recognised B-BBEE value, and category
                points for a company year. Saved results power the dashboard, reports, and PDF export.
              </p>
            </li>
          </ul>
        </SettingsSection>

        <SettingsSection title="Support">
          <p className="text-sm leading-relaxed text-slate-600">
            For access issues, product questions, or escalation, use your organisation&apos;s normal
            channel to reach{' '}
            <span className="font-medium text-slate-800">REAP Solutions</span> or the administrator
            who invited you to this workspace.
          </p>
        </SettingsSection>
      </div>
    </SettingsPanel>
  )
}
