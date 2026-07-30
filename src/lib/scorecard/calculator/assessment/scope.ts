import type { AssessmentScopeMode, ScorecardElementKey } from '../types'
import { getInitialCalculatorElementKeys, isScorecardElementKey } from '../elements/registry'

export function resolveSelectedElements(args: {
  scopeMode: AssessmentScopeMode
  selectedElements: string[]
}): { ok: true; elements: ScorecardElementKey[] } | { ok: false; error: string } {
  const available = getInitialCalculatorElementKeys()

  if (args.scopeMode === 'full') {
    return { ok: true, elements: available }
  }

  const unique = [...new Set(args.selectedElements.map((e) => e.trim()).filter(Boolean))]
  if (unique.length === 0) {
    return { ok: false, error: 'Select at least one scorecard element.' }
  }
  if (args.scopeMode === 'single' && unique.length !== 1) {
    return { ok: false, error: 'Single-element scope requires exactly one element.' }
  }

  const invalid = unique.filter((e) => !isScorecardElementKey(e))
  if (invalid.length > 0) {
    return { ok: false, error: `Unsupported element(s): ${invalid.join(', ')}` }
  }

  return { ok: true, elements: unique as ScorecardElementKey[] }
}

export function describeAssessmentScope(args: {
  scopeMode: AssessmentScopeMode
  selectedElements: ScorecardElementKey[]
}): {
  label: string
  isCompleteBbbeeScorecard: boolean
  honestyMessage: string | null
} {
  const available = getInitialCalculatorElementKeys()
  const selected = args.selectedElements
  const coversInitialScope =
    available.every((k) => selected.includes(k)) && selected.length === available.length

  // Even "full available" in this release is not a complete Codes scorecard
  // (Ownership, Skills Development, Preferential Procurement still outside modular calculator scope).
  const isCompleteBbbeeScorecard = false

  if (args.scopeMode === 'single' || selected.length === 1) {
    return {
      label: 'Single-element result',
      isCompleteBbbeeScorecard,
      honestyMessage: 'Selected-element score. This is not a complete B-BBEE level.',
    }
  }

  if (args.scopeMode === 'selected' || !coversInitialScope) {
    return {
      label: 'Selected-elements result',
      isCompleteBbbeeScorecard,
      honestyMessage: 'Selected-element score. This is not a complete B-BBEE level.',
    }
  }

  return {
    label: 'Full available scorecard result (modular calculator scope)',
    isCompleteBbbeeScorecard,
    honestyMessage:
      'This covers the calculator’s currently implemented elements only. It is not a complete B-BBEE level while Ownership, Skills Development, Preferential Procurement and other required elements remain outside this modular scope.',
  }
}
