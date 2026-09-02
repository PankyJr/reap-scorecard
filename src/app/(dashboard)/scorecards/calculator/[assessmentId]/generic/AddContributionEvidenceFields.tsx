'use client'

import { useState } from 'react'
import { Field } from './ui'
import {
  EVIDENCE_CHECKBOX_LABEL,
  EVIDENCE_REFERENCE_HINT_CONDITIONAL,
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
        hint={EVIDENCE_REFERENCE_HINT_CONDITIONAL}
      />
      <label className="flex items-center gap-2 text-sm text-slate-800 sm:col-span-2">
        <input
          type="checkbox"
          name="evidenceProvided"
          checked={evidenceProvided}
          onChange={(event) => setEvidenceProvided(event.target.checked)}
          className="rounded border-slate-300"
        />
        {EVIDENCE_CHECKBOX_LABEL}
      </label>
    </>
  )
}
