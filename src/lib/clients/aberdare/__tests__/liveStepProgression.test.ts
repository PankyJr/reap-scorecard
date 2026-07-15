import { describe, expect, it } from 'vitest'

/** Mirrors AberdareLiveProcurementApp step resolution. */
function resolveAberdareLiveStep(
  hasParseResult: boolean,
  overrideCount: number,
): 'upload' | 'review' | 'test' {
  if (!hasParseResult) return 'upload'
  if (overrideCount > 0) return 'test'
  return 'review'
}

describe('Aberdare live procurement step progression', () => {
  it('stays on Upload before a report is present', () => {
    expect(resolveAberdareLiveStep(false, 0)).toBe('upload')
    expect(resolveAberdareLiveStep(false, 3)).toBe('upload')
  })

  it('lands on Review after upload with no scenario changes', () => {
    expect(resolveAberdareLiveStep(true, 0)).toBe('review')
  })

  it('moves to Adjust suppliers only after scenario overrides exist', () => {
    expect(resolveAberdareLiveStep(true, 1)).toBe('test')
  })
})
