/**
 * Netlify build guard: only the live site's production build may use the
 * production database. A branch deploy or deploy preview that would be built
 * against production (Netlify gives every context the production values
 * unless told otherwise) stops here with a plain message, before anything is
 * built or published.
 *
 * Netlify sets CONTEXT to production, deploy-preview, branch-deploy or dev.
 * Runs from the [context.*] build commands in netlify.toml.
 */
const PRODUCTION_REF = 'pmjuiynjelhjlpyohbvk'

export function deployContextProblem(env) {
  const context = env.CONTEXT ?? ''
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  if (context && context !== 'production' && url.includes(PRODUCTION_REF)) {
    return (
      `This ${context} build is set to use the production database. Previews and branch deploys must use staging: ` +
      'in Netlify, give NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY the staging ' +
      'values for the Deploy Previews and Branch deploys contexts (docs/PRODUCTION_UPGRADE.md, "A separate Netlify staging site").'
    )
  }
  return null
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const problem = deployContextProblem(process.env)
  if (problem) {
    console.error(problem)
    process.exit(1)
  }
  console.log(`Deploy context "${process.env.CONTEXT ?? 'unknown'}": database check passed.`)
}
