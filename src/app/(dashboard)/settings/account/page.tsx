import { KeyRound, Users } from 'lucide-react'
import { SettingsInfoCard, SettingsPanel } from '@/components/settings/SettingsPanel'

export default function AccountSettingsPage() {
  return (
    <SettingsPanel
      title="Account"
      description="Security and workspace controls for your REAP identity."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <SettingsInfoCard
          eyebrow="Security"
          title="Password and sessions"
          description="Sign-in is managed through your identity provider today. Advanced session controls can be added in a future release."
          icon={<KeyRound className="h-4 w-4" aria-hidden />}
        />
        <SettingsInfoCard
          eyebrow="Workspace"
          title="Team and billing"
          description="Organisation-level preferences will appear here as your REAP workspace grows."
          icon={<Users className="h-4 w-4" aria-hidden />}
        />
      </div>
    </SettingsPanel>
  )
}
