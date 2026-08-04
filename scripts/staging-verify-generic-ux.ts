/**
 * Staging-only Generic UX verification with fictional workbook.
 * Credentials via env: STAGING_REVIEW_EMAIL / STAGING_REVIEW_PASSWORD
 * or falls back to tmp/staging-secrets/bongani-reviewer.json (gitignored).
 *
 * Does not commit credentials. Staging Supabase only.
 */
import fs from 'node:fs'
import path from 'node:path'
import { createClient } from '@supabase/supabase-js'
import { analyseGenericScorecardWorkbook } from '../src/lib/scorecard/generic/workbook-import'
import { formatTypedDisplayValue } from '../src/lib/scorecard/generic/ux/display-values'

const STAGING_REF = 'jzvqyryblsfxlinvoiuf'
const WORKBOOK = path.resolve('tmp/full-scorecard-reference/Generic-Scorecard-Test-Data.xlsx')

function loadCreds() {
  const email = process.env.STAGING_REVIEW_EMAIL
  const password = process.env.STAGING_REVIEW_PASSWORD
  if (email && password) return { email, password }
  const file = path.resolve('tmp/staging-secrets/bongani-reviewer.json')
  if (!fs.existsSync(file)) throw new Error('Set STAGING_REVIEW_EMAIL/PASSWORD or provide bongani-reviewer.json')
  const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as { email: string; password: string }
  return { email: parsed.email, password: parsed.password }
}

async function main() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  if (!url.includes(STAGING_REF)) throw new Error('staging only')
  if (!fs.existsSync(WORKBOOK)) throw new Error(`Missing workbook at ${WORKBOOK}`)

  const creds = loadCreds()
  const admin = createClient(url, service, { auth: { persistSession: false, autoRefreshToken: false } })
  const userClient = createClient(url, anon, { auth: { persistSession: false, autoRefreshToken: false } })

  const { error: signErr } = await userClient.auth.signInWithPassword(creds)
  if (signErr) throw signErr
  const userId = (await userClient.auth.getUser()).data.user?.id
  if (!userId) throw new Error('no user')

  const companyName = `UX Harden Co ${Date.now()}`
  const { data: company, error: cErr } = await admin
    .from('companies')
    .insert({
      owner_id: userId,
      name: companyName,
      contact_person: 'UX Reviewer',
      email: creds.email,
      industry: 'Testing',
      notes: 'Fictional staging UX hardening company — delete after review',
    })
    .select('id')
    .single()
  if (cErr) throw cErr

  const buffer = fs.readFileSync(WORKBOOK)
  const analysis = analyseGenericScorecardWorkbook({
    filename: 'Generic-Scorecard-Test-Data.xlsx',
    buffer,
    fileSize: buffer.length,
  })

  const employees = analysis.elements
    .find((element) => element.elementKey === 'financial')
    ?.summary.find((entry) => entry.key === 'totalEmployees')

  const report = {
    stagingRef: STAGING_REF,
    companyId: company.id,
    companyName,
    sheets: `${analysis.sheetCount}/${analysis.expectedSheetCount}`,
    recognised: analysis.recognisedSheetCount,
    typedEmployees: employees ? formatTypedDisplayValue(employees) : null,
    employeesType: employees?.type ?? null,
    procurementNoticePresent: Boolean(analysis.procurementNotice),
    workbookNotCommitted: true,
  }

  console.log(JSON.stringify(report, null, 2))

  if (analysis.sheetCount !== 22) throw new Error(`Expected 22 sheets, got ${analysis.sheetCount}`)
  if (employees?.type !== 'count') throw new Error('totalEmployees must be typed as count')
  if (employees && formatTypedDisplayValue(employees).includes('R')) {
    throw new Error('employee count must not render as currency')
  }

  // Cleanup company shell (no assessment created in this analysis-only probe)
  await admin.from('companies').delete().eq('id', company.id)
  console.log('cleanup_ok')
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
