/**
 * The "legs" rule: every "X is missing" message links to where X is entered.
 * Readiness reasons are written by the engine in words; this maps each one to
 * the step that resolves it. Copy/UX only; no scoring logic.
 */
const RULES: Array<{ test: RegExp; slug: string; label: string }> = [
  { test: /NPAT|profit|denominator|financial|leviable/i, slug: 'financial', label: 'Financial figures' },
  { test: /classif|revenue|applicab|sector code|start-up|\bEME\b|\bQSE\b/i, slug: 'applicability', label: 'Company size and sector' },
  { test: /ownership|net value/i, slug: 'ownership', label: 'Ownership' },
  { test: /management control|EAP|workforce/i, slug: 'management-control', label: 'Management control' },
  { test: /skills/i, slug: 'skills-development', label: 'Skills development' },
  { test: /procurement/i, slug: 'procurement', label: 'Preferential procurement' },
  { test: /supplier development/i, slug: 'supplier-development', label: 'Supplier development' },
  { test: /enterprise development/i, slug: 'enterprise-development', label: 'Enterprise development' },
  { test: /socio-economic/i, slug: 'socio-economic-development', label: 'Socio-economic development' },
]

export function reasonLink(assessmentId: string, reason: string): { href: string; label: string } | null {
  // "Enterprise and Supplier Development — preferential procurement" names three
  // things; the first specific element named wins, checked in a fixed order.
  const ordered = /enterprise and supplier development/i.test(reason)
    ? RULES.filter((r) => r.slug !== 'procurement' || !/supplier development —/i.test(reason))
    : RULES
  const rule = ordered.find((r) => r.test.test(reason))
  if (!rule) return null
  return { href: `/scorecards/calculator/${assessmentId}/generic/${rule.slug}`, label: rule.label }
}
