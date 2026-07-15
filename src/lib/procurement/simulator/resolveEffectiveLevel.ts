import type { ComplianceStatus } from './types'

/** Maps compliance status to the B-BBEE level used by existing recognition logic. */
export function resolveEffectiveLevel(
  level: string,
  complianceStatus: ComplianceStatus,
): string {
  if (
    complianceStatus === 'non-compliant' ||
    complianceStatus === 'unknown' ||
    complianceStatus === 'expired'
  ) {
    return 'Non-Compliant'
  }
  return level
}

export function complianceFromLevel(level: string): ComplianceStatus {
  if (level === 'Non-Compliant' || level === '') return 'non-compliant'
  return 'compliant'
}
