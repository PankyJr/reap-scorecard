import type { Metadata } from 'next'
import { AberdareWorkspaceLanding } from '@/components/clients/aberdare/AberdareWorkspaceLanding'

export const metadata: Metadata = {
  title: 'Aberdare Procurement Workspace',
  robots: { index: false, follow: false },
  description:
    'Aberdare Cables client workspace for live procurement monitoring and formal assessments.',
}

export default function AberdareProcurementControlPreviewPage() {
  return <AberdareWorkspaceLanding />
}
