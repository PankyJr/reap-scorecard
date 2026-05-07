#!/usr/bin/env node
/**
 * Local dev: print the first N rows of a stored workbook sheet (tab-separated).
 *
 * Usage:
 *   node scripts/dump-workbook-sheet-rows.mjs <workbook_id> --list
 *   node scripts/dump-workbook-sheet-rows.mjs <workbook_id> <sheet_name> [limit=100] [--cols=12]
 *
 * Default prints columns A–F (6). Use `--cols=N` (max 26) for wider QA dumps (A through max column).
 *
 * Reads `.env.local` for `NEXT_PUBLIC_SUPABASE_URL` and either:
 *   `SUPABASE_SERVICE_ROLE_KEY` (recommended for local dumps; bypasses RLS), or
 *   `NEXT_PUBLIC_SUPABASE_ANON_KEY` (subject to RLS — use a session-capable client if needed).
 *
 * Example:
 *   node scripts/dump-workbook-sheet-rows.mjs bb72c975-da82-4572-bc2a-6de4d0562aad Ownership
 *   node scripts/dump-workbook-sheet-rows.mjs 3a27f1e6-641d-45a2-be66-6e03592f6f80 --list
 */

import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local')
  if (!fs.existsSync(envPath)) return
  const text = fs.readFileSync(envPath, 'utf8')
  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    const key = trimmed.slice(0, eq).trim()
    let val = trimmed.slice(eq + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    // Force local script determinism: prefer repo .env.local over inherited shell env.
    process.env[key] = val
  }
}

loadEnvLocal()

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const key = serviceKey || anonKey

const workbookId = process.argv[2]
const arg3 = process.argv[3]

function maskKey(key) {
  if (!key) return 'missing'
  if (key.startsWith('sb_secret_')) return `sb_secret_${key.slice(10, 16)}...${key.slice(-4)}`
  if (key.startsWith('sb_publishable_')) return `sb_publishable_${key.slice(15, 21)}...${key.slice(-4)}`
  return `${key.slice(0, 6)}...${key.slice(-4)}`
}

if (!workbookId) {
  console.error(
    'Usage: node scripts/dump-workbook-sheet-rows.mjs <workbook_id> --list\n' +
      '       node scripts/dump-workbook-sheet-rows.mjs <workbook_id> <sheet_name> [limit] [--cols=N]',
  )
  process.exit(1)
}

if (!url || !key) {
  console.error(
    'Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) in .env.local',
  )
  process.exit(1)
}

const supabase = createClient(url, key)
const keyKind = serviceKey ? 'service_role' : 'anon'
console.log(
  `[dump] cwd=${process.cwd()} workbook_id=${workbookId} supabase_url=${url} key_kind=${keyKind} key=${maskKey(key)}`,
)

const { data: workbookRow, error: workbookErr } = await supabase
  .from('scorecard_workbooks')
  .select('id, filename, company_id, status, uploaded_at')
  .eq('id', workbookId)
  .maybeSingle()
const { count: sheetCount, error: countErr } = await supabase
  .from('scorecard_workbook_sheets')
  .select('id', { count: 'exact', head: true })
  .eq('workbook_id', workbookId)
const { data: latestWorkbooks, error: latestErr } = await supabase
  .from('scorecard_workbooks')
  .select('id, filename, status, uploaded_at')
  .order('uploaded_at', { ascending: false })
  .limit(5)

console.log('[dump] workbook_lookup', workbookErr ? { error: workbookErr.message } : workbookRow ?? null)
console.log('[dump] sheet_count', countErr ? { error: countErr.message } : sheetCount ?? 0)
console.log(
  '[dump] latest_workbooks',
  latestErr ? { error: latestErr.message } : (latestWorkbooks ?? []).map((r) => `${r.id} :: ${r.filename} :: ${r.status}`),
)

if (arg3 === '--list') {
  const { data, error } = await supabase
    .from('scorecard_workbook_sheets')
    .select('sheet_name')
    .eq('workbook_id', workbookId)
    .order('sheet_name')

  if (error) {
    console.error(error)
    process.exit(1)
  }
  if (!data?.length) {
    console.error(`No sheets for workbook_id=${workbookId}`)
    process.exit(1)
  }
  console.log(`workbook_id\t${workbookId}`)
  for (const row of data) {
    console.log(row.sheet_name)
  }
  process.exit(0)
}

if (!arg3) {
  console.error(
    'Usage: node scripts/dump-workbook-sheet-rows.mjs <workbook_id> --list\n' +
      '       node scripts/dump-workbook-sheet-rows.mjs <workbook_id> <sheet_name> [limit] [--cols=N]',
  )
  process.exit(1)
}

const sheetName = arg3
let limit = 100
let colCount = 6
for (let i = 4; i < process.argv.length; i += 1) {
  const a = process.argv[i]
  if (a.startsWith('--cols=')) {
    const n = Number(a.slice('--cols='.length))
    if (Number.isFinite(n) && n >= 1) colCount = Math.min(26, Math.floor(n))
  } else if (/^\d+$/.test(a)) {
    limit = Math.max(1, Number(a))
  }
}

let { data, error } = await supabase
  .from('scorecard_workbook_sheets')
  .select('sheet_name, raw_json')
  .eq('workbook_id', workbookId)
  .eq('sheet_name', sheetName)
  .maybeSingle()

if (error) {
  console.error(error)
  process.exit(1)
}

if (!data) {
  const { data: names } = await supabase
    .from('scorecard_workbook_sheets')
    .select('sheet_name')
    .eq('workbook_id', workbookId)
    .order('sheet_name')
  const wanted = sheetName.trim().toLowerCase()
  const fuzzy = (names ?? []).find((r) => r.sheet_name?.trim().toLowerCase() === wanted)
  if (fuzzy?.sheet_name) {
    console.error(
      `[dump] exact sheet_name not found; using trimmed match "${fuzzy.sheet_name}" for requested "${sheetName}"`,
    )
    const retry = await supabase
      .from('scorecard_workbook_sheets')
      .select('sheet_name, raw_json')
      .eq('workbook_id', workbookId)
      .eq('sheet_name', fuzzy.sheet_name)
      .maybeSingle()
    data = retry.data
    error = retry.error
  }
}

if (!data) {
  console.error(`No row in scorecard_workbook_sheets for workbook_id=${workbookId} sheet_name="${sheetName}"`)
  const { data: names } = await supabase
    .from('scorecard_workbook_sheets')
    .select('sheet_name')
    .eq('workbook_id', workbookId)
    .order('sheet_name')
  if (names?.length) {
    console.error('Known sheet_name values for this workbook:')
    for (const row of names) console.error(`  - ${row.sheet_name}`)
  } else {
    console.error('(No sheets stored for this workbook in this database.)')
  }
  process.exit(1)
}

const rows = data.raw_json
if (!Array.isArray(rows)) {
  console.error('raw_json is not a JSON array of rows')
  process.exit(1)
}

function cellStr(v) {
  if (v == null || v === '') return ''
  const s = String(v)
  return s.length > 48 ? `${s.slice(0, 45)}...` : s
}

function colLetter(indexZero) {
  if (indexZero < 26) return String.fromCharCode(65 + indexZero)
  return `C${indexZero}`
}

const headers = ['row', ...Array.from({ length: colCount }, (_, i) => colLetter(i))]
console.log(`sheet_name\t${data.sheet_name}`)
console.log(`cols\t${colCount}\tlimit\t${limit}`)
console.log(headers.join('\t'))

for (let i = 0; i < Math.min(limit, rows.length); i += 1) {
  const row = Array.isArray(rows[i]) ? rows[i] : []
  const cells = [String(i + 1)]
  for (let c = 0; c < colCount; c += 1) {
    cells.push(cellStr(row[c]))
  }
  console.log(cells.join('\t'))
}
