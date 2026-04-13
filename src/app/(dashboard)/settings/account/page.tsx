import { SettingsPanel } from '@/components/settings/SettingsPanel'

export default function AccountSettingsPage() {
  return (
    <SettingsPanel
      title="Account"
      description="Security and account controls for your workspace identity."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Security</p>
          <p className="mt-2 text-sm font-medium text-slate-800">Password and session controls</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            Managed through your sign-in provider today. Advanced controls can be enabled in a future release.
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-500">Workspace</p>
          <p className="mt-2 text-sm font-medium text-slate-800">Team and billing preferences</p>
          <p className="mt-1 text-sm leading-relaxed text-slate-500">
            This panel is reserved for organisation-level controls as your REAP workspace grows.
          </p>
        </div>
      </div>
    </SettingsPanel>
  )
}
