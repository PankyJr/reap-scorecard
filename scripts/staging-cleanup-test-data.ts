/**
 * Remove test accounts and everything they own from the STAGING project.
 *
 *   npx tsx scripts/staging-cleanup-test-data.ts            # dry run: lists what would go
 *   npx tsx scripts/staging-cleanup-test-data.ts --apply    # deletes it
 *   … --keep=reviewer@reap-staging.example                  # spare a test-domain login someone uses
 *
 * A test account is one whose e-mail ends in a reserved test domain
 * (reap-staging.example, example.com, example.org, example.net). Any other
 * account, and anything it owns, is left alone, as is any workforce-target set
 * not created by a test account (the seeded client set has no creator).
 *
 * For each test account, in this order:
 *   - companies it owns (procurement, scorecards, workbooks and assessments
 *     cascade with them)
 *   - workforce-target sets it created (values and history cascade)
 *   - its audit-log rows and avatar files
 *   - the account itself (profile and internal-admin row cascade)
 *
 * Refuses to run against anything but staging. Needs
 * NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.
 */
import { createClient } from '@supabase/supabase-js'

const STAGING_REF = 'jzvqyryblsfxlinvoiuf'
const TEST_DOMAINS = ['reap-staging.example', 'example.com', 'example.org', 'example.net']

function isTestEmail(email: string | undefined): boolean {
  const domain = (email ?? '').toLowerCase().split('@')[1] ?? ''
  return TEST_DOMAINS.includes(domain)
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!url.includes(STAGING_REF)) throw new Error('Refusing to run: not the staging project.')
  if (!key) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required.')
  const apply = process.argv.includes('--apply')
  const keep = new Set(
    process.argv.filter((a) => a.startsWith('--keep=')).map((a) => a.slice('--keep='.length).toLowerCase()),
  )
  const admin = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })

  const users: { id: string; email?: string }[] = []
  for (let page = 1; ; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    users.push(...data.users)
    if (data.users.length < 200) break
  }
  const spared = (u: { email?: string }) => keep.has((u.email ?? '').toLowerCase())
  const test = users.filter((u) => isTestEmail(u.email) && !spared(u))
  const kept = users.filter((u) => !isTestEmail(u.email) || spared(u))
  const ids = test.map((u) => u.id)
  console.log(`${test.length} test account(s) to remove; ${kept.length} other account(s) kept:`)
  for (const u of kept) console.log(`  keep  ${u.email}`)

  if (ids.length === 0) {
    console.log('Nothing to remove.')
    return
  }

  const { data: companies } = await admin.from('companies').select('id, name').in('owner_id', ids)
  const { data: sets } = await admin.from('eap_target_sets').select('id, name').in('created_by', ids)
  console.log(`  companies: ${(companies ?? []).length}`)
  for (const c of companies ?? []) console.log(`    - ${c.name}`)
  console.log(`  workforce-target sets: ${(sets ?? []).length}`)
  for (const s of sets ?? []) console.log(`    - ${s.name}`)
  for (const u of test) console.log(`  account ${u.email}`)

  if (!apply) {
    console.log('\nDry run. Re-run with --apply to delete the above.')
    return
  }

  const companyIds = (companies ?? []).map((c) => c.id)
  if (companyIds.length) {
    const { error } = await admin.from('companies').delete().in('id', companyIds)
    if (error) throw error
  }
  const setIds = (sets ?? []).map((s) => s.id)
  if (setIds.length) {
    const { error } = await admin.from('eap_target_sets').delete().in('id', setIds)
    if (error) throw error
  }
  await admin.from('audit_log').delete().in('actor_id', ids)
  for (const id of ids) {
    const { data: files } = await admin.storage.from('avatars').list(id)
    if (files?.length) await admin.storage.from('avatars').remove(files.map((f) => `${id}/${f.name}`))
    const { error } = await admin.auth.admin.deleteUser(id)
    if (error) throw error
  }
  console.log(`\nRemoved ${ids.length} account(s), ${companyIds.length} compan(ies), ${setIds.length} target set(s).`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
