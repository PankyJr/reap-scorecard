import { Notice } from '@/components/ui/Notice'
import { Term } from '@/components/ui/Term'
import type { ProcurementSizeClass } from '@/lib/procurement/companySize'

/**
 * Says which targets the procurement score uses. The app has the Generic
 * (large company) targets only; it never makes up QSE targets.
 */
export function ProcurementTargetsNotice({ size, companyName }: { size: ProcurementSizeClass; companyName: string }) {
  if (size === 'qse' || size === 'eme') {
    return (
      <Notice tone="warn" title="The QSE procurement scorecard is not in the app yet">
        {companyName}’s full scorecard says it is {size === 'qse' ? 'a ' : 'an '}
        <Term k={size}>{size === 'qse' ? 'QSE' : 'EME'}</Term>. This score uses the targets for large companies (the{' '}
        <Term k="generic">Generic</Term> scorecard), so use it as a guide only.
      </Notice>
    )
  }
  if (size === 'generic') return null
  return (
    <p className="text-sm text-muted">
      These are the targets for large companies (<Term k="generic">Generic</Term> scorecard, turnover above R50 million). The QSE
      procurement scorecard is not in the app yet.
    </p>
  )
}
