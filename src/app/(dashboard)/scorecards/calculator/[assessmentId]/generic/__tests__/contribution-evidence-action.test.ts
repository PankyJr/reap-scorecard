import { beforeEach, describe, expect, it, vi } from 'vitest'
import { calculateGenericScorecard } from '@/lib/scorecard/generic'
import { completeScorecardInputs } from '@/lib/scorecard/generic/__tests__/fixtures'
import { buildGenericInputs, type StoredContributionRow } from '@/lib/scorecard/generic/persistence'

const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn((url: string): never => {
    throw new Error(`REDIRECT:${url}`)
  }),
  revalidatePath: vi.fn(),
}))

vi.mock('@/utils/supabase/server', () => ({ createClient: mocks.createClient }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('next/cache', () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock('server-only', () => ({}))

import {
  confirmContributionEvidence,
  correctContributionEvidenceReference,
  saveContributionRecord,
} from '../actions'

type StoredRecord = StoredContributionRow & {
  assessment_id: string
  source_sheet: string | null
  source_row_number: number | null
  updated_at: string
}

const assessmentId = '00000000-0000-4000-8000-000000000001'
const companyId = '00000000-0000-4000-8000-000000000002'
const userId = '00000000-0000-4000-8000-000000000003'
const recordId = '00000000-0000-4000-8000-000000000004'
const secondRecordId = '00000000-0000-4000-8000-000000000005'

/** Mirrors the cap enforced by the action and by the database function. */
const MAX_LENGTH = 160

let contributions: StoredRecord[]
let contribution: StoredRecord
let auditRows: Array<Record<string, unknown>>
let contributionUpdates: Array<Record<string, unknown>>
let contributionInserts: Array<Record<string, unknown>>
let recalculationUpdates: string[]
/** Set to make the targeted update match nothing, as a lost race would. */
let updatesMatchNothing: boolean
/** Set to make the atomic correction function fail, as a rolled-back call would. */
let rpcFailure: string | null

function contributionFor(elementKey = 'enterprise_development', id = recordId): StoredRecord {
  return {
    id,
    assessment_id: assessmentId,
    element_key: elementKey,
    beneficiary_name: 'Imported beneficiary',
    beneficiary_classification: elementKey === 'socio_economic_development' ? 'individual' : 'eme',
    beneficiary_black_ownership_percentage: elementKey === 'socio_economic_development' ? null : 1,
    was_eme_or_qse_at_first_assistance: elementKey === 'socio_economic_development' ? null : true,
    years_since_first_assistance: elementKey === 'socio_economic_development' ? null : 1,
    contribution_type: 'grant_contribution',
    actual_value: 300_000,
    supplied_benefit_factor: null,
    contribution_date: null,
    evidence_provided: false,
    evidence_reference: null,
    evidence_reference_corrected_at: null,
    black_beneficiary_percentage: elementKey === 'socio_economic_development' ? 1 : null,
    notes: 'Imported from workbook.',
    source_sheet: 'golden-populated-workbook.xlsx',
    source_row_number: 25,
    updated_at: '2026-08-01T00:00:00.000Z',
  }
}

class Query {
  private operation: 'select' | 'update' | 'insert' | 'delete' | null = null
  private payload: Record<string, unknown> | Array<Record<string, unknown>> | null = null
  private filters: Array<[string, unknown]> = []
  /** True once .select() is chained after a write, i.e. "return the rows". */
  private returning = false

  constructor(private readonly table: string) {}

  select() {
    if (this.operation === null) this.operation = 'select'
    else this.returning = true
    return this
  }

  update(payload: Record<string, unknown>) {
    this.operation = 'update'
    this.payload = payload
    return this
  }

  insert(payload: Record<string, unknown> | Array<Record<string, unknown>>) {
    this.operation = 'insert'
    this.payload = payload
    return this
  }

  delete() {
    this.operation = 'delete'
    return this
  }

  eq(column: string, value: unknown) {
    this.filters.push([column, value])
    return this
  }

  async maybeSingle() {
    const result = this.execute()
    const data = Array.isArray(result.data) ? (result.data[0] ?? null) : result.data
    return { data, error: result.error }
  }

  then<TResult1 = { data: unknown; error: unknown }, TResult2 = never>(
    onfulfilled?: ((value: { data: unknown; error: unknown }) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.execute()).then(onfulfilled, onrejected)
  }

  private matches(row: Record<string, unknown>) {
    return this.filters.every(([column, value]) => row[column] === value)
  }

  private execute(): { data: unknown; error: unknown } {
    const filter = (column: string) => this.filters.find(([name]) => name === column)?.[1]

    if (this.operation === 'select') {
      if (this.table === 'scorecard_assessments') {
        return {
          data: filter('id') === assessmentId ? [{ id: assessmentId, company_id: companyId }] : [],
          error: null,
        }
      }
      if (this.table === 'companies') {
        return {
          data: filter('id') === companyId ? [{ id: companyId, owner_id: userId }] : [],
          error: null,
        }
      }
      if (this.table === 'scorecard_contribution_records') {
        return {
          data: contributions.filter((row) => this.matches(row)).map((row) => ({ ...row })),
          error: null,
        }
      }
      return { data: [], error: null }
    }

    if (this.operation === 'update' && this.table === 'scorecard_contribution_records') {
      const payload = this.payload as Record<string, unknown>
      const matched = updatesMatchNothing ? [] : contributions.filter((row) => this.matches(row))
      if (matched.length > 0) contributionUpdates.push(payload)
      for (const row of matched) Object.assign(row, payload)
      return { data: this.returning ? matched.map((row) => ({ ...row })) : null, error: null }
    }

    if (
      this.operation === 'update' &&
      (this.table === 'scorecard_assessment_elements' || this.table === 'scorecard_assessments')
    ) {
      recalculationUpdates.push(this.table)
      return { data: null, error: null }
    }

    if (this.operation === 'insert' && this.table === 'scorecard_assessment_audit_log') {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload]
      auditRows.push(...(rows.filter(Boolean) as Array<Record<string, unknown>>))
      return { data: null, error: null }
    }

    if (this.operation === 'insert' && this.table === 'scorecard_contribution_records') {
      const rows = Array.isArray(this.payload) ? this.payload : [this.payload]
      contributionInserts.push(...(rows.filter(Boolean) as Array<Record<string, unknown>>))
      return { data: null, error: null }
    }

    return { data: null, error: null }
  }
}

/**
 * Stands in for public.correct_contribution_evidence_reference.
 *
 * It mirrors the migration's contract, including the part that matters most:
 * every check runs before anything is written, so a rejected correction leaves
 * neither the contribution row nor the audit log touched.
 */
function correctReferenceRpc(params: Record<string, string>) {
  if (rpcFailure) return { data: null, error: { message: rpcFailure } }

  const reference = (params.p_reference ?? '').trim()
  const reason = (params.p_reason ?? '').trim()
  if (!reference || reference.length > MAX_LENGTH) {
    return { data: null, error: { message: 'A corrected evidence reference is required.' } }
  }
  if (!reason || reason.length > MAX_LENGTH) {
    return { data: null, error: { message: 'A correction reason is required.' } }
  }

  const row = contributions.find(
    (candidate) =>
      candidate.id === params.p_record_id &&
      candidate.assessment_id === params.p_assessment_id &&
      candidate.element_key === params.p_element_key,
  )
  if (!row) return { data: null, error: { message: 'That contribution could not be found.' } }
  if (row.evidence_provided !== true) {
    return { data: null, error: { message: 'Evidence is not confirmed on that contribution.' } }
  }

  const previousReference = row.evidence_reference
  const correctedAt = '2026-08-27T00:00:00.000Z'
  row.evidence_reference = reference
  row.evidence_reference_corrected_at = correctedAt
  row.updated_at = correctedAt
  auditRows.push({
    assessment_id: params.p_assessment_id,
    action: 'contribution.evidence_reference_corrected',
    element_key: params.p_element_key,
    actor: userId,
    detail: {
      contributionRecordId: row.id,
      beneficiaryName: row.beneficiary_name,
      previousEvidenceReference: previousReference,
      newEvidenceReference: reference,
      correctionReason: reason,
      evidenceProvided: true,
      correctedAt,
    },
  })
  return { data: { ...row }, error: null }
}

const client = {
  auth: { getUser: vi.fn(async () => ({ data: { user: { id: userId } } })) },
  from: (table: string) => new Query(table),
  rpc: vi.fn(async (name: string, params: Record<string, string>) => {
    if (name === 'correct_contribution_evidence_reference') return correctReferenceRpc(params)
    return { data: null, error: { message: `unknown function ${name}` } }
  }),
}

function confirmationForm(overrides: Record<string, string> = {}) {
  const values = {
    assessmentId,
    elementKey: contribution.element_key,
    recordId: contribution.id,
    evidenceReference: 'Invoice INV-2026-0042',
    evidenceReviewed: 'on',
    ...overrides,
  }
  const formData = new FormData()
  for (const [key, value] of Object.entries(values)) formData.set(key, value)
  return formData
}

function correctionForm(overrides: Record<string, string> = {}) {
  const values = {
    assessmentId,
    elementKey: contribution.element_key,
    recordId: contribution.id,
    correctedEvidenceReference: 'Invoice INV-2026-0043',
    correctionReason: 'The invoice number was transposed when it was first captured.',
    ...overrides,
  }
  const formData = new FormData()
  for (const [key, value] of Object.entries(values)) formData.set(key, value)
  return formData
}

function enterpriseDevelopmentPoints() {
  const complete = completeScorecardInputs()
  const inputs = buildGenericInputs({
    assessment: {
      id: assessmentId,
      rule_set_key: 'generic-codes-2019-v1',
      eap_target_set_id: null,
      eap_target_snapshot: null,
      applicability_snapshot: complete.applicability,
      financial_inputs: complete.financial,
      ownership_inputs: complete.ownership,
      procurement_snapshot: null,
      scope_mode: 'modular',
      selected_elements: ['enterprise_development'],
    },
    elements: [],
    contributions,
  })
  return calculateGenericScorecard(inputs).elements.find(
    (element) => element.elementKey === 'enterprise_development',
  )!.basePointsAchieved
}

beforeEach(() => {
  contribution = contributionFor()
  contributions = [contribution]
  auditRows = []
  contributionUpdates = []
  contributionInserts = []
  recalculationUpdates = []
  updatesMatchNothing = false
  rpcFailure = null
  mocks.createClient.mockResolvedValue(client)
  mocks.redirect.mockClear()
  mocks.revalidatePath.mockClear()
  client.rpc.mockClear()
})

describe('confirmContributionEvidence', () => {
  it('takes an imported contribution from unrecognised to recognised through the UI action path', async () => {
    expect(enterpriseDevelopmentPoints()).toBe(0)

    await expect(confirmContributionEvidence(confirmationForm())).rejects.toThrow(
      /REDIRECT:.*evidence=confirmed/,
    )

    expect(contribution.evidence_provided).toBe(true)
    expect(contribution.evidence_reference).toBe('Invoice INV-2026-0042')
    expect(contribution.beneficiary_name).toBe('Imported beneficiary')
    expect(contribution.actual_value).toBe(300_000)
    expect(contribution.source_sheet).toBe('golden-populated-workbook.xlsx')
    expect(contributionUpdates).toHaveLength(1)
    expect(Object.keys(contributionUpdates[0]).sort()).toEqual(
      ['evidence_provided', 'evidence_reference', 'updated_at'].sort(),
    )

    expect(auditRows).toHaveLength(1)
    expect(auditRows[0]).toMatchObject({
      assessment_id: assessmentId,
      action: 'contribution.evidence_confirmed',
      element_key: 'enterprise_development',
      actor: userId,
      detail: {
        contributionRecordId: recordId,
        sourceSheet: 'golden-populated-workbook.xlsx',
        sourceRowNumber: 25,
        previousEvidenceProvided: false,
        newEvidenceProvided: true,
        evidenceReference: 'Invoice INV-2026-0042',
      },
    })
    expect(enterpriseDevelopmentPoints()).toBeGreaterThan(0)
  })

  it('fails visibly when the targeted update changes no row', async () => {
    updatesMatchNothing = true

    await expect(confirmContributionEvidence(confirmationForm())).rejects.toThrow(
      /no%20contribution%20was%20changed/,
    )

    expect(contribution.evidence_provided).toBe(false)
    expect(contribution.evidence_reference).toBeNull()
    expect(auditRows).toHaveLength(0)
    expect(recalculationUpdates).toHaveLength(0)
  })

  it('confirms two contributions on the same element without either clearing the other', async () => {
    const second = contributionFor('enterprise_development', secondRecordId)
    second.beneficiary_name = 'Second beneficiary'
    second.source_row_number = 26
    contributions = [contribution, second]

    await expect(
      confirmContributionEvidence(confirmationForm({ evidenceReference: 'Invoice INV-2026-0042' })),
    ).rejects.toThrow(/evidence=confirmed/)

    await expect(
      confirmContributionEvidence(
        confirmationForm({ recordId: second.id, evidenceReference: 'Agreement AG-2026-77' }),
      ),
    ).rejects.toThrow(/evidence=confirmed/)

    expect(contribution.evidence_provided).toBe(true)
    expect(second.evidence_provided).toBe(true)
    expect(contribution.evidence_reference).toBe('Invoice INV-2026-0042')
    expect(second.evidence_reference).toBe('Agreement AG-2026-77')

    expect(contributionUpdates).toHaveLength(2)
    expect(auditRows).toHaveLength(2)
    expect(auditRows.map((row) => (row.detail as Record<string, unknown>).contributionRecordId)).toEqual([
      recordId,
      secondRecordId,
    ])
    expect(auditRows.map((row) => (row.detail as Record<string, unknown>).evidenceReference)).toEqual([
      'Invoice INV-2026-0042',
      'Agreement AG-2026-77',
    ])
  })

  it('rejects confirmation without the required evidence reference', async () => {
    await expect(confirmContributionEvidence(confirmationForm({ evidenceReference: '   ' }))).rejects.toThrow(
      /Enter%20a%20reference/,
    )
    expect(contribution.evidence_provided).toBe(false)
    expect(contributionUpdates).toHaveLength(0)
    expect(auditRows).toHaveLength(0)
  })

  it('rejects an evidence reference longer than 160 characters', async () => {
    await expect(
      confirmContributionEvidence(confirmationForm({ evidenceReference: 'x'.repeat(MAX_LENGTH + 1) })),
    ).rejects.toThrow(/160%20characters/)
    expect(contributionUpdates).toHaveLength(0)
    expect(auditRows).toHaveLength(0)
  })

  it('requires the explicit evidence-review attestation', async () => {
    const formData = confirmationForm()
    formData.delete('evidenceReviewed')
    await expect(confirmContributionEvidence(formData)).rejects.toThrow(/reviewed%20and%20recorded/)
    expect(contributionUpdates).toHaveLength(0)
    expect(auditRows).toHaveLength(0)
  })

  it('does not overwrite or audit an already-confirmed record', async () => {
    contribution.evidence_provided = true
    contribution.evidence_reference = 'Original agreement AG-17'

    await expect(confirmContributionEvidence(confirmationForm())).rejects.toThrow(
      /evidence=already-confirmed/,
    )

    expect(contribution.evidence_reference).toBe('Original agreement AG-17')
    expect(contributionUpdates).toHaveLength(0)
    expect(auditRows).toHaveLength(0)
  })

  it('rejects a record outside the posted assessment or element', async () => {
    await expect(
      confirmContributionEvidence(confirmationForm({ recordId: '00000000-0000-4000-8000-999999999999' })),
    ).rejects.toThrow(/could%20not%20be%20found/)
    expect(contributionUpdates).toHaveLength(0)
    expect(auditRows).toHaveLength(0)
  })

  it.each([
    ['enterprise_development', 'enterprise-development'],
    ['supplier_development', 'supplier-development'],
    ['socio_economic_development', 'socio-economic-development'],
  ])('supports a record in %s', async (elementKey, step) => {
    contribution = contributionFor(elementKey)
    contributions = [contribution]
    await expect(confirmContributionEvidence(confirmationForm())).rejects.toThrow(
      new RegExp(`${step}\\?evidence=confirmed`),
    )
    expect(contribution.evidence_provided).toBe(true)
    expect(contribution.evidence_reference).toBe('Invoice INV-2026-0042')
  })
})

describe('correctContributionEvidenceReference', () => {
  beforeEach(() => {
    contribution.evidence_provided = true
    contribution.evidence_reference = 'Invoice INV-2026-0042'
  })

  it('amends the reference through the atomic function, keeps the confirmation and leaves the score alone', async () => {
    const pointsBefore = enterpriseDevelopmentPoints()

    await expect(correctContributionEvidenceReference(correctionForm())).rejects.toThrow(
      /REDIRECT:.*evidence=corrected/,
    )

    // One call, carrying the trimmed values, is the whole write.
    expect(client.rpc).toHaveBeenCalledTimes(1)
    expect(client.rpc).toHaveBeenCalledWith('correct_contribution_evidence_reference', {
      p_assessment_id: assessmentId,
      p_record_id: recordId,
      p_element_key: 'enterprise_development',
      p_reference: 'Invoice INV-2026-0043',
      p_reason: 'The invoice number was transposed when it was first captured.',
    })
    // No separate table write: the update and the audit entry are the function's.
    expect(contributionUpdates).toHaveLength(0)

    expect(contribution.evidence_reference).toBe('Invoice INV-2026-0043')
    expect(contribution.evidence_provided).toBe(true)
    expect(contribution.evidence_reference_corrected_at).toBeTruthy()
    expect(contribution.actual_value).toBe(300_000)
    expect(contribution.source_sheet).toBe('golden-populated-workbook.xlsx')

    expect(auditRows).toHaveLength(1)
    expect(auditRows[0]).toMatchObject({
      assessment_id: assessmentId,
      action: 'contribution.evidence_reference_corrected',
      element_key: 'enterprise_development',
      actor: userId,
      detail: {
        contributionRecordId: recordId,
        previousEvidenceReference: 'Invoice INV-2026-0042',
        newEvidenceReference: 'Invoice INV-2026-0043',
        correctionReason: 'The invoice number was transposed when it was first captured.',
        evidenceProvided: true,
      },
    })

    // Correcting a document pointer changes no recognised value.
    expect(recalculationUpdates).toHaveLength(0)
    expect(enterpriseDevelopmentPoints()).toBe(pointsBefore)
  })

  it('adds a correction event without disturbing the original confirmation event', async () => {
    contribution.evidence_provided = false
    contribution.evidence_reference = null

    await expect(confirmContributionEvidence(confirmationForm())).rejects.toThrow(/evidence=confirmed/)
    const confirmationEvent = { ...auditRows[0] }

    await expect(correctContributionEvidenceReference(correctionForm())).rejects.toThrow(
      /evidence=corrected/,
    )

    expect(auditRows).toHaveLength(2)
    expect(auditRows[0]).toEqual(confirmationEvent)
    expect(auditRows[0].action).toBe('contribution.evidence_confirmed')
    expect(auditRows[1].action).toBe('contribution.evidence_reference_corrected')
  })

  it('rejects a whitespace-only corrected reference', async () => {
    await expect(
      correctContributionEvidenceReference(correctionForm({ correctedEvidenceReference: '   ' })),
    ).rejects.toThrow(/Enter%20the%20corrected%20reference/)
    expect(contribution.evidence_reference).toBe('Invoice INV-2026-0042')
    expect(client.rpc).not.toHaveBeenCalled()
    expect(auditRows).toHaveLength(0)
  })

  it('rejects a corrected reference longer than 160 characters', async () => {
    await expect(
      correctContributionEvidenceReference(
        correctionForm({ correctedEvidenceReference: 'x'.repeat(MAX_LENGTH + 1) }),
      ),
    ).rejects.toThrow(/160%20characters/)
    expect(contribution.evidence_reference).toBe('Invoice INV-2026-0042')
    expect(client.rpc).not.toHaveBeenCalled()
    expect(auditRows).toHaveLength(0)
  })

  it('rejects a whitespace-only correction reason', async () => {
    await expect(
      correctContributionEvidenceReference(correctionForm({ correctionReason: '   ' })),
    ).rejects.toThrow(/Enter%20the%20reason/)
    expect(contribution.evidence_reference).toBe('Invoice INV-2026-0042')
    expect(client.rpc).not.toHaveBeenCalled()
    expect(auditRows).toHaveLength(0)
  })

  it('rejects a correction reason longer than 160 characters', async () => {
    await expect(
      correctContributionEvidenceReference(correctionForm({ correctionReason: 'x'.repeat(MAX_LENGTH + 1) })),
    ).rejects.toThrow(/Correction%20reason%20must%20be%20160%20characters/)
    expect(contribution.evidence_reference).toBe('Invoice INV-2026-0042')
    expect(client.rpc).not.toHaveBeenCalled()
    expect(auditRows).toHaveLength(0)
  })

  it('refuses to correct a contribution whose evidence was never confirmed', async () => {
    contribution.evidence_provided = false
    contribution.evidence_reference = null

    await expect(correctContributionEvidenceReference(correctionForm())).rejects.toThrow(
      /confirmed%20supporting%20evidence/,
    )
    expect(contribution.evidence_reference).toBeNull()
    expect(client.rpc).not.toHaveBeenCalled()
    expect(auditRows).toHaveLength(0)
  })

  it('refuses a correction that changes nothing', async () => {
    await expect(
      correctContributionEvidenceReference(
        correctionForm({ correctedEvidenceReference: '  Invoice INV-2026-0042  ' }),
      ),
    ).rejects.toThrow(/same%20as%20the%20reference/)
    expect(client.rpc).not.toHaveBeenCalled()
    expect(auditRows).toHaveLength(0)
  })

  it('rejects a record outside the posted assessment or element', async () => {
    await expect(
      correctContributionEvidenceReference(
        correctionForm({ recordId: '00000000-0000-4000-8000-999999999999' }),
      ),
    ).rejects.toThrow(/could%20not%20be%20found/)
    expect(client.rpc).not.toHaveBeenCalled()
    expect(auditRows).toHaveLength(0)
  })

  it('writes nothing at all when the atomic function fails', async () => {
    rpcFailure = 'deadlock detected'

    await expect(correctContributionEvidenceReference(correctionForm())).rejects.toThrow(
      /nothing%20was%20changed/,
    )

    expect(client.rpc).toHaveBeenCalledTimes(1)
    expect(contribution.evidence_reference).toBe('Invoice INV-2026-0042')
    expect(contribution.evidence_reference_corrected_at).toBeNull()
    expect(contribution.evidence_provided).toBe(true)
    expect(auditRows).toHaveLength(0)
  })
})

describe('saveContributionRecord and evidence state', () => {
  it('does not let the Add contribution path confirm evidence without a reference', async () => {
    const formData = new FormData()
    formData.set('assessmentId', assessmentId)
    formData.set('elementKey', 'enterprise_development')
    formData.set('beneficiaryName', 'New beneficiary')
    formData.set('actualValue', '1000')
    formData.set('evidenceProvided', 'on')

    await expect(saveContributionRecord(formData)).rejects.toThrow(/Enter%20a%20reference/)
    expect(contributionInserts).toHaveLength(0)
    expect(auditRows).toHaveLength(0)
  })

  it('rejects a whitespace-only reference on the Add contribution path', async () => {
    const formData = new FormData()
    formData.set('assessmentId', assessmentId)
    formData.set('elementKey', 'enterprise_development')
    formData.set('beneficiaryName', 'New beneficiary')
    formData.set('actualValue', '1000')
    formData.set('evidenceProvided', 'on')
    formData.set('evidenceReference', '    ')

    await expect(saveContributionRecord(formData)).rejects.toThrow(/Enter%20a%20reference/)
    expect(contributionInserts).toHaveLength(0)
    expect(auditRows).toHaveLength(0)
  })

  it('records what the user actually ticked when a contribution is created with evidence', async () => {
    const formData = new FormData()
    formData.set('assessmentId', assessmentId)
    formData.set('elementKey', 'enterprise_development')
    formData.set('beneficiaryName', 'New beneficiary')
    formData.set('actualValue', '1000')
    formData.set('evidenceProvided', 'on')
    formData.set('evidenceReference', '  Invoice INV-2026-0100  ')

    await expect(saveContributionRecord(formData)).rejects.toThrow(/REDIRECT:.*saved=1/)

    expect(contributionInserts).toHaveLength(1)
    expect(contributionInserts[0]).toMatchObject({
      evidence_provided: true,
      evidence_reference: 'Invoice INV-2026-0100',
    })
    expect(auditRows).toHaveLength(1)
    expect(auditRows[0]).toMatchObject({
      action: 'contribution.created',
      detail: {
        evidenceProvided: true,
        evidenceReference: 'Invoice INV-2026-0100',
        attestation: 'Supporting evidence has been recorded',
      },
    })
  })

  it.each([
    ['a posted evidence checkbox', { evidenceProvided: 'on' }],
    ['a posted evidence reference', { evidenceReference: 'Forged reference FR-1' }],
  ])('refuses to change evidence state on an existing contribution through %s', async (_label, extra) => {
    contribution.evidence_provided = true
    contribution.evidence_reference = 'Invoice INV-2026-0042'

    const formData = new FormData()
    formData.set('assessmentId', assessmentId)
    formData.set('elementKey', 'enterprise_development')
    formData.set('recordId', recordId)
    formData.set('beneficiaryName', 'Renamed beneficiary')
    formData.set('actualValue', '1000')
    for (const [key, value] of Object.entries(extra)) formData.set(key, value)

    await expect(saveContributionRecord(formData)).rejects.toThrow(/Correct%20reference/)

    expect(contribution.evidence_provided).toBe(true)
    expect(contribution.evidence_reference).toBe('Invoice INV-2026-0042')
    expect(contributionUpdates).toHaveLength(0)
    expect(auditRows).toHaveLength(0)
  })

  it('cannot blank a confirmed reference by editing the record', async () => {
    contribution.evidence_provided = true
    contribution.evidence_reference = 'Invoice INV-2026-0042'

    const formData = new FormData()
    formData.set('assessmentId', assessmentId)
    formData.set('elementKey', 'enterprise_development')
    formData.set('recordId', recordId)
    formData.set('beneficiaryName', 'Renamed beneficiary')
    formData.set('actualValue', '1000')
    // The checkbox simply absent — the old silent "unconfirm".

    await expect(saveContributionRecord(formData)).rejects.toThrow(/REDIRECT:.*saved=1/)

    expect(contributionUpdates).toHaveLength(1)
    expect(Object.keys(contributionUpdates[0])).not.toContain('evidence_provided')
    expect(Object.keys(contributionUpdates[0])).not.toContain('evidence_reference')
    expect(contribution.evidence_provided).toBe(true)
    expect(contribution.evidence_reference).toBe('Invoice INV-2026-0042')
    expect(contribution.beneficiary_name).toBe('Renamed beneficiary')
  })
})
