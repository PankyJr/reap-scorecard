'use client'

import { CircleHelp } from 'lucide-react'
import { useHelpOptional } from './HelpProvider'

/** The "?" at the end of every page header: opens help made for this page. */
export function HelpButton() {
  const help = useHelpOptional()
  if (!help) return null
  return (
    <button
      type="button"
      onClick={() => help.openPanel()}
      data-help="help-button"
      aria-label="Help for this page"
      aria-haspopup="dialog"
      aria-keyshortcuts="?"
      title="Help for this page (?)"
      className="flex h-11 w-11 items-center justify-center rounded-control text-icon transition-[background-color,color,transform] duration-200 hover:bg-segment hover:text-ink active:scale-[0.96] focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-teal/25 sm:h-9 sm:w-9"
    >
      <CircleHelp className="h-[18px] w-[18px]" aria-hidden />
    </button>
  )
}
