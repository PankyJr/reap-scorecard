import Link from 'next/link'
import { FileText } from 'lucide-react'
import { SettingsPanel } from '@/components/settings/SettingsPanel'

export default function LegalSettingsPage() {
  return (
    <SettingsPanel
      title="Legal"
      description="Policies governing use of the REAP Scorecard platform."
    >
      <ul className="space-y-3">
        <li>
          <Link
            href="/terms"
            className="group flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-3.5 text-sm font-medium text-slate-800 transition hover:border-[#063b3f]/25 hover:bg-white hover:shadow-sm"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-100 transition group-hover:ring-[#063b3f]/20">
              <FileText className="h-4 w-4 text-[#063b3f]" aria-hidden />
            </span>
            Terms of Service
          </Link>
        </li>
        <li>
          <Link
            href="/privacy"
            className="group flex items-center gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 px-4 py-3.5 text-sm font-medium text-slate-800 transition hover:border-[#063b3f]/25 hover:bg-white hover:shadow-sm"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white shadow-sm ring-1 ring-slate-100 transition group-hover:ring-[#063b3f]/20">
              <FileText className="h-4 w-4 text-[#063b3f]" aria-hidden />
            </span>
            Privacy Policy
          </Link>
        </li>
      </ul>
    </SettingsPanel>
  )
}
