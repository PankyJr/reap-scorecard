'use client'

import NumberFlow from '@number-flow/react'

/**
 * Number Flow (npm @number-flow/react) on every key figure.
 *
 * The real value is in the server HTML, so the first paint already shows it
 * (no blank frame, no count-up from zero). When the value changes, the digits
 * roll. With reduced motion on, Number Flow swaps the value without motion
 * (its respectMotionPreference default).
 *
 * Points are always two decimals (design rule 8). en-US is used only for the
 * decimal point: en-ZA would print "16,10".
 */
export function Num({ value, decimals = 2, className }: { value: number; decimals?: number; className?: string }) {
  return (
    <NumberFlow
      value={value}
      locales="en-US"
      format={{ minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: false }}
      className={className}
      style={{ fontVariantNumeric: 'tabular-nums' }}
    />
  )
}
