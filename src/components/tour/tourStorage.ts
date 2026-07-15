export const TOUR_STORAGE_VERSION = 'procurement-v1'

export const TOUR_ACTIVE_KEY = 'reap-guided-tour-active'
export const TOUR_STEP_KEY = 'reap-guided-tour-step'
export const TOUR_GUIDE_KEY = 'reap-guided-tour-guide'

/** @deprecated Legacy global key — migrated on read */
export const TOUR_COMPLETED_KEY = 'reap-guided-tour-completed'

export function tourCompletedKey(userId?: string | null): string {
  if (userId) return `reap-tour:${userId}:${TOUR_STORAGE_VERSION}`
  return `reap-tour:anon:${TOUR_STORAGE_VERSION}`
}

export function guideCompletedKey(userId: string | null | undefined, guideId: string): string {
  const uid = userId ?? 'anon'
  return `reap-tour:${uid}:${guideId}:${TOUR_STORAGE_VERSION}`
}

function legacyGuideCompletedKeys(
  userId: string | null | undefined,
  guideId: string,
): string[] {
  const keys: string[] = []
  if (userId) {
    keys.push(`reap-guide-completed:${userId}:${guideId}`)
    if (guideId === 'full-platform') keys.push(`${TOUR_COMPLETED_KEY}:${userId}`)
    keys.push(tourCompletedKey(userId))
  }
  keys.push(`reap-guide-completed:${guideId}`)
  return keys
}

export function readGuideCompleted(userId: string | null | undefined, guideId: string): boolean {
  try {
    const key = guideCompletedKey(userId, guideId)
    if (localStorage.getItem(key) === '1') return true

    for (const legacyKey of legacyGuideCompletedKeys(userId, guideId)) {
      if (legacyKey !== key && localStorage.getItem(legacyKey) === '1') {
        writeGuideCompleted(userId, guideId, true)
        return true
      }
    }
    return false
  } catch {
    return false
  }
}

export function writeGuideCompleted(
  userId: string | null | undefined,
  guideId: string,
  value: boolean,
) {
  try {
    const key = guideCompletedKey(userId, guideId)
    if (value) localStorage.setItem(key, '1')
    else localStorage.removeItem(key)
  } catch {
    // ignore
  }
}

/** @deprecated Use readGuideCompleted(userId, 'full-platform') */
export function readTourCompleted(userId?: string | null): boolean {
  return readGuideCompleted(userId, 'full-platform')
}

/** @deprecated Use writeGuideCompleted */
export function writeTourCompleted(userId: string | null | undefined, value: boolean) {
  writeGuideCompleted(userId, 'full-platform', value)
}

export function readSetupGuideCompleted(userId?: string | null): boolean {
  return readGuideCompleted(userId, 'first-time-setup')
}
