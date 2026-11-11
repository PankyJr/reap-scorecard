'use client'

import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { Th } from './Table'
import { cn } from './cn'

export type SortDir = 'asc' | 'desc'
export type SortState<K extends string> = { key: K; dir: SortDir } | null

/**
 * Sort rows in the browser. Values come from `pick`; nulls always go last.
 * Remembers the choice for this browser tab (design rule 24) when given a key.
 */
export function useSortedRows<T, K extends string>(rows: T[], pick: (row: T, key: K) => string | number | null, initial: SortState<K> = null, rememberAs?: string) {
  const [sort, setSortState] = useState<SortState<K>>(() => {
    if (!rememberAs || typeof window === 'undefined') return initial
    try {
      const saved = window.sessionStorage.getItem(`reap-sort:${rememberAs}`)
      return saved ? (JSON.parse(saved) as SortState<K>) : initial
    } catch {
      return initial
    }
  })
  const setSort = (next: SortState<K>) => {
    setSortState(next)
    if (rememberAs) {
      try {
        window.sessionStorage.setItem(`reap-sort:${rememberAs}`, JSON.stringify(next))
      } catch {
        // Private browsing: sorting still works, it just is not remembered.
      }
    }
  }
  const sorted = useMemo(() => {
    if (!sort) return rows
    const factor = sort.dir === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => {
      const x = pick(a, sort.key)
      const y = pick(b, sort.key)
      if (x == null && y == null) return 0
      if (x == null) return 1
      if (y == null) return -1
      if (typeof x === 'number' && typeof y === 'number') return (x - y) * factor
      return String(x).localeCompare(String(y), 'en-ZA', { numeric: true }) * factor
    })
  }, [rows, sort, pick])
  const toggle = (key: K) => {
    if (!sort || sort.key !== key) setSort({ key, dir: 'asc' })
    else if (sort.dir === 'asc') setSort({ key, dir: 'desc' })
    else setSort(null)
  }
  return { sorted, sort, toggle }
}

/** A header you can press to sort: label + the FinTrack up/down chevrons. */
export function SortHeader<K extends string>({ label, sortKey, sort, onToggle, align = 'left', className }: { label: string; sortKey: K; sort: SortState<K>; onToggle: (key: K) => void; align?: 'left' | 'right'; className?: string }) {
  const active = sort?.key === sortKey
  const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ArrowUp : ArrowDown
  return (
    <Th align={align} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'} className={className}>
      <button
        type="button"
        onClick={() => onToggle(sortKey)}
        className={cn(
          '-mx-1.5 inline-flex h-8 items-center gap-1 rounded-sm px-1.5 uppercase tracking-label transition-colors duration-150 hover:text-ink focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand/30',
          active && 'text-ink',
        )}
      >
        {label}
        <Icon className="h-3 w-3" aria-hidden />
        <span className="sr-only">{active ? `, sorted ${sort.dir === 'asc' ? 'ascending' : 'descending'}` : ', press to sort'}</span>
      </button>
    </Th>
  )
}
