import { beforeEach, describe, expect, it, vi } from 'vitest'

// The older manual scorecard's "Download PDF" uses this route because it is
// built with pdf-lib and runs on Netlify. It must let the owner and a REAP
// administrator download, and nobody else.
const mocks = vi.hoisted(() => ({ session: vi.fn(), isAdmin: vi.fn(), serviceRole: vi.fn() }))
vi.mock('server-only', () => ({}))
vi.mock('@/utils/supabase/server', () => ({ createClient: mocks.session }))
vi.mock('@/lib/admin/internal-admin', () => ({ isReapInternalAdmin: mocks.isAdmin }))
vi.mock('@/lib/supabase/service-role', () => ({ createServiceRoleSupabase: mocks.serviceRole }))

import { GET } from '@/app/api/scorecards/[id]/report/route'

const scorecard = {
  id: 's1',
  total_score: 61.5,
  score_level: 'Level 5',
  created_at: '2026-03-01T10:00:00Z',
  company: { name: 'Mokoena Logistics', owner_id: 'owner' },
}
const results = [{ category_name: 'Ownership', score: 18, max_score: 25 }]

function db() {
  const chain = (table: string) => {
    const q = {
      select: () => q,
      eq: () => q,
      order: async () => ({ data: table === 'scorecard_results' ? results : [], error: null }),
      single: async () => ({ data: table === 'scorecards' ? scorecard : null, error: null }),
    }
    return q
  }
  return { from: vi.fn(chain) }
}

function signedInAs(userId: string) {
  const client = { ...db(), auth: { getUser: async () => ({ data: { user: { id: userId } } }) } }
  mocks.session.mockResolvedValue(client)
  return client
}

const call = () => GET(new Request('http://x') as never, { params: Promise.resolve({ id: 's1' }) })
const isPdf = async (res: Response) => Buffer.from(await res.arrayBuffer()).subarray(0, 5).toString() === '%PDF-'

describe('older manual scorecard PDF download', () => {
  beforeEach(() => {
    mocks.session.mockReset()
    mocks.isAdmin.mockReset()
    mocks.serviceRole.mockReset()
  })

  it('gives the owner a PDF', async () => {
    signedInAs('owner')
    mocks.isAdmin.mockResolvedValue(false)
    const res = await call()
    expect(res.status).toBe(200)
    expect(await isPdf(res)).toBe(true)
    expect(mocks.serviceRole).not.toHaveBeenCalled()
  })

  it('gives a REAP administrator a PDF of a client’s scorecard', async () => {
    signedInAs('reap-admin')
    mocks.isAdmin.mockResolvedValue(true)
    const admin = db()
    mocks.serviceRole.mockReturnValue(admin)
    const res = await call()
    expect(res.status).toBe(200)
    expect(await isPdf(res)).toBe(true)
    expect(admin.from).toHaveBeenCalledWith('scorecards')
  })

  it('refuses any other signed-in user', async () => {
    signedInAs('someone-else')
    mocks.isAdmin.mockResolvedValue(false)
    expect((await call()).status).toBe(404)
  })
})
