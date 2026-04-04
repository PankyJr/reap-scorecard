import { SettingsPanel } from '@/components/settings/SettingsPanel'

export default function AccountSettingsPage() {
  return (
    <SettingsPanel
      title="Account"
      description="Security, sessions, and billing options may appear here as the product grows."
    >
      <p className="rounded-xl border border-dashed border-slate-200/90 bg-slate-50/60 px-5 py-10 text-center text-sm text-slate-500">
        No account settings to configure yet.
      </p>
    </SettingsPanel>
  )
}
