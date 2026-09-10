/**
 * Seed the PUBLIC DEMO instance with fabricated supplier data.
 *
 *   npx tsx scripts/seed-demo-data.ts
 *
 * ── WHY THIS SCRIPT REFUSES TO RUN BY DEFAULT ───────────────────────────────
 *
 * This writes rows. Pointed at the wrong project it would inject fake suppliers
 * into a database holding real client data. So it is fail-closed: it will not
 * run unless the operator NAMES the target project ref in DEMO_SUPABASE_PROJECT_REF
 * and that ref matches the URL being used. Naming the wrong thing is a typo;
 * naming nothing is an accident, and an accident must not be enough.
 *
 * It additionally hard-refuses the known production and staging refs, so even a
 * correct-looking pair of variables cannot reach them.
 *
 * ── REQUIRED ENVIRONMENT ────────────────────────────────────────────────────
 *
 *   NEXT_PUBLIC_SUPABASE_URL       the DEMO project URL
 *   SUPABASE_SERVICE_ROLE_KEY      the DEMO project service-role key
 *   DEMO_SUPABASE_PROJECT_REF      the demo project ref, typed deliberately
 *
 * Keep these in a gitignored file (e.g. .env.demo.local) and load it:
 *   set -a; . ./.env.demo.local; set +a; npx tsx scripts/seed-demo-data.ts
 *
 * ── DATA ────────────────────────────────────────────────────────────────────
 *
 * Every company and supplier name below is invented and carries a "(Demo)"
 * suffix so it can never be mistaken for a real registered entity. Spend
 * figures are plausible but fictional.
 *
 * Recognition percentages and B-BBEE spend are NOT hardcoded: they are produced
 * by the application's own calculateSupplierRow(), so seeded data cannot drift
 * away from what the engine would compute.
 */

import { createClient } from '@supabase/supabase-js'

import { calculateSupplierRow, type ProcurementSupplierInput } from '../src/lib/procurement/rows'

// Projects this script must never touch, whatever the environment says.
const FORBIDDEN_REFS: Record<string, string> = {
  pmjuiynjelhjlpyohbvk: 'PRODUCTION (real REAP Solutions client data)',
  jzvqyryblsfxlinvoiuf: 'STAGING (shared QA data)',
}

const DEMO_USER_EMAIL = 'demo@reap-demo.invalid'
const DEMO_COMPANY_NAME = 'Karoo Ridge Manufacturing (Demo)'
const ASSESSMENT_YEAR = 2026

/**
 * Fabricated suppliers, spread deliberately across levels so that changing one
 * assumption visibly moves the score in the what-if modelling screen:
 *  - large Level 4 spend at 100% recognition is the obvious upgrade candidate
 *  - two non-compliant suppliers create clear headroom
 *  - EME/QSE mix exercises the separate EME and QSE category targets
 */
const SUPPLIERS: ProcurementSupplierInput[] = [
  // Large, compliant, the backbone of the spend
  { supplier_name: 'Thornveld Steel Supplies (Demo)', supplier_type: 'Generic', level: '4', value_ex_vat: 8_400_000, is_51_black_owned: false, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },
  { supplier_name: 'Blue Crane Industrial Coatings (Demo)', supplier_type: 'Generic', level: '2', value_ex_vat: 6_150_000, is_51_black_owned: true, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },
  { supplier_name: 'Silverthorn Freight Systems (Demo)', supplier_type: 'Generic', level: '4', value_ex_vat: 5_720_000, is_51_black_owned: false, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },
  { supplier_name: 'Highveld Precision Castings (Demo)', supplier_type: 'Generic', level: '3', value_ex_vat: 4_980_000, is_51_black_owned: false, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },

  // The obvious improvement targets — large spend, poor recognition
  { supplier_name: 'Graymoor Bulk Chemicals (Demo)', supplier_type: 'Generic', level: '8', value_ex_vat: 3_640_000, is_51_black_owned: false, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },
  { supplier_name: 'Ironbark Import Agency (Demo)', supplier_type: 'Generic', level: 'Non-Compliant', value_ex_vat: 2_910_000, is_51_black_owned: false, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },
  { supplier_name: 'Meridian Tooling Imports (Demo)', supplier_type: 'Generic', level: '7', value_ex_vat: 1_480_000, is_51_black_owned: false, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },

  // QSEs — exercise the QSE category target
  { supplier_name: 'Umdoni Valley Packaging (Demo)', supplier_type: 'QSE', level: '1', value_ex_vat: 2_340_000, is_51_black_owned: true, is_30_black_women_owned: true, is_51_bdgs: false, is_51_percent_flow_through: true },
  { supplier_name: 'Rooiberg Fabrication Works (Demo)', supplier_type: 'QSE', level: '2', value_ex_vat: 1_875_000, is_51_black_owned: true, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },
  { supplier_name: 'Stillwater Calibration Services (Demo)', supplier_type: 'QSE', level: '4', value_ex_vat: 1_260_000, is_51_black_owned: false, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },
  { supplier_name: 'Nkosazana Technical Cleaning (Demo)', supplier_type: 'QSE', level: '1', value_ex_vat: 980_000, is_51_black_owned: true, is_30_black_women_owned: true, is_51_bdgs: true, is_51_percent_flow_through: false },

  // EMEs — exercise the EME category target
  { supplier_name: 'Sandstone Courier Collective (Demo)', supplier_type: 'EME', level: '1', value_ex_vat: 845_000, is_51_black_owned: true, is_30_black_women_owned: true, is_51_bdgs: false, is_51_percent_flow_through: true },
  { supplier_name: 'Wildeklawer Catering Co-op (Demo)', supplier_type: 'EME', level: '1', value_ex_vat: 612_000, is_51_black_owned: true, is_30_black_women_owned: true, is_51_bdgs: true, is_51_percent_flow_through: false },
  { supplier_name: 'Bushbuck Signage Studio (Demo)', supplier_type: 'EME', level: '2', value_ex_vat: 487_500, is_51_black_owned: true, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },
  { supplier_name: 'Klipfontein Safety Wear (Demo)', supplier_type: 'EME', level: '1', value_ex_vat: 396_000, is_51_black_owned: true, is_30_black_women_owned: false, is_51_bdgs: true, is_51_percent_flow_through: false },
  { supplier_name: 'Loeriesfontein Plant Hire (Demo)', supplier_type: 'EME', level: '4', value_ex_vat: 318_000, is_51_black_owned: false, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },

  // Mid-range, mixed
  { supplier_name: 'Drakensberg IT Managed Services (Demo)', supplier_type: 'Generic', level: '5', value_ex_vat: 1_640_000, is_51_black_owned: false, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },
  { supplier_name: 'Tsitsikamma Timber Products (Demo)', supplier_type: 'Generic', level: '6', value_ex_vat: 1_205_000, is_51_black_owned: false, is_30_black_women_owned: false, is_51_bdgs: false, is_51_percent_flow_through: false },
]

function assertDemoTarget(url: string): string {
  const match = url.match(/https:\/\/([a-z0-9]+)\.supabase\.co/)
  if (!match) {
    throw new Error(`NEXT_PUBLIC_SUPABASE_URL is not a Supabase project URL: ${url}`)
  }
  const ref = match[1]

  const forbidden = FORBIDDEN_REFS[ref]
  if (forbidden) {
    throw new Error(
      `REFUSING TO SEED. The target project ${ref} is ${forbidden}.\n` +
        'This script only ever writes to a dedicated demo project.',
    )
  }

  const declared = (process.env.DEMO_SUPABASE_PROJECT_REF ?? '').trim()
  if (!declared) {
    throw new Error(
      'REFUSING TO SEED. Set DEMO_SUPABASE_PROJECT_REF to the demo project ref.\n' +
        'Naming the target is deliberate: it is what stops this running against the wrong database by accident.',
    )
  }
  if (declared !== ref) {
    throw new Error(
      `REFUSING TO SEED. DEMO_SUPABASE_PROJECT_REF is "${declared}" but the URL points at "${ref}".`,
    )
  }

  return ref
}

async function main() {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').trim()
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ?? '').trim()
  if (!url || !key) {
    throw new Error('Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for the DEMO project.')
  }

  const ref = assertDemoTarget(url)
  console.log(`Seeding demo project ${ref}`)

  const admin = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // ---------------------------------------------------------------------
  // Demo user
  // ---------------------------------------------------------------------
  const password = process.env.DEMO_USER_PASSWORD
  if (!password) {
    throw new Error('Set DEMO_USER_PASSWORD (never hardcode a password in this repo).')
  }

  const { data: existingUsers } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
  let userId = existingUsers?.users?.find((u) => u.email === DEMO_USER_EMAIL)?.id
  if (userId) {
    await admin.auth.admin.updateUserById(userId, { password, email_confirm: true })
    console.log(`  user  ${DEMO_USER_EMAIL} (updated)`)
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: DEMO_USER_EMAIL,
      password,
      email_confirm: true,
    })
    if (error) throw error
    userId = data.user!.id
    console.log(`  user  ${DEMO_USER_EMAIL} (created)`)
  }

  // ---------------------------------------------------------------------
  // Company — idempotent by name
  // ---------------------------------------------------------------------
  const { data: existingCompany } = await admin
    .from('companies')
    .select('id')
    .eq('name', DEMO_COMPANY_NAME)
    .maybeSingle()

  let companyId = existingCompany?.id as string | undefined
  if (!companyId) {
    const { data, error } = await admin
      .from('companies')
      .insert({
        name: DEMO_COMPANY_NAME,
        owner_id: userId,
        contact_person: 'Demo Operator',
        email: DEMO_USER_EMAIL,
        industry: 'Manufacturing',
        notes: 'Seeded demo data. Fabricated suppliers. Contains no client information.',
      })
      .select('id')
      .single()
    if (error) throw error
    companyId = data.id
    console.log(`  company  ${DEMO_COMPANY_NAME} (created)`)
  } else {
    await admin.from('companies').update({ owner_id: userId }).eq('id', companyId)
    console.log(`  company  ${DEMO_COMPANY_NAME} (reused)`)
  }

  // ---------------------------------------------------------------------
  // Procurement assessment — replaced wholesale so re-running is clean
  // ---------------------------------------------------------------------
  const { data: oldAssessments } = await admin
    .from('procurement_assessments')
    .select('id')
    .eq('company_id', companyId)
    .eq('assessment_year', ASSESSMENT_YEAR)

  for (const old of oldAssessments ?? []) {
    // suppliers cascade on delete
    await admin.from('procurement_assessments').delete().eq('id', old.id)
  }

  const calculated = SUPPLIERS.map(calculateSupplierRow)
  const totalSpend = calculated.reduce((sum, row) => sum + row.value_ex_vat, 0)

  const { data: assessment, error: assessmentError } = await admin
    .from('procurement_assessments')
    .insert({
      company_id: companyId,
      assessment_year: ASSESSMENT_YEAR,
      total_measured_procurement_spend: totalSpend,
      tmps_purchase_of_goods: Math.round(totalSpend * 0.62),
      tmps_purchase_of_services: Math.round(totalSpend * 0.38),
      status: 'draft',
      created_by: userId,
    })
    .select('id')
    .single()
  if (assessmentError) throw assessmentError

  const { error: suppliersError } = await admin.from('procurement_suppliers').insert(
    calculated.map((row) => ({
      assessment_id: assessment.id,
      supplier_name: row.supplier_name,
      supplier_type: row.supplier_type,
      level: row.level,
      recognition_percent: row.recognition_percent,
      value_ex_vat: row.value_ex_vat,
      bbbee_spend: row.bbbee_spend,
      is_51_black_owned: row.is_51_black_owned,
      is_30_black_women_owned: row.is_30_black_women_owned,
      is_51_bdgs: row.is_51_bdgs,
      is_51_percent_flow_through: row.is_51_percent_flow_through ?? false,
      eme_amount: row.eme_amount,
      qse_amount: row.qse_amount,
      black_owned_amount: row.black_owned_amount,
      black_women_amount: row.black_women_amount,
      bdgs_amount: row.bdgs_amount,
    })),
  )
  if (suppliersError) throw suppliersError

  const rand = (n: number) => n.toLocaleString('en-ZA', { maximumFractionDigits: 0 })
  console.log(`  assessment ${ASSESSMENT_YEAR}: ${calculated.length} suppliers`)
  console.log(`  total measured procurement spend: R ${rand(totalSpend)}`)
  console.log(`  recognised B-BBEE spend:          R ${rand(calculated.reduce((s, r) => s + r.bbbee_spend, 0))}`)
  console.log('Done.')
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
