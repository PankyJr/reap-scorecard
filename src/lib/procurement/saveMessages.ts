import type { ProcurementTmpsDenominatorSource } from './tmpsDenominator'

/**
 * What a person sees when saving a procurement scorecard goes wrong. Plain
 * words only: technical detail (database codes, missing columns, migrations)
 * goes to the server log with console.error and never reaches the screen.
 *
 * These live outside the 'use server' action files, which may only export
 * async functions.
 */
export const PROCUREMENT_SAVE_MESSAGES = {
  /** Something on our side failed; the person can only try again. */
  failed: 'The scorecard could not be saved. Try again, and if it keeps happening contact REAP support.',
  /** The save may or may not have gone through. */
  unconfirmed: 'The scorecard may not have been saved. Check the company page for it before you try again.',
  suppliersFailed: 'The suppliers could not be saved. Try again, and if it keeps happening contact REAP support.',
  scoresFailed: 'The scores could not be saved. Try again, and if it keeps happening contact REAP support.',
  /** An edit failed before anything saved was changed. */
  editFailed: 'The changes could not be saved. Try again, and if it keeps happening contact REAP support.',
  /**
   * An edit replaces the saved suppliers and scores in steps, so a failure
   * part-way can leave the saved scorecard incomplete. Say so.
   */
  editIncomplete:
    'The changes could not be saved, and the saved scorecard may now be incomplete. Open it to check its suppliers and score, save it again if anything is missing, and contact REAP support if it keeps happening.',
} as const

/** Why total spend cannot be used, in plain words, by where it was to come from. */
export function totalSpendProblemMessage(source: ProcurementTmpsDenominatorSource): string {
  if (source === 'calculated') {
    return 'Total spend works out at zero or less. Use the suppliers’ spend as the total spend, or correct the included and excluded costs.'
  }
  if (source === 'manual') {
    return 'Total spend can no longer be typed in as one amount. Work it out from the included and excluded costs, or use the suppliers’ spend.'
  }
  return 'The suppliers’ spend adds up to zero. Enter each supplier’s spend, or work out total spend from the included and excluded costs.'
}

/** True when a database error means the database is missing columns (pending migrations). */
export function isMissingColumnError(err: { code?: string; message?: string } | null | undefined): boolean {
  if (!err) return false
  const message = err.message ?? ''
  return (
    err.code === '42703' ||
    err.code === 'PGRST204' ||
    message.includes('Could not find the') ||
    (message.includes('column') && message.includes('does not exist'))
  )
}
