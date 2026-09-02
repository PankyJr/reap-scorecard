import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  EVIDENCE_ATTESTATION,
  EVIDENCE_CHECKBOX_LABEL,
  EVIDENCE_CONFIRM_LABEL,
  EVIDENCE_CORRECT_LABEL,
} from '../evidence-copy'

const generic = (file: string) =>
  readFileSync(
    resolve(process.cwd(), 'src/app/(dashboard)/scorecards/calculator/[assessmentId]/generic', file),
    'utf8',
  )

const source = generic('ContributionStep.tsx')
const addFields = generic('AddContributionEvidenceFields.tsx')

describe('imported contribution evidence controls', () => {
  it('posts each record through the dedicated confirmation action', () => {
    expect(source).toContain('action={confirmContributionEvidence}')
    expect(source).toContain('name="recordId" value={row.id}')
    expect(source).toContain('name="elementKey" value={args.elementKey}')
  })

  it('requires a bounded evidence reference and explicit review attestation', () => {
    expect(source).toMatch(
      /name="evidenceReference"[\s\S]*required[\s\S]*maxLength=\{MAX_EVIDENCE_REFERENCE_LENGTH\}/,
    )
    expect(source).toMatch(/name="evidenceReviewed"[\s\S]*required/)
    expect(source).toContain('{EVIDENCE_ATTESTATION}')
  })

  it('shows the confirmed state and stored reference on the record row', () => {
    expect(source).toContain('Supporting evidence confirmed')
    expect(source).toContain('row.evidence_reference')
  })

  it('does not expose a bulk evidence confirmation action', () => {
    expect(source).not.toMatch(/confirmAllEvidence|bulkConfirmEvidence|Confirm all evidence/)
  })
})

describe('evidence reference correction', () => {
  it('offers a per-record correction posted through the dedicated action', () => {
    expect(source).toContain('action={correctContributionEvidenceReference}')
    expect(source).toContain('{EVIDENCE_CORRECT_LABEL}')
  })

  it('requires a bounded corrected reference and a bounded reason', () => {
    expect(source).toMatch(
      /name="correctedEvidenceReference"[\s\S]*required[\s\S]*maxLength=\{MAX_EVIDENCE_REFERENCE_LENGTH\}/,
    )
    expect(source).toMatch(
      /name="correctionReason"[\s\S]*required[\s\S]*maxLength=\{MAX_EVIDENCE_REFERENCE_LENGTH\}/,
    )
  })

  it('marks an amended reference on the row itself, not only in the audit log', () => {
    expect(source).toContain('row.evidence_reference_corrected_at')
    expect(source).toContain('Reference corrected')
  })

  it('is only offered once evidence is confirmed', () => {
    const confirmedBranch = source.slice(
      source.indexOf('{row.evidence_provided ? ('),
      source.indexOf('action={confirmContributionEvidence}'),
    )
    expect(confirmedBranch).toContain('action={correctContributionEvidenceReference}')
  })
})

describe('evidence wording', () => {
  it('points an unrecognised contribution at the control that is actually on the row', () => {
    expect(source).toContain('${EVIDENCE_CONFIRM_LABEL}')
    expect(source).toContain('${EVIDENCE_ATTESTATION}')
    // The old copy sent the user to the "Add contribution" checkbox, which is
    // not the control that confirms an existing record.
    expect(source).not.toContain(`tick "${EVIDENCE_CHECKBOX_LABEL}"`)
  })

  it('shares one hint between the row field and the Add contribution field', () => {
    expect(source).toContain('hint={EVIDENCE_REFERENCE_HINT_REQUIRED}')
    expect(addFields).toContain('hint={EVIDENCE_REFERENCE_HINT_CONDITIONAL}')
    // Neither file restates the hint by hand.
    expect(source).not.toContain('Enter an invoice number')
    expect(addFields).not.toContain('Enter an invoice number')
  })

  it('keeps every user-facing evidence label in one module', () => {
    for (const label of [EVIDENCE_ATTESTATION, EVIDENCE_CHECKBOX_LABEL, EVIDENCE_CONFIRM_LABEL, EVIDENCE_CORRECT_LABEL]) {
      expect(source).not.toContain(`"${label}"`)
      expect(source).not.toContain(`>${label}<`)
    }
  })
})

describe('Add contribution evidence fields', () => {
  it('makes the reference browser-required exactly when the checkbox is ticked', () => {
    expect(addFields).toContain("'use client'")
    expect(addFields).toMatch(/name="evidenceReference"[\s\S]*required=\{evidenceProvided\}/)
    expect(addFields).toMatch(/name="evidenceProvided"[\s\S]*checked=\{evidenceProvided\}/)
  })

  it('is what the Add contribution form renders', () => {
    expect(source).toContain('<AddContributionEvidenceFields />')
    expect(source).not.toMatch(/<input type="checkbox" name="evidenceProvided"/)
  })
})
