export interface FlowThroughNormalisationResult {
  value: boolean
  rawValue: string | null
  warning: string | null
}

const ENABLED_FLOW_THROUGH_VALUES = new Set(['yes', 'y', 'true', '1'])
const DISABLED_FLOW_THROUGH_VALUES = new Set(['no', 'n', 'false', '0'])

/**
 * Canonical normaliser for Flow Through values from external text sources.
 * Unknown non-empty values remain disabled and return a warning for correction.
 */
export function normalizeFlowThroughValue(
  raw: unknown,
): FlowThroughNormalisationResult {
  if (raw == null) {
    return { value: false, rawValue: null, warning: null }
  }

  if (typeof raw === 'boolean') {
    return {
      value: raw,
      rawValue: raw ? 'true' : 'false',
      warning: null,
    }
  }

  const rawValue = String(raw).trim()
  if (!rawValue) {
    return { value: false, rawValue: '', warning: null }
  }

  const normalized = rawValue.toLowerCase()
  if (ENABLED_FLOW_THROUGH_VALUES.has(normalized)) {
    return { value: true, rawValue, warning: null }
  }
  if (DISABLED_FLOW_THROUGH_VALUES.has(normalized)) {
    return { value: false, rawValue, warning: null }
  }

  return {
    value: false,
    rawValue,
    warning: `Unrecognised Flow Through value “${rawValue}”; expected Yes, Y, True, 1, No, N, False, 0, or blank. Flow Through was left off.`,
  }
}
