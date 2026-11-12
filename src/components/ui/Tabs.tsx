'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { Tabs as T } from 'radix-ui'
import { cn } from './cn'

/**
 * Tabs (shadcn/ui on Radix). Arrow keys move between tabs. Give it
 * `rememberAs` and the last tab is restored for this browser (design rule 24).
 */
export function Tabs(args: {
  tabs: Array<{ value: string; label: ReactNode; content: ReactNode }>
  defaultValue?: string
  rememberAs?: string
  label: string
  className?: string
}) {
  const first = args.defaultValue ?? args.tabs[0]?.value ?? ''
  const [value, setValue] = useState(first)
  useEffect(() => {
    if (!args.rememberAs) return
    try {
      const saved = window.localStorage.getItem(`reap-tab:${args.rememberAs}`)
      if (saved && args.tabs.some((t) => t.value === saved)) setValue(saved)
    } catch {
      // No storage: start on the first tab.
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [args.rememberAs])
  const change = (next: string) => {
    setValue(next)
    if (args.rememberAs) {
      try {
        window.localStorage.setItem(`reap-tab:${args.rememberAs}`, next)
      } catch {
        // Ignore.
      }
    }
  }
  return (
    <T.Root value={value} onValueChange={change} className={args.className}>
      <T.List aria-label={args.label} className="flex gap-1 overflow-x-auto border-b border-line">
        {args.tabs.map((tab) => (
          <T.Trigger
            key={tab.value}
            value={tab.value}
            className="relative -mb-px inline-flex min-h-11 items-center whitespace-nowrap border-b-2 border-transparent px-3 text-meta font-semibold text-label transition-colors duration-150 hover:text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/30 data-[state=active]:border-brand data-[state=active]:text-ink"
          >
            {tab.label}
          </T.Trigger>
        ))}
      </T.List>
      {args.tabs.map((tab) => (
        <T.Content key={tab.value} value={tab.value} className={cn('pt-5 focus-visible:outline-none')}>
          {tab.content}
        </T.Content>
      ))}
    </T.Root>
  )
}
