'use client'

import type { ReactNode } from 'react'
import { DropdownMenu as M } from 'radix-ui'
import { Check } from 'lucide-react'
import { cn } from './cn'

/** Untitled UI menu: white, 1px border, soft shadow, 40px rows, 16px icons. */
export const Menu = M.Root
export const MenuTrigger = M.Trigger

export function MenuContent({ children, align = 'end', className }: { children: ReactNode; align?: 'start' | 'end'; className?: string }) {
  return (
    <M.Portal>
      <M.Content
        align={align}
        sideOffset={6}
        collisionPadding={12}
        className={cn('reap-pop-in z-50 min-w-60 rounded-control border border-line bg-raised p-1.5 shadow-pop', className)}
      >
        {children}
      </M.Content>
    </M.Portal>
  )
}

const itemClass =
  'relative flex min-h-10 w-full cursor-pointer select-none items-center gap-2.5 rounded-sm px-2.5 text-meta font-medium text-ink outline-none transition-colors duration-150 data-[highlighted]:bg-sunken data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&>svg]:h-4 [&>svg]:w-4 [&>svg]:shrink-0 [&>svg]:text-label'

export function MenuItem({ children, onSelect, asChild, className }: { children: ReactNode; onSelect?: (e: Event) => void; asChild?: boolean; className?: string }) {
  return (
    <M.Item onSelect={onSelect} asChild={asChild} className={cn(itemClass, className)}>
      {children}
    </M.Item>
  )
}

export function MenuLabel({ children }: { children: ReactNode }) {
  return <M.Label className="px-2.5 pb-1 pt-2 text-caps font-semibold text-label">{children}</M.Label>
}

export function MenuSeparator() {
  return <M.Separator className="-mx-1.5 my-1.5 h-px bg-line" />
}

export function MenuRadioGroup({ value, onValueChange, children }: { value: string; onValueChange: (v: string) => void; children: ReactNode }) {
  return (
    <M.RadioGroup value={value} onValueChange={onValueChange}>
      {children}
    </M.RadioGroup>
  )
}

export function MenuRadioItem({ value, children }: { value: string; children: ReactNode }) {
  return (
    <M.RadioItem value={value} className={cn(itemClass, 'pr-8')}>
      {children}
      <M.ItemIndicator className="absolute right-2.5 inline-flex">
        <Check className="h-4 w-4 text-teal" aria-hidden />
      </M.ItemIndicator>
    </M.RadioItem>
  )
}
