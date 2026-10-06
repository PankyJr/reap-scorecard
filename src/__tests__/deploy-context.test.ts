import { spawnSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { deployContextProblem } from '../../scripts/ops/check-deploy-context.mjs'

const PROD = 'https://pmjuiynjelhjlpyohbvk.supabase.co'
const STAGING = 'https://jzvqyryblsfxlinvoiuf.supabase.co'
const script = join(__dirname, '../../scripts/ops/check-deploy-context.mjs')
const run = (env: Record<string, string>) => spawnSync(process.execPath, [script], { env: { PATH: process.env.PATH ?? '', ...env } as unknown as NodeJS.ProcessEnv, encoding: 'utf8' })

describe('only the live site builds against the production database', () => {
  it('stops a deploy preview or branch deploy that points at production', () => {
    for (const context of ['deploy-preview', 'branch-deploy']) {
      expect(deployContextProblem({ CONTEXT: context, NEXT_PUBLIC_SUPABASE_URL: PROD })).toMatch(/must use staging/)
      const result = run({ CONTEXT: context, NEXT_PUBLIC_SUPABASE_URL: PROD })
      expect(result.status).toBe(1)
      expect(result.stderr).toMatch(/production database/)
    }
  })

  it('lets previews on staging, and the production build, through', () => {
    expect(run({ CONTEXT: 'deploy-preview', NEXT_PUBLIC_SUPABASE_URL: STAGING }).status).toBe(0)
    expect(run({ CONTEXT: 'branch-deploy', NEXT_PUBLIC_SUPABASE_URL: STAGING }).status).toBe(0)
    expect(run({ CONTEXT: 'production', NEXT_PUBLIC_SUPABASE_URL: PROD }).status).toBe(0)
  })

  it('runs before the build in every non-production context in netlify.toml', () => {
    const toml = readFileSync(join(__dirname, '../../netlify.toml'), 'utf8')
    for (const context of ['deploy-preview', 'branch-deploy']) {
      const block = toml.split(`[context.${context}]`)[1]?.split('[')[0] ?? ''
      expect(block).toMatch(/command = "node scripts\/ops\/check-deploy-context\.mjs && NEXT_PUBLIC_SITE_URL=\$DEPLOY_PRIME_URL npm run build"/)
    }
  })
})
