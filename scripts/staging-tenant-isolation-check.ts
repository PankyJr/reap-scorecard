/**
 * Tenant-isolation check against STAGING.
 *
 * Creates two throwaway, pre-confirmed accounts (A and B). A creates a
 * company and data in every user-owned table. B, signed in with the public
 * anon key exactly as the browser would be, then tries to read, change,
 * delete and attach to A's data, and to read other users' profiles (names
 * and e-mail addresses). Every attempt must fail.
 *
 * Usage (staging only; the script refuses any other project):
 *   NEXT_PUBLIC_SUPABASE_URL=... NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
 *   SUPABASE_SERVICE_ROLE_KEY=... npx tsx scripts/staging-tenant-isolation-check.ts [--keep]
 *
 * Exit code 0 = isolated; 1 = at least one leak. The accounts and their data
 * are deleted at the end unless --keep is passed.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const STAGING_REF = 'jzvqyryblsfxlinvoiuf'
const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
const keep = process.argv.includes('--keep')

if (!url.includes(STAGING_REF)) {
  throw new Error(`Refusing to run: NEXT_PUBLIC_SUPABASE_URL is not staging (${STAGING_REF}).`)
}
if (!anonKey || !serviceKey) throw new Error('Set NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY.')

const noSession = { auth: { persistSession: false, autoRefreshToken: false } }
const admin = createClient(url, serviceKey, noSession)

type Check = { name: string; ok: boolean; detail: string }
const checks: Check[] = []
function record(name: string, ok: boolean, detail = '') {
  checks.push({ name, ok, detail })
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`)
}

async function makeUser(label: string) {
  const email = `e2e-final-${label}-${Date.now()}@reap-staging.example`
  const password = `Iso-${crypto.randomUUID()}`
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
  if (error || !data.user) throw new Error(`createUser ${label}: ${error?.message}`)
  const client = createClient(url, anonKey, noSession)
  const { error: signInError } = await client.auth.signInWithPassword({ email, password })
  if (signInError) throw new Error(`sign in ${label}: ${signInError.message}`)
  return { id: data.user.id, email, client }
}

type Row = { id: string } & Record<string, unknown>
async function must(p: PromiseLike<{ data: unknown; error: { message: string } | null }>, what: string): Promise<Row> {
  const { data, error } = await p
  if (error || data == null) throw new Error(`${what}: ${error?.message ?? 'no data'}`)
  return data as Row
}

/** B must see zero rows of A's record. */
async function expectNoRead(b: SupabaseClient, table: string, column: string, value: string) {
  const { data, error } = await b.from(table).select('*').eq(column, value)
  record(`B cannot read ${table}`, !!error || (data ?? []).length === 0, error ? error.message : `${(data ?? []).length} rows`)
}

/** B's update must change nothing; verified through the service role. */
async function expectNoUpdate(b: SupabaseClient, table: string, id: string, patch: Record<string, unknown>, field: string) {
  const before = await must(admin.from(table).select(field).eq('id', id).single(), `read ${table}`)
  await b.from(table).update(patch).eq('id', id)
  const after = await must(admin.from(table).select(field).eq('id', id).single(), `re-read ${table}`)
  const unchanged = JSON.stringify(before) === JSON.stringify(after)
  record(`B cannot change ${table}`, unchanged)
}

async function expectNoDelete(b: SupabaseClient, table: string, id: string) {
  await b.from(table).delete().eq('id', id)
  const { data } = await admin.from(table).select('id').eq('id', id)
  record(`B cannot delete ${table}`, (data ?? []).length === 1)
}

async function expectNoInsert(b: SupabaseClient, table: string, row: Record<string, unknown>) {
  const { data, error } = await b.from(table).insert(row).select('id')
  const inserted = !error && (data ?? []).length > 0
  if (inserted) await admin.from(table).delete().in('id', (data ?? []).map((r: { id: string }) => r.id))
  record(`B cannot attach a ${table} row to A's data`, !inserted, error?.message ?? 'inserted')
}

async function main() {
  const a = await makeUser('tenant-a')
  const b = await makeUser('tenant-b')
  const anon = createClient(url, anonKey, noSession)

  try {
    // ---- A's data, created by A through the API as the app does ----
    const company = await must(
      a.client.from('companies').insert({ name: 'Isolation Co A', owner_id: a.id, email: 'owner-a@reap-staging.example' }).select('id').single(),
      'A creates company',
    )
    const pa = await must(
      a.client
        .from('procurement_assessments')
        .insert({ company_id: company.id, assessment_year: 2026, total_measured_procurement_spend: 1000000, created_by: a.id })
        .select('id')
        .single(),
      'A creates procurement assessment',
    )
    const supplier = await must(
      a.client
        .from('procurement_suppliers')
        .insert({ assessment_id: pa.id, supplier_name: 'Supplier A', supplier_type: 'EME', level: 1, recognition_percent: 135, value_ex_vat: 1000, bbbee_spend: 1350 })
        .select('id')
        .single(),
      'A creates supplier',
    )
    const result = await must(
      a.client
        .from('procurement_results')
        .insert({ assessment_id: pa.id, category_key: 'all', category_name: 'All', target_percent: 80, available_points: 5, achieved_percent: 10, points_achieved: 1, numerator_value: 1, denominator_value: 10 })
        .select('id')
        .single(),
      'A creates procurement result',
    )
    const legacy = await must(
      a.client.from('scorecards').insert({ company_id: company.id, created_by: a.id, total_score: 10 }).select('id').single(),
      'A creates legacy scorecard',
    )
    const sa = await must(
      a.client
        .from('scorecard_assessments')
        .insert({ company_id: company.id, created_by: a.id, name: 'Isolation scorecard', measurement_year: 2026, scope_mode: 'full' })
        .select('id')
        .single(),
      'A creates scorecard assessment',
    )
    await must(
      a.client.from('audit_log').insert({ action: 'test', entity_type: 'company', entity_id: company.id, actor_id: a.id, actor_email: a.email }).select('id').single(),
      'A writes audit log',
    )

    // Child tables of the scorecard assessment and of an uploaded workbook.
    // Each entry: the row A creates, and a harmless field B tries to change.
    const workbook = await must(
      a.client.from('scorecard_workbooks').insert({ company_id: company.id, uploaded_by: a.id, filename: 'a.xlsx', file_size: 1 }).select('id').single(),
      'A creates workbook',
    )
    const engineRun = await must(
      a.client.from('scorecard_engine_runs').insert({ workbook_id: workbook.id, company_id: company.id, created_by: a.id, engine_version: 't', status: 'completed' }).select('id').single(),
      'A creates engine run',
    )
    const children: Array<{ table: string; row: Record<string, unknown>; patch: Record<string, unknown>; field: string }> = [
      { table: 'scorecard_assessment_elements', row: { assessment_id: sa.id, element_key: 'ownership' }, patch: { status: 'complete' }, field: 'status' },
      { table: 'scorecard_assessment_overrides', row: { assessment_id: sa.id, scope: 'element', target_key: 'x', reason: 'r' }, patch: { reason: 'Hijacked' }, field: 'reason' },
      { table: 'scorecard_contribution_records', row: { assessment_id: sa.id, element_key: 'enterprise_development', beneficiary_name: 'Ben' }, patch: { beneficiary_name: 'Hijacked' }, field: 'beneficiary_name' },
      { table: 'scorecard_calculation_runs', row: { assessment_id: sa.id, rule_version: 't' }, patch: { rule_version: 'Hijacked' }, field: 'rule_version' },
      { table: 'scorecard_priority_results', row: { assessment_id: sa.id, priority_key: 'p', element_key: 'ownership', label: 'l', basis_points: 1, threshold_points: 1 }, patch: { label: 'Hijacked' }, field: 'label' },
      { table: 'scorecard_assessment_audit_log', row: { assessment_id: sa.id, action: 'test' }, patch: { action: 'Hijacked' }, field: 'action' },
      { table: 'scorecard_workbook_sheets', row: { workbook_id: workbook.id, sheet_key: 's', sheet_name: 'S' }, patch: { sheet_name: 'Hijacked' }, field: 'sheet_name' },
      { table: 'scorecard_metric_values', row: { workbook_id: workbook.id, metric_key: 'm', pillar: 'p', label: 'l', value_type: 'number', source_sheet: 's' }, patch: { label: 'Hijacked' }, field: 'label' },
      { table: 'scorecard_validation_issues', row: { workbook_id: workbook.id, issue_type: 't', severity: 'warning', message: 'm' }, patch: { message: 'Hijacked' }, field: 'message' },
      { table: 'scorecard_engine_results', row: { engine_run_id: engineRun.id, workbook_id: workbook.id, company_id: company.id, engine_version: 't' }, patch: { engine_version: 'Hijacked' }, field: 'engine_version' },
    ]
    const childIds: Record<string, string> = {}
    for (const c of children) {
      const created = await must(a.client.from(c.table).insert(c.row).select('id').single(), `A creates ${c.table}`)
      childIds[c.table] = created.id
    }
    const draftTargets = await must(
      a.client.from('eap_target_sets').insert({ name: 'A private draft', year: 2026, status: 'draft', created_by: a.id }).select('id').maybeSingle(),
      'A creates draft target set',
    ).catch(() => null)

    // ---- B attacks ----
    for (const c of children) {
      await expectNoRead(b.client, c.table, 'id', childIds[c.table])
      await expectNoUpdate(b.client, c.table, childIds[c.table], c.patch, c.field)
      await expectNoInsert(b.client, c.table, c.row)
      await expectNoDelete(b.client, c.table, childIds[c.table])
    }
    await expectNoRead(b.client, 'scorecard_workbooks', 'id', workbook.id)
    await expectNoDelete(b.client, 'scorecard_workbooks', workbook.id)
    await expectNoRead(b.client, 'scorecard_engine_runs', 'id', engineRun.id)
    if (draftTargets) await expectNoRead(b.client, 'eap_target_sets', 'id', draftTargets.id)
    {
      const { data, error } = await b.client.from('eap_target_sets').insert({ name: 'Rogue active set', year: 2026, status: 'active', created_by: b.id }).select('id')
      const inserted = !error && (data ?? []).length > 0
      if (inserted) await admin.from('eap_target_sets').delete().in('id', (data ?? []).map((r: { id: string }) => r.id))
      record('A normal user cannot publish workforce targets', !inserted, error?.message ?? 'inserted')
    }

    await expectNoRead(b.client, 'companies', 'id', company.id)
    await expectNoRead(b.client, 'procurement_assessments', 'id', pa.id)
    await expectNoRead(b.client, 'procurement_suppliers', 'id', supplier.id)
    await expectNoRead(b.client, 'procurement_results', 'id', result.id)
    await expectNoRead(b.client, 'scorecards', 'id', legacy.id)
    await expectNoRead(b.client, 'scorecard_assessments', 'id', sa.id)
    await expectNoRead(b.client, 'audit_log', 'actor_id', a.id)

    await expectNoUpdate(b.client, 'companies', company.id, { name: 'Hijacked' }, 'name')
    await expectNoUpdate(b.client, 'procurement_assessments', pa.id, { total_measured_procurement_spend: 1 }, 'total_measured_procurement_spend')
    await expectNoUpdate(b.client, 'procurement_suppliers', supplier.id, { supplier_name: 'Hijacked' }, 'supplier_name')
    await expectNoUpdate(b.client, 'scorecards', legacy.id, { total_score: 99 }, 'total_score')
    await expectNoUpdate(b.client, 'scorecard_assessments', sa.id, { name: 'Hijacked' }, 'name')

    await expectNoInsert(b.client, 'procurement_assessments', { company_id: company.id, assessment_year: 2026, total_measured_procurement_spend: 1 })
    await expectNoInsert(b.client, 'procurement_suppliers', { assessment_id: pa.id, supplier_name: 'Injected', supplier_type: 'EME', level: 1, recognition_percent: 135, value_ex_vat: 1, bbbee_spend: 1 })
    await expectNoInsert(b.client, 'scorecard_assessments', { company_id: company.id, name: 'Injected', measurement_year: 2026, scope_mode: 'full' })
    await expectNoInsert(b.client, 'companies', { name: 'Planted on A', owner_id: a.id })

    await expectNoDelete(b.client, 'procurement_suppliers', supplier.id)
    await expectNoDelete(b.client, 'procurement_results', result.id)
    await expectNoDelete(b.client, 'procurement_assessments', pa.id)
    await expectNoDelete(b.client, 'scorecard_assessments', sa.id)
    await expectNoDelete(b.client, 'scorecards', legacy.id)
    await expectNoDelete(b.client, 'companies', company.id)
    // Last, because if it succeeds B owns everything that follows.
    await expectNoUpdate(b.client, 'companies', company.id, { owner_id: b.id }, 'owner_id')

    // ---- e-mail addresses ----
    const { data: bProfiles } = await b.client.from('profiles').select('id, email')
    const foreign = (bProfiles ?? []).filter((p: { id: string }) => p.id !== b.id)
    record('B cannot read other users\' profiles or e-mails', foreign.length === 0, `${foreign.length} foreign rows`)
    const { data: anonProfiles } = await anon.from('profiles').select('id, email')
    record('Anonymous visitor cannot read profiles or e-mails', (anonProfiles ?? []).length === 0, `${(anonProfiles ?? []).length} rows`)
    const { data: anonCompanies } = await anon.from('companies').select('id')
    record('Anonymous visitor cannot read companies', (anonCompanies ?? []).length === 0, `${(anonCompanies ?? []).length} rows`)
    const { data: adminRows } = await b.client.from('reap_internal_admins').select('user_id')
    record('B cannot list internal admins', (adminRows ?? []).length === 0, `${(adminRows ?? []).length} rows`)

    // ---- owner still has full access (the policies must not lock A out) ----
    const { data: own } = await a.client.from('companies').select('id').eq('id', company.id)
    record('A still reads own company', (own ?? []).length === 1)
    const { error: ownUpdate } = await a.client.from('companies').update({ notes: 'still mine' }).eq('id', company.id)
    record('A still updates own company', !ownUpdate, ownUpdate?.message ?? '')
    const { data: ownProfile } = await a.client.from('profiles').select('id').eq('id', a.id)
    record('A still reads own profile', (ownProfile ?? []).length === 1)
  } finally {
    if (!keep) {
      await admin.from('companies').delete().eq('owner_id', a.id)
      await admin.from('companies').delete().eq('owner_id', b.id)
      await admin.from('audit_log').delete().in('actor_id', [a.id, b.id])
      await admin.auth.admin.deleteUser(a.id)
      await admin.auth.admin.deleteUser(b.id)
    }
  }

  const failed = checks.filter((c) => !c.ok)
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`)
  process.exit(failed.length ? 1 : 0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
