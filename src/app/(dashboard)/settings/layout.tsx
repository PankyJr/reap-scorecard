import type { ReactNode } from 'react'
import { SettingsChrome } from '@/components/settings/SettingsChrome'

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return <SettingsChrome>{children}</SettingsChrome>
}
