import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { decideInternalAdminAccess } from '@/lib/admin/internal-admin-gate'

const root = join(__dirname, '../../../..')
const appRoot = join(root, 'app')
const libRoot = join(root, 'lib/admin')

describe('internal admin access decision', () => {
  it('sends unauthenticated users to login with the requested next path', () => {
    expect(
      decideInternalAdminAccess({
        authenticated: false,
        isAdmin: false,
        nextPath: '/settings/eap-targets',
      }),
    ).toEqual({ outcome: 'login', nextPath: '/settings/eap-targets' })
  })

  it('forbids authenticated non-admin users', () => {
    expect(
      decideInternalAdminAccess({
        authenticated: true,
        isAdmin: false,
        nextPath: '/settings/eap-targets',
      }),
    ).toEqual({ outcome: 'forbidden' })
  })

  it('allows authorised admins', () => {
    expect(
      decideInternalAdminAccess({
        authenticated: true,
        isAdmin: true,
        nextPath: '/settings/eap-targets',
      }),
    ).toEqual({ outcome: 'allow' })
  })
})

describe('EAP admin access control (source contract)', () => {
  it('gates EAP settings pages with requireReapInternalAdmin before any form UI', () => {
    const indexSrc = readFileSync(
      join(appRoot, '(dashboard)/settings/eap-targets/page.tsx'),
      'utf8',
    )
    const detailSrc = readFileSync(
      join(appRoot, '(dashboard)/settings/eap-targets/[id]/page.tsx'),
      'utf8',
    )
    const actionsSrc = readFileSync(
      join(appRoot, '(dashboard)/settings/eap-targets/actions.ts'),
      'utf8',
    )

    expect(indexSrc).toContain('requireReapInternalAdmin')
    expect(detailSrc).toContain('requireReapInternalAdmin')
    expect(actionsSrc).toContain('requireReapInternalAdmin')
    expect(actionsSrc).toContain('createServiceRoleSupabase')

    // Gate must run before create/edit form fields are reachable in the render path.
    const indexGateIdx = indexSrc.indexOf('requireReapInternalAdmin')
    const indexFormIdx = indexSrc.indexOf('createEapTargetSet')
    expect(indexGateIdx).toBeGreaterThan(-1)
    expect(indexFormIdx).toBeGreaterThan(indexGateIdx)

    const detailGateIdx = detailSrc.indexOf('requireReapInternalAdmin')
    const detailFormIdx = detailSrc.indexOf('saveEapTargetValues')
    expect(detailGateIdx).toBeGreaterThan(-1)
    expect(detailFormIdx).toBeGreaterThan(detailGateIdx)
  })

  it('uses forbidden() for authenticated non-admins (HTTP 403), not notFound()', () => {
    const gateSrc = readFileSync(join(libRoot, 'internal-admin.ts'), 'utf8')
    expect(gateSrc).toContain("from 'next/navigation'")
    expect(gateSrc).toContain('forbidden()')
    expect(gateSrc).toContain('decideInternalAdminAccess')
    // ACL must not hide denial behind a soft not-found for signed-in users.
    expect(gateSrc).not.toMatch(/notFound\s*\(/)
  })

  it('renders an Access Denied page for forbidden()', () => {
    const forbiddenSrc = readFileSync(join(appRoot, 'forbidden.tsx'), 'utf8')
    expect(forbiddenSrc).toMatch(/Access denied/i)
    expect(forbiddenSrc).toMatch(/HTTP 403/)
    // Non-admin denial UI must not expose EAP administration form fields.
    expect(forbiddenSrc).not.toContain('createEapTargetSet')
    expect(forbiddenSrc).not.toContain('name="year"')
    expect(forbiddenSrc).not.toContain('Create draft')
    expect(forbiddenSrc).not.toContain('saveEapTargetValues')
  })

  it('enables Next.js authInterrupts so forbidden() can emit HTTP 403', () => {
    const configSrc = readFileSync(join(root, '../next.config.ts'), 'utf8')
    expect(configSrc).toContain('authInterrupts')
  })

  it('denies client-side writes via RLS (migration contract)', () => {
    const migration = readFileSync(
      join(root, '../supabase/migrations/20260730140000_full_scorecard_calculator.sql'),
      'utf8',
    )
    expect(migration).toContain('eap_target_sets_read_authenticated')
    expect(migration).not.toMatch(/create policy eap_target_sets_.*insert/i)
    expect(migration).toContain('grant select on public.eap_target_sets to authenticated')
  })
})
