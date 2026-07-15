import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { resolve } from 'path'

const envPath = resolve('.env.local')
for (const line of readFileSync(envPath, 'utf8').split('\n')) {
  const m = line.match(/^([^#=]+)=(.*)$/)
  if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '')
}

const email = process.argv[2]
const newPassword = process.argv[3]

if (!email || !newPassword) {
  console.error('Usage: node scripts/reset-demo-password.mjs <email> <new-password>')
  process.exit(1)
}

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

async function main() {
  let page = 1
  let found = null
  while (page <= 10 && !found) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    found = data.users.find((u) => u.email?.toLowerCase() === email.toLowerCase()) ?? null
    if (data.users.length < 200) break
    page++
  }

  if (!found) {
    console.error('USER_NOT_FOUND')
    process.exit(1)
  }

  const { error: updateError } = await admin.auth.admin.updateUserById(found.id, {
    password: newPassword,
  })
  if (updateError) throw updateError

  console.log(JSON.stringify({ ok: true, userId: found.id, email: found.email }))
}

main().catch((err) => {
  console.error(err.message || String(err))
  process.exit(1)
})
