import { socioEconomicDevelopmentAdapter } from './socio-economic-development/adapter'
import { enterpriseDevelopmentAdapter } from './enterprise-development/adapter'
import { supplierDevelopmentAdapter } from './supplier-development/adapter'
import { managementControlAdapter } from './management-control/adapter'
import type { ScorecardElementAdapter, ScorecardElementKey } from '../types'
import { SCORECARD_ELEMENT_KEYS } from '../types'

const adapters: ScorecardElementAdapter[] = [
  socioEconomicDevelopmentAdapter,
  enterpriseDevelopmentAdapter,
  supplierDevelopmentAdapter,
  managementControlAdapter,
]

export function listScorecardElementAdapters(): ScorecardElementAdapter[] {
  return adapters
}

export function getScorecardElementAdapter(elementKey: ScorecardElementKey): ScorecardElementAdapter {
  const found = adapters.find((a) => a.elementKey === elementKey)
  if (!found) throw new Error(`Unknown scorecard element: ${elementKey}`)
  return found
}

export function isScorecardElementKey(value: string): value is ScorecardElementKey {
  return (SCORECARD_ELEMENT_KEYS as readonly string[]).includes(value)
}

/** Full available scope for this calculator release. */
export function getInitialCalculatorElementKeys(): ScorecardElementKey[] {
  return [...SCORECARD_ELEMENT_KEYS]
}
