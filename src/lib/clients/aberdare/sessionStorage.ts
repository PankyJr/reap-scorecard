import type {
  AberdareScenarioOverrides,
  AberdareSessionOverridesState,
} from './types'

const OVERRIDES_KEY = 'reap-aberdare-procurement-scenario-overrides-v1'

/**
 * Session-only storage for scenario overrides.
 * Never persist the full Aberdare supplier baseline to localStorage.
 */
export function loadAberdareSessionOverrides(): AberdareSessionOverridesState | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.sessionStorage.getItem(OVERRIDES_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as AberdareSessionOverridesState
    if (!parsed || typeof parsed !== 'object') return null
    return {
      overrides: parsed.overrides ?? {},
      scenarioName: parsed.scenarioName ?? 'Session scenario',
      updatedAt: parsed.updatedAt ?? new Date().toISOString(),
    }
  } catch {
    return null
  }
}

export function saveAberdareSessionOverrides(
  overrides: AberdareScenarioOverrides,
  scenarioName: string,
): void {
  if (typeof window === 'undefined') return
  const payload: AberdareSessionOverridesState = {
    overrides,
    scenarioName,
    updatedAt: new Date().toISOString(),
  }
  window.sessionStorage.setItem(OVERRIDES_KEY, JSON.stringify(payload))
}

export function clearAberdareSessionData(): void {
  if (typeof window === 'undefined') return
  window.sessionStorage.removeItem(OVERRIDES_KEY)
}
