import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ABERDARE_DEMO_FLAG_ENV,
  isAberdareDemoEnabled,
} from '@/lib/demo/aberdareDemoFlag'
import {
  ABERDARE_LIVE_HREF,
  DASHBOARD_WORKSPACE_ABERDARE,
  DASHBOARD_WORKSPACE_FORMAL,
  DASHBOARD_WORKSPACE_SELECTOR,
} from '@/lib/demo/workspaceSelectorConfig'
import { readFileSync } from 'node:fs'
import path from 'node:path'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('Aberdare dashboard demo visibility', () => {
  it('appears automatically in local development even without the env flag', () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv(ABERDARE_DEMO_FLAG_ENV, '')
    expect(isAberdareDemoEnabled()).toBe(true)

    vi.stubEnv(ABERDARE_DEMO_FLAG_ENV, 'false')
    expect(isAberdareDemoEnabled()).toBe(true)
  })

  it('appears when NEXT_PUBLIC_ABERDARE_DEMO=true', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv(ABERDARE_DEMO_FLAG_ENV, 'true')
    expect(isAberdareDemoEnabled()).toBe(true)
  })

  it('is hidden in production when the flag is false or absent', () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv(ABERDARE_DEMO_FLAG_ENV, 'false')
    expect(isAberdareDemoEnabled()).toBe(false)

    vi.stubEnv(ABERDARE_DEMO_FLAG_ENV, '')
    expect(isAberdareDemoEnabled()).toBe(false)
  })
})

describe('dashboard workspace selector config', () => {
  it('links Formal Scorecard to the existing procurement assessment route', () => {
    expect(DASHBOARD_WORKSPACE_FORMAL.href).toBe('/procurement/assessments/new')
    expect(DASHBOARD_WORKSPACE_SELECTOR.formal.href).toBe(
      '/procurement/assessments/new',
    )
  })

  it('links Aberdare to the correct preview workspace route', () => {
    expect(DASHBOARD_WORKSPACE_ABERDARE.href).toBe(
      '/clients/aberdare/procurement-control-preview',
    )
  })

  it('keeps cards accessible with named labels and distinct titles', () => {
    expect(DASHBOARD_WORKSPACE_FORMAL.title).toContain('Formal')
    expect(DASHBOARD_WORKSPACE_ABERDARE.title).toContain('Live Procurement')
    expect(DASHBOARD_WORKSPACE_ABERDARE.badge).toBe('Client workspace')
    expect(DASHBOARD_WORKSPACE_FORMAL.primaryAction.length).toBeGreaterThan(0)
    expect(DASHBOARD_WORKSPACE_ABERDARE.primaryAction.length).toBeGreaterThan(0)
    expect(DASHBOARD_WORKSPACE_FORMAL.capabilities.length).toBeGreaterThanOrEqual(3)
    expect(DASHBOARD_WORKSPACE_ABERDARE.capabilities.length).toBeGreaterThanOrEqual(3)
    expect(DASHBOARD_WORKSPACE_SELECTOR.heading).toBe('Workspaces')
  })

  it('links Live Procurement to the Aberdare live route', () => {
    expect(ABERDARE_LIVE_HREF).toBe(
      '/clients/aberdare/procurement-control-preview/live',
    )
  })

  it('wires the selector into the dashboard below the heading', () => {
    const dashboardSource = readFileSync(
      path.resolve(
        process.cwd(),
        'src/app/(dashboard)/dashboard/page.tsx',
      ),
      'utf8',
    )
    expect(dashboardSource).toContain('isAberdareDemoEnabled')
    expect(dashboardSource).toContain('DashboardWorkspaceSelector')
    expect(dashboardSource).toContain('showAberdareWorkspaceSelector')
    expect(dashboardSource).toContain('data-tour="dashboard dashboard-main"')
    expect(dashboardSource).toContain('Ready for client work?')
    // Selector render precedes the Ready for client work section
    const selectorIdx = dashboardSource.indexOf('DashboardWorkspaceSelector')
    const readyIdx = dashboardSource.indexOf('Ready for client work?')
    expect(selectorIdx).toBeGreaterThan(-1)
    expect(readyIdx).toBeGreaterThan(selectorIdx)
    expect(dashboardSource).toContain('showAberdareWorkspaceSelector')
  })

  it('does not gate visibility on onboarding or account history', () => {
    const dashboardSource = readFileSync(
      path.resolve(
        process.cwd(),
        'src/app/(dashboard)/dashboard/page.tsx',
      ),
      'utf8',
    )
    // Visibility is only the demo helper — not combined with isFirstLogin / companyCount
    expect(dashboardSource).toMatch(
      /const showAberdareWorkspaceSelector = isAberdareDemoEnabled\(\)/,
    )
    expect(dashboardSource).not.toMatch(
      /showAberdareWorkspaceSelector\s*=\s*isAberdareDemoEnabled\(\)\s*&&/,
    )
  })

  it('does not add Aberdare to the permanent production sidebar', () => {
    const sidebarSource = readFileSync(
      path.resolve(process.cwd(), 'src/components/layout/Sidebar.tsx'),
      'utf8',
    )
    expect(sidebarSource.toLowerCase()).not.toContain('aberdare')
    expect(sidebarSource).not.toContain('procurement-control-preview')
  })

  it('keeps Aberdare return link pointed at the main dashboard', () => {
    const headerSource = readFileSync(
      path.resolve(
        process.cwd(),
        'src/components/clients/aberdare/AberdareWorkspaceHeader.tsx',
      ),
      'utf8',
    )
    expect(headerSource).toContain('href="/dashboard"')
    expect(headerSource).toContain('Back to dashboard')
    expect(headerSource).toContain('aria-label="Back to dashboard"')
  })

  it('keeps Back to Aberdare workspace on the live tool', () => {
    const headerSource = readFileSync(
      path.resolve(
        process.cwd(),
        'src/components/clients/aberdare/AberdareWorkspaceHeader.tsx',
      ),
      'utf8',
    )
    const liveSource = readFileSync(
      path.resolve(
        process.cwd(),
        'src/components/clients/aberdare/AberdareLiveProcurementApp.tsx',
      ),
      'utf8',
    )
    expect(headerSource).toContain(
      'href="/clients/aberdare/procurement-control-preview"',
    )
    expect(headerSource).toContain('Back to Aberdare workspace')
    expect(liveSource).toContain('showBackToWorkspace')
    expect(liveSource).not.toContain('showReturnToDashboard')
  })

  it('removes Module labels from the Aberdare landing', () => {
    const landingSource = readFileSync(
      path.resolve(
        process.cwd(),
        'src/components/clients/aberdare/AberdareWorkspaceLanding.tsx',
      ),
      'utf8',
    )
    expect(landingSource).not.toMatch(/Module\s*[12]/i)
    expect(landingSource).toContain('open-live-procurement')
    expect(landingSource).toContain('open-formal-assessment')
    expect(landingSource).toContain('ABERDARE_LIVE_HREF')
    expect(landingSource).toContain('DASHBOARD_WORKSPACE_FORMAL.href')
  })

  it('uses a compact demo status chip during the workspace demo experience', () => {
    const dashboardSource = readFileSync(
      path.resolve(
        process.cwd(),
        'src/app/(dashboard)/dashboard/page.tsx',
      ),
      'utf8',
    )
    expect(dashboardSource).toContain('DashboardDemoEnvironmentChip')
    expect(dashboardSource).toContain('showCompactDemoStatus')
    expect(dashboardSource).toContain('showLargeDevBypassBanner')
    expect(dashboardSource).toContain('Welcome back')
    expect(dashboardSource).toContain('properFirstName')
    expect(dashboardSource).toContain('REAP Solutions Platform')
  })
})
