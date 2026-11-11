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
  size?: string | null
  /** Grey line under the name (industry on /companies). */
  sub?: string | null
  /** How many scorecards the company has (/companies). */
  count?: number
  /** The full scorecard's status, in the shared wording (status-copy.ts), as on /companies. */
  status: { label: string; tone: ChipTone }
  score: { total: number; available: number } | null
  /** The latest procurement scorecard's base points, "23.88 of 25". */
  procurement: { achieved: number; cap: number | null } | null
  updatedAt: string | null
  attention: string | null
}

type SortKey = 'name' | 'size' | 'count' | 'score' | 'procurement' | 'updated'

const pick = (row: CompanyTableRow, key: SortKey): string | number | null => {
  switch (key) {
    case 'name':
      return row.name
    case 'size':
      return row.size ?? null
    case 'count':
      return row.count ?? null
    case 'score':
      return row.score?.total ?? null
    case 'procurement':
      return row.procurement?.achieved ?? null
    case 'updated':
      return row.updatedAt
  }
}

/**
 * YOUR COMPANIES (Untitled UI frame, FinTrack headers and dashed rows). The
 * whole row opens the company; there are no per-row buttons. On a phone each
 * row stacks into label/value lines, so nothing scrolls sideways.
 */
export function CompaniesTable({
  rows,
  columns = { size: true, count: false },
  rememberAs = 'dashboard-companies',
}: {
  rows: CompanyTableRow[]
  columns?: { size?: boolean; count?: boolean }
  rememberAs?: string
}) {
  const { sorted, sort, toggle } = useSortedRows<CompanyTableRow, SortKey>(rows, pick, null, rememberAs)
  return (
    <Table stackOnMobile caption="Your companies">
      <thead className="border-y border-line bg-sunken">
        <tr>
          <SortHeader label="Company" sortKey="name" sort={sort} onToggle={toggle} />
          {columns.size ? <SortHeader label="Size" sortKey="size" sort={sort} onToggle={toggle} /> : null}
          {columns.count ? <SortHeader label="Scorecards" sortKey="count" sort={sort} onToggle={toggle} align="right" /> : null}
          <Th>Status</Th>
          <SortHeader label="Score" sortKey="score" sort={sort} onToggle={toggle} align="right" />
          <SortHeader label="Procurement" sortKey="procurement" sort={sort} onToggle={toggle} align="right" />
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
              {row.sub ? <span className="mt-0.5 block truncate text-meta text-label" title={row.sub}>{row.sub}</span> : null}
              {row.attention ? <span className="mt-0.5 block truncate text-meta text-attention" title={row.attention}>{row.attention}</span> : null}
            </Td>
            {columns.size ? (
              <Td label="Size" className="whitespace-nowrap text-label">
                {row.size ?? '—'}
              </Td>
            ) : null}
            {columns.count ? (
              <Td label="Scorecards" align="right" className="text-label">
                {row.count ?? 0}
              </Td>
            ) : null}
            <Td label="Status">
              <Chip tone={row.status.tone}>{row.status.label}</Chip>
            </Td>
            <Td label="Score" align="right" className="whitespace-nowrap">
              {row.score ? (
                <span>
                  <Num value={row.score.total} className="font-semibold text-ink" /> <span className="text-label">of {formatCeiling(row.score.available)}</span>
                </span>
              ) : (
                <span className="text-subtle">—</span>
              )}
            </Td>
            <Td label="Procurement" align="right" className="whitespace-nowrap">
              {row.procurement ? (
                <span>
                  <Num value={row.procurement.achieved} className="font-semibold text-ink" />
                  {row.procurement.cap != null ? <span className="text-label"> of {formatCeiling(row.procurement.cap)}</span> : null}
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
