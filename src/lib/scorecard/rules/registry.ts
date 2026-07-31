import { GENERIC_CODES_2019_V1 } from './generic-2019/scorecard'
import type { RuleSet } from './types'

/**
 * Reserved key for the next amendment cycle.
 *
 * No 2026 amendment has been gazetted, so the draft deliberately carries the
 * 2019 rules unchanged: it exists so that stored calculation runs, migrations
 * and admin tooling can reference the key, and so that an administrator can
 * model against it, but it can never produce a final B-BBEE level. Its rules
 * must only diverge from the 2019 set once a real draft gazette is supplied.
 */
export const RESERVED_DRAFT_RULE_SET: RuleSet = {
  ...GENERIC_CODES_2019_V1,
  key: 'generic-codes-2026-draft',
  version: '0.0.0-draft',
  displayName: 'Generic codes — 2026 draft (not gazetted, modelling only)',
  status: 'reserved_draft',
  selectableAsOperative: false,
  effectiveFrom: '9999-01-01',
}

const RULE_SETS: RuleSet[] = [GENERIC_CODES_2019_V1, RESERVED_DRAFT_RULE_SET]

export const DEFAULT_RULE_SET_KEY = GENERIC_CODES_2019_V1.key

export function listRuleSets(): RuleSet[] {
  return RULE_SETS
}

/** Rule sets an ordinary user may select for an operative result. */
export function listSelectableRuleSets(): RuleSet[] {
  return RULE_SETS.filter((ruleSet) => ruleSet.selectableAsOperative && ruleSet.status === 'active')
}

export function getRuleSet(key: string): RuleSet {
  const found = RULE_SETS.find((ruleSet) => ruleSet.key === key)
  if (!found) throw new Error(`Unknown rule set: ${key}`)
  return found
}

export function tryGetRuleSet(key: string): RuleSet | null {
  return RULE_SETS.find((ruleSet) => ruleSet.key === key) ?? null
}

export type RuleSetSelection = {
  ruleSet: RuleSet
  /** False when the rule set may not produce an operative final level. */
  operative: boolean
  blockedReason: string | null
}

/**
 * Resolve a requested rule set. A reserved draft is only allowed through when
 * an authorised administrator has explicitly enabled non-production modelling,
 * and even then it is never operative.
 */
export function resolveRuleSet(args: {
  requestedKey?: string | null
  allowNonProductionDraft?: boolean
}): RuleSetSelection {
  const key = args.requestedKey?.trim() || DEFAULT_RULE_SET_KEY
  const ruleSet = tryGetRuleSet(key)

  if (!ruleSet) {
    return {
      ruleSet: GENERIC_CODES_2019_V1,
      operative: true,
      blockedReason: `Unknown rule set "${key}". Falling back to ${DEFAULT_RULE_SET_KEY}.`,
    }
  }

  if (ruleSet.selectableAsOperative && ruleSet.status === 'active') {
    return { ruleSet, operative: true, blockedReason: null }
  }

  if (!args.allowNonProductionDraft) {
    return {
      ruleSet: GENERIC_CODES_2019_V1,
      operative: true,
      blockedReason: `Rule set "${key}" is a reserved draft and is not selectable. Using ${DEFAULT_RULE_SET_KEY}.`,
    }
  }

  return {
    ruleSet,
    operative: false,
    blockedReason: `Rule set "${key}" is enabled for non-production modelling only and cannot produce a final B-BBEE level.`,
  }
}

export { GENERIC_CODES_2019_V1 }
