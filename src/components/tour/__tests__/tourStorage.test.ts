import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import {
  TOUR_STORAGE_VERSION,
  guideCompletedKey,
  readGuideCompleted,
  writeGuideCompleted,
} from '../tourStorage'

describe('tourStorage', () => {
  beforeEach(() => {
    // `vi.stubGlobal` types its value parameter as `unknown`, so TypeScript
    // cannot infer `this` inside the stub's methods. Close over the store
    // instead of reaching through `this`.
    let store: Record<string, string> = {}

    vi.stubGlobal('localStorage', {
      getItem(key: string): string | null {
        return store[key] ?? null
      },
      setItem(key: string, value: string): void {
        store[key] = value
      },
      removeItem(key: string): void {
        delete store[key]
      },
      clear(): void {
        store = {}
      },
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses versioned per-user per-guide keys', () => {
    expect(guideCompletedKey('user-a', 'first-time-setup')).toBe(
      `reap-tour:user-a:first-time-setup:${TOUR_STORAGE_VERSION}`,
    )
  })

  it('isolates completion between users on the same browser', () => {
    writeGuideCompleted('user-a', 'first-time-setup', true)
    expect(readGuideCompleted('user-a', 'first-time-setup')).toBe(true)
    expect(readGuideCompleted('user-b', 'first-time-setup')).toBe(false)
  })

  it('migrates legacy completion keys', () => {
    localStorage.setItem('reap-guide-completed:user-a:first-time-setup', '1')
    expect(readGuideCompleted('user-a', 'first-time-setup')).toBe(true)
    expect(localStorage.getItem(guideCompletedKey('user-a', 'first-time-setup'))).toBe('1')
  })
})
