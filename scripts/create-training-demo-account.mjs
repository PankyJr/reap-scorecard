// Creates (or refreshes) the fictional demonstration account used to capture
// REAP Formal Procurement Scorecard training screenshots.
// Development utility only - it is never shipped in the client training package.
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

for (const line of readFileSync(resolve('.env.local'), 'utf8').split('\n')) {
  const match = line.match(/^([^#=]+)=(.*)$/)
  if (match) process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, '')
}

const email = process.env.REAP_TRAINING_EMAIL ?? 'reap.training.demo@example.com'
const password = process.env.REAP_TRAINING_PASSWORD ?? 'Reap!Training2026'
const fullName = 'Lerato Mahlangu'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

let existing = null
for (let page = 1; page <= 10 && !existing; page += 1) {
  const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
  if (error) throw error
  existing = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null
  if (data.users.length < 200) break
}

if (existing) {
  const { error } = await admin.auth.admin.updateUserById(existing.id, {
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, display_name: fullName },
  })
  if (error) throw error
  console.log(JSON.stringify({ ok: true, action: 'updated', userId: existing.id, email }))
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName, display_name: fullName },
  })
  if (error) throw error
  console.log(JSON.stringify({ ok: true, action: 'created', userId: data.user.id, email }))
}
