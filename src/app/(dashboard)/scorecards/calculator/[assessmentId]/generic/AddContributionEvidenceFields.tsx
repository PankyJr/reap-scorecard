'use client'

import { useState } from 'react'
import { Field } from './ui'
import {
  EVIDENCE_CHECKBOX_HELP,
  EVIDENCE_CHECKBOX_LABEL,
  EVIDENCE_REFERENCE_EXAMPLE,
  EVIDENCE_REFERENCE_HINT_CONDITIONAL,
  EVIDENCE_REFERENCE_SOURCE,
  MAX_EVIDENCE_REFERENCE_LENGTH,
} from './evidence-copy'

/**
 * The evidence pair on the "Add contribution" form.
 *
 * A reference only means anything once the checkbox is ticked, so the browser
 * requires it exactly then. This puts the failure in front of the user before
 * the round trip; it does not replace the server-side rule in
 * `saveContributionRecord`, which still rejects a missing, whitespace-only or
 * over-long reference.
 */
export function AddContributionEvidenceFields() {
  const [evidenceProvided, setEvidenceProvided] = useState(false)

  return (
    <>
      <Field
        label="Evidence reference"
        name="evidenceReference"
        required={evidenceProvided}
        maxLength={MAX_EVIDENCE_REFERENCE_LENGTH}
        source={EVIDENCE_REFERENCE_SOURCE}
        example={EVIDENCE_REFERENCE_EXAMPLE}
        hint={EVIDENCE_REFERENCE_HINT_CONDITIONAL}
      />
      <label className="flex min-h-11 items-start gap-2 py-2 text-body text-ink sm:col-span-2">
        <input
          type="checkbox"
          name="evidenceProvided"
          checked={evidenceProvided}
          onChange={(event) => setEvidenceProvided(event.target.checked)}
          className="mt-0.5 rounded border-line-strong"
        />
        <span>
          {EVIDENCE_CHECKBOX_LABEL}
          <span className="mt-0.5 block text-meta text-label">{EVIDENCE_CHECKBOX_HELP}</span>
        </span>
      </label>
    </>
  )
}
