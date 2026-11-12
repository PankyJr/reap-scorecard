'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ClipboardList, FileBarChart2 } from 'lucide-react'
import { buttonStyles } from '@/components/ui/buttonStyles'
import { cn } from '@/components/ui/cn'

export type NeedChoice = {
  kind: 'full' | 'procurement'
  title: string
  purpose: string
  covers: string
  useFor: string
  youNeed: string
  href: string
}

const ICON = { full: FileBarChart2, procurement: ClipboardList }

/**
 * "What do you need?" as two large selectable cards (Ilias Miah / Untitled
 * UI): a radio in the corner, an icon, the title and three short lines.
 * Selected = teal border and a light teal tint. "Continue" goes on.
 */
export function NeedChooser({ choices }: { choices: NeedChoice[] }) {
  const router = useRouter()
  const [picked, setPicked] = useState<NeedChoice['kind'] | null>(null)
  const chosen = choices.find((c) => c.kind === picked) ?? null
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (chosen) router.push(chosen.href)
      }}
      className="space-y-6"
    >
      <fieldset>
        <legend className="sr-only">What do you need?</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          {choices.map((choice) => {
            const Icon = ICON[choice.kind]
            const selected = choice.kind === picked
            return (
              <label
                key={choice.kind}
                className={cn(
                  'group relative flex cursor-pointer flex-col rounded-card border bg-surface p-5 transition-[border-color,background-color,transform] duration-200 ease-[cubic-bezier(.32,.72,0,1)] hover:-translate-y-px has-[:focus-visible]:ring-[3px] has-[:focus-visible]:ring-teal/25',
                  selected ? 'border-teal bg-brand-soft' : 'border-line hover:border-line-strong',
                )}
              >
                <input type="radio" name="need" value={choice.kind} checked={selected} onChange={() => setPicked(choice.kind)} className="sr-only" />
                <span
                  className={cn(
                    'absolute right-5 top-5 flex h-5 w-5 items-center justify-center rounded-full border transition-colors duration-200',
                    selected ? 'border-teal bg-teal' : 'border-control-line bg-surface group-hover:border-line-strong',
                  )}
                  aria-hidden
                >
                  {selected ? <span className="h-2 w-2 rounded-full bg-surface" /> : null}
                </span>
                <span className={cn('flex h-10 w-10 items-center justify-center rounded-control border', selected ? 'border-teal/20 bg-surface text-teal' : 'border-line bg-surface text-icon')} aria-hidden>
                  <Icon className="h-[18px] w-[18px]" />
                </span>
                <span className="mt-4 block pr-8 text-section font-semibold text-ink">{choice.title}</span>
                <span className="mt-1 block text-body text-label">{choice.purpose}</span>
                <span className="mt-4 block space-y-1.5 border-t border-line pt-4 text-meta">
                  <span className="block">
                    <span className="font-medium text-ink">Covers </span>
                    <span className="text-label">{choice.covers}</span>
                  </span>
                  <span className="block">
                    <span className="font-medium text-ink">Use it for </span>
                    <span className="text-label">{choice.useFor}</span>
                  </span>
                  <span className="block">
                    <span className="font-medium text-ink">You need </span>
                    <span className="text-label">{choice.youNeed}</span>
                  </span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>
      <div className="flex justify-end">
        <button type="submit" disabled={!chosen} className={buttonStyles({ variant: 'primary', className: 'w-full sm:w-auto' })}>
          Continue
        </button>
      </div>
    </form>
  )
}
