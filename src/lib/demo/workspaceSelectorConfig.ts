/** Pure workspace-selector destinations and copy — safe for unit tests. */

export const DASHBOARD_WORKSPACE_FORMAL = {
  id: 'reap-formal-scorecard',
  label: 'REAP Solutions',
  title: 'Formal Procurement Scorecard',
  description:
    'Run structured procurement assessments, review score breakdowns and generate formal reports.',
  primaryAction: 'Open Formal Scorecard',
  href: '/procurement/assessments/new',
  capabilities: [
    'Formal assessments',
    'Score breakdowns',
    'PDF reporting',
  ] as const,
} as const

export const DASHBOARD_WORKSPACE_ABERDARE = {
  id: 'aberdare-live-procurement',
  label: 'Aberdare Cables',
  title: 'Live Procurement Control',
  description:
    'Upload monthly supplier-spend data, test supplier changes and immediately review projected procurement-point impact.',
  primaryAction: 'Open Aberdare Workspace',
  href: '/clients/aberdare/procurement-control-preview',
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
  aberdare: DASHBOARD_WORKSPACE_ABERDARE,
} as const

export const ABERDARE_LIVE_HREF =
  '/clients/aberdare/procurement-control-preview/live' as const
