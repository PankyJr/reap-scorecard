import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

/**
 * When a save fails, the person sees plain words; the technical detail
 * (database codes, missing columns, migrations) goes to the server log only.
 */
const mocks = vi.hoisted(() => ({
  createClient: vi.fn(),
  redirect: vi.fn((url: string): never => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

vi.mock('@/utils/supabase/server', () => ({ createClient: mocks.createClient }))
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }))
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }))

import { createProcurementAssessment } from '../actions'
import { updateProcurementAssessment } from '../../[id]/actions'

const USER = 'user-1'
const COMPANY = '00000000-0000-4000-8000-000000000001'
const ASSESSMENT = '00000000-0000-4000-8000-0000000000a1'

type Failure = { code?: string; message: string }
/** `${table}.${op}` → the error that write returns. */
let failures: Record<string, Failure> = {}

/** Just enough of the client for these actions: every read succeeds, chosen writes fail. */
function client() {
  const query = (table: string) => {
    let op = 'select'
    const q = {
      select: () => q,
      insert: () => ((op = 'insert'), q),
      update: () => ((op = 'update'), q),
      delete: () => ((op = 'delete'), q),
      eq: () => q,
      single: () => q,
      maybeSingle: () => q,
      then(resolve: (value: { data: unknown; error: Failure | null }) => unknown) {
        const error = failures[`${table}.${op}`] ?? null
        let data: unknown = null
        if (!error && op === 'select' && table === 'companies') data = { id: COMPANY, owner_id: USER, name: 'Acme' }
        if (!error && op === 'select' && table === 'procurement_assessments') {
          data = { id: ASSESSMENT, company_id: COMPANY, company: { id: COMPANY, name: 'Acme', owner_id: USER } }
        }
        if (!error && op === 'insert' && table === 'procurement_assessments') data = [{ id: ASSESSMENT }]
        return Promise.resolve({ data, error }).then(resolve)
      },
    }
    return q
  }
  return { auth: { getUser: async () => ({ data: { user: { id: USER, email: 'u@example.com' } } }) }, from: query }
}

function form(over: Record<string, string> = {}) {
  const fd = new FormData()
  const fields: Record<string, string> = {
    company_id: COMPANY,
    assessment_id: ASSESSMENT,
    assessment_year: '2025',
    tmps_denominator_source: 'import_supplier_total',
    suppliers_json: JSON.stringify([
      {
        supplier_name: 'Steel Co',
        supplier_type: 'Generic',
        level: '1',
        value_ex_vat: 1000,
        is_51_black_owned: true,
        is_30_black_women_owned: false,
        is_51_bdgs: false,
        is_51_percent_flow_through: false,
      },
    ]),
    ...over,
  }
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

/** The message the person is sent back with. */
async function shownError(run: () => Promise<unknown>): Promise<string> {
  try {
    await run()
  } catch (e) {
    const url = String((e as Error).message).replace(/^REDIRECT:/, '')
    return new URL(url, 'http://x').searchParams.get('error') ?? `(no error; went to ${url})`
  }
  return '(no redirect)'
}

const TECHNICAL = /migration|Supabase|database|column|PGRST|TMPS|category results|supplier rows/i

let logged: string[]
beforeEach(() => {
  failures = {}
  logged = []
  mocks.createClient.mockResolvedValue(client())
  vi.spyOn(console, 'error').mockImplementation((...args: unknown[]) => {
    logged.push(args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' '))
  })
  vi.stubEnv('NODE_ENV', 'production')
})
afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('saving a new procurement scorecard fails', () => {
  it('because the database is missing columns: plain words on screen, the detail in the log', async () => {
    failures['procurement_assessments.insert'] = {
      code: 'PGRST204',
      message: "Could not find the 'tmps_custom_inclusions' column of 'procurement_assessments' in the schema cache",
    }
    const shown = await shownError(() => createProcurementAssessment(form()))
    expect(shown).toBe('The scorecard could not be saved. Try again, and if it keeps happening contact REAP support.')
    expect(shown).not.toMatch(TECHNICAL)
    expect(logged.join('\n')).toMatch(/missing procurement columns\. Apply the pending Supabase migrations/)
    expect(logged.join('\n')).toContain('tmps_custom_inclusions')
  })

  it('while saving the suppliers or the scores: plain words', async () => {
    failures['procurement_suppliers.insert'] = { code: '23502', message: 'null value in column "level" violates not-null constraint' }
    const suppliers = await shownError(() => createProcurementAssessment(form()))
    expect(suppliers).toBe('The suppliers could not be saved. Try again, and if it keeps happening contact REAP support.')

    failures = { 'procurement_results.insert': { code: '42501', message: 'new row violates row-level security policy' } }
    const scores = await shownError(() => createProcurementAssessment(form()))
    expect(scores).toBe('The scores could not be saved. Try again, and if it keeps happening contact REAP support.')
    expect([suppliers, scores].join(' ')).not.toMatch(TECHNICAL)
  })

  it('because total spend is zero: says so without the acronym', async () => {
    const shown = await shownError(() =>
      createProcurementAssessment(
        form({
          suppliers_json: JSON.stringify([
            { supplier_name: 'Zero Co', supplier_type: 'Generic', level: '1', value_ex_vat: 0, is_51_black_owned: false, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },
          ]),
        }),
      ),
    )
    expect(shown).toBe('The suppliers’ spend adds up to zero. Enter each supplier’s spend, or work out total spend from the included and excluded costs.')
    expect(shown).not.toMatch(TECHNICAL)
  })
})

describe('saving changes to a procurement scorecard fails', () => {
  it('before anything saved changed: plain words', async () => {
    failures['procurement_results.delete'] = { code: '42501', message: 'permission denied for table procurement_results' }
    const shown = await shownError(() => updateProcurementAssessment(form()))
    expect(shown).toBe('The changes could not be saved. Try again, and if it keeps happening contact REAP support.')
  })

  it('part-way, after the saved suppliers were cleared: says the saved scorecard may be incomplete', async () => {
    failures['procurement_suppliers.insert'] = { code: '57014', message: 'canceling statement due to statement timeout' }
    const shown = await shownError(() => updateProcurementAssessment(form()))
    expect(shown).toBe(
      'The changes could not be saved, and the saved scorecard may now be incomplete. Open it to check its suppliers and score, save it again if anything is missing, and contact REAP support if it keeps happening.',
    )
    expect(shown).not.toMatch(TECHNICAL)
  })
})
