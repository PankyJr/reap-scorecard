import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

describe('EAP admin access control (source contract)', () => {
  it('gates EAP settings pages with requireReapInternalAdmin', () => {
    const indexSrc = readFileSync(
      join(__dirname, '../../../../app/(dashboard)/settings/eap-targets/page.tsx'),
      'utf8',
    )
    const detailSrc = readFileSync(
      join(__dirname, '../../../../app/(dashboard)/settings/eap-targets/[id]/page.tsx'),
      'utf8',
    )
    const actionsSrc = readFileSync(
      join(__dirname, '../../../../app/(dashboard)/settings/eap-targets/actions.ts'),
      'utf8',
    )
    expect(indexSrc).toContain('requireReapInternalAdmin')
    expect(detailSrc).toContain('requireReapInternalAdmin')
    expect(actionsSrc).toContain('requireReapInternalAdmin')
    expect(actionsSrc).toContain('createServiceRoleSupabase')
  })

  it('denies client-side writes via RLS (migration contract)', () => {
    const migration = readFileSync(
      join(__dirname, '../../../../../supabase/migrations/20260730140000_full_scorecard_calculator.sql'),
      'utf8',
    )
    expect(migration).toContain('eap_target_sets_read_authenticated')
    expect(migration).not.toMatch(/create policy eap_target_sets_.*insert/i)
    expect(migration).toContain('grant select on public.eap_target_sets to authenticated')
  })
})
