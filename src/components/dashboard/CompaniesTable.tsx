'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Chip, type ChipTone } from '@/components/ui/Chip'
import { SortHeader, useSortedRows } from '@/components/ui/SortHeader'
import { Table, TBody, Row, Td, Th } from '@/components/ui/Table'
import { Num } from '@/components/ui/Num'
import { formatCeiling, formatDate } from '@/components/ui/format'

export type CompanyTableRow = {
  id: string
  name: string
  href: string
  size: string | null
  /** The same chips /companies shows, from the same status function. */
  chips: Array<{ label: string; tone: ChipTone }>
  score: { total: number; available: number; final: boolean } | null
  updatedAt: string | null
  attention: string | null
}

type SortKey = 'name' | 'size' | 'score' | 'updated'

const pick = (row: CompanyTableRow, key: SortKey): string | number | null => {
  switch (key) {
    case 'name':
      return row.name
    case 'size':
      return row.size
    case 'score':
      return row.score?.total ?? null
    case 'updated':
      return row.updatedAt
  }
}

/**
 * YOUR COMPANIES (Untitled UI frame, FinTrack headers and dashed rows). The
 * whole row opens the company; there are no per-row buttons. On a phone each
 * row stacks into label/value lines, so nothing scrolls sideways.
 */
export function CompaniesTable({ rows }: { rows: CompanyTableRow[] }) {
  const { sorted, sort, toggle } = useSortedRows<CompanyTableRow, SortKey>(rows, pick, null, 'dashboard-companies')
  return (
    <Table stackOnMobile caption="Your companies">
      <thead className="border-y border-line bg-sunken">
        <tr>
          <SortHeader label="Company" sortKey="name" sort={sort} onToggle={toggle} />
          <SortHeader label="Size" sortKey="size" sort={sort} onToggle={toggle} />
          <Th>Status</Th>
          <SortHeader label="Score" sortKey="score" sort={sort} onToggle={toggle} align="right" />
          <SortHeader label="Updated" sortKey="updated" sort={sort} onToggle={toggle} align="right" />
          <Th className="w-10">
            <span className="sr-only">Open</span>
          </Th>
        </tr>
      </thead>
      <TBody>
        {sorted.map((row) => (
          <Row key={row.id} interactive className="relative">
            <Td data-primary className="max-w-[24rem]">
              {/* The stretched link makes the whole row the click target. */}
              <Link
                href={row.href}
                className="block truncate font-medium text-ink after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-focus-within:underline"
                title={row.name}
              >
                {row.name}
              </Link>
              {row.attention ? <span className="mt-0.5 block truncate text-meta text-attention" title={row.attention}>{row.attention}</span> : null}
            </Td>
            <Td label="Size" className="whitespace-nowrap text-label">
              {row.size ?? '—'}
            </Td>
            <Td label="Status">
              <span className="flex flex-wrap justify-end gap-1.5 sm:justify-start">
                {row.chips.map((chip) => (
                  <Chip key={chip.label} tone={chip.tone}>
                    {chip.label}
                  </Chip>
                ))}
              </span>
            </Td>
            <Td label="Score" align="right" className="whitespace-nowrap">
              {row.score ? (
                <span>
                  <Num value={row.score.total} className="font-semibold text-ink" />{' '}
                  <span className="text-label">of {formatCeiling(row.score.available)}</span>
                  {!row.score.final ? <span className="ml-1 text-subtle">so far</span> : null}
                </span>
              ) : (
                <span className="text-subtle">—</span>
              )}
            </Td>
            <Td label="Updated" align="right" className="whitespace-nowrap text-label">
              {formatDate(row.updatedAt)}
            </Td>
            <Td data-stack-hide className="w-10 text-right">
              {/* Fades in on hover / keyboard focus: the whole row is the link. */}
              <ChevronRight className="ml-auto h-4 w-4 text-subtle opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100" aria-hidden />
            </Td>
          </Row>
        ))}
      </TBody>
    </Table>
  )
}
