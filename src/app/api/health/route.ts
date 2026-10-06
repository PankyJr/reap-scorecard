import { NextResponse } from 'next/server'

/**
 * Liveness probe for container orchestrators (Docker HEALTHCHECK, AWS App Runner).
 *
 * Deliberately shallow: it answers "is this process up and serving HTTP?" and
 * nothing more. It does NOT touch Supabase. A dependency check here would let a
 * transient database blip cause App Runner to kill and replace healthy
 * containers, which turns a brief read error into an outage.
 */
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'reap-scorecard',
      commit: process.env.GIT_COMMIT_SHA ?? 'unknown',
      timestamp: new Date().toISOString(),
    },
    { headers: { 'Cache-Control': 'no-store' } },
  )
}
