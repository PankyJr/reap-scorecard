/**
 * Wording shared between the contribution forms, the "not recognised" warning
 * and the audit trail.
 *
 * These live in one module for a reason: a warning that tells the user to tick
 * a control whose label has since changed sends them hunting for something
 * that is not on the page, and an audit entry that records an attestation the
 * user was never shown is worse than no attestation at all.
 */

/** Ticked inside the per-record confirmation form. */
export const EVIDENCE_ATTESTATION =
  'I reviewed and recorded the supporting evidence for this contribution.'

/** Ticked on the "Add contribution" form. */
export const EVIDENCE_CHECKBOX_LABEL = 'Supporting evidence has been recorded'

/** Button that opens/submits the per-record confirmation form. */
export const EVIDENCE_CONFIRM_LABEL = 'Confirm supporting evidence'

/** Button that opens/submits the per-record correction form. */
export const EVIDENCE_CORRECT_LABEL = 'Correct reference'

/**
 * The half of the evidence-reference hint that never changes. Both fields say
 * the same thing about what to type; only the requiredness clause differs,
 * because the Add form's field is required only once the checkbox is ticked.
 */
export const EVIDENCE_REFERENCE_HINT_BODY =
  'Enter an invoice number, agreement name or document reference.'

export const EVIDENCE_REFERENCE_HINT_REQUIRED = `Required. ${EVIDENCE_REFERENCE_HINT_BODY}`

export const EVIDENCE_REFERENCE_HINT_CONDITIONAL =
  `Required once you tick "${EVIDENCE_CHECKBOX_LABEL}". ${EVIDENCE_REFERENCE_HINT_BODY}`

/** Longest accepted evidence reference, and correction reason, in characters. */
export const MAX_EVIDENCE_REFERENCE_LENGTH = 160
