import type { Metadata } from 'next'
import { AberdareWorkspaceLanding } from '@/components/clients/aberdare/AberdareWorkspaceLanding'
import { PageHelpData } from '@/components/help/PageHelpData'
import { CLIENT_WORKSPACE_LIVE_HREF } from '@/lib/demo/workspaceSelectorConfig'

export const metadata: Metadata = {
  title: 'Aberdare Procurement Workspace',
  robots: { index: false, follow: false },
  description:
    'Aberdare Cables client workspace for live procurement monitoring and formal assessments.',
}

export default function AberdareProcurementControlPreviewPage() {
  return (
    <>
      <PageHelpData page="aberdare" data={{ liveHref: CLIENT_WORKSPACE_LIVE_HREF }} />
      <AberdareWorkspaceLanding />
    </>
  )
}
