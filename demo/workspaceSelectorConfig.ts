/**
 * Demo-build replacement for src/lib/demo/workspaceSelectorConfig.ts.
 *
 * The real file names a specific client. The selector that reads it is already
 * hidden on the demo by isAberdareDemoEnabled(), but a hidden component still
 * ships its strings in the bundle — and "grep the built image for client names"
 * has to come back empty. Same exports, same shape, no client name.
 */

export const DASHBOARD_WORKSPACE_FORMAL = {
  id: 'reap-formal-scorecard',
  label: 'REAP Solutions',
  title: 'Formal Procurement Scorecard',
  description:
    'Run structured procurement assessments, review score breakdowns and generate formal reports.',
  primaryAction: 'Open Formal Scorecard',
  href: '/procurement/assessments/new',
  capabilities: ['Formal assessments', 'Score breakdowns', 'PDF reporting'] as const,
} as const

export const DASHBOARD_WORKSPACE_CLIENT = {
  id: 'live-procurement-workspace',
  label: 'Client workspace',
  title: 'Live Procurement Control',
  description:
    'Upload monthly supplier-spend data, test supplier changes and immediately review projected procurement-point impact.',
  primaryAction: 'Open workspace',
  href: '/dashboard',
  badge: 'Client workspace',
  capabilities: [
    'Monthly spend uploads',
    'Supplier scenarios',
    'Actual vs projected impact',
  ] as const,
} as const

export const DASHBOARD_WORKSPACE_SELECTOR = {
  heading: 'Workspaces',
  supporting: 'Choose the environment you want to work in.',
  formal: DASHBOARD_WORKSPACE_FORMAL,
  client: DASHBOARD_WORKSPACE_CLIENT,
} as const

export const CLIENT_WORKSPACE_LIVE_HREF = '/dashboard' as const
