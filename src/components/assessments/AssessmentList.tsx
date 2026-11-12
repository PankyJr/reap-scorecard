'use client'

import Link from 'next/link'
import { ChevronRight, ClipboardList, FileBarChart2 } from 'lucide-react'
import { Chip } from '@/components/ui/Chip'
import { Num } from '@/components/ui/Num'
import { MiniBar } from '@/components/ui/MiniBar'
import { SortHeader, useSortedRows } from '@/components/ui/SortHeader'
import { Table, TBody, Row, Td, Th } from '@/components/ui/Table'
import { formatCeiling, formatDate } from '@/components/ui/format'
import { fullStatusChip } from '@/components/status/status-copy'
import type { AssessmentRow } from '@/lib/assessments/rows'

type SortKey = 'title' | 'company' | 'score' | 'updated'

const pick = (row: AssessmentRow, key: SortKey): string | number | null => {
  switch (key) {
    case 'title':
      return row.title
    case 'company':
      return row.companyName
    case 'score':
      return row.points?.value ?? null
    case 'updated':
      return row.updatedAt
  }
}

/** A procurement scorecard is always scored once saved: its chip says so. */
function chipFor(row: AssessmentRow) {
  return row.kind === 'full' ? fullStatusChip(row.status) : { label: 'Scored', tone: 'success' as const }
}

/**
 * Scorecards as a table (FinTrack headers, Untitled hairlines): what it is,
 * where it stands in the shared status words, its points (Number Flow), the
 * next step in plain words, when it last changed. The whole row opens it.
 * Used on company detail, /scorecards and /procurement.
 */
export function AssessmentList({ rows, showCompany = true, rememberAs }: { rows: AssessmentRow[]; showCompany?: boolean; rememberAs?: string }) {
  const { sorted, sort, toggle } = useSortedRows<AssessmentRow, SortKey>(rows, pick, null, rememberAs)
  return (
    <Table stackOnMobile caption="Scorecards">
      <thead className="border-b border-line">
        <tr>
          <SortHeader label="Scorecard" sortKey="title" sort={sort} onToggle={toggle} />
          {showCompany ? <SortHeader label="Company" sortKey="company" sort={sort} onToggle={toggle} /> : null}
          <Th>Status</Th>
          <SortHeader label="Points" sortKey="score" sort={sort} onToggle={toggle} align="right" />
          <Th>Next step</Th>
          <SortHeader label="Updated" sortKey="updated" sort={sort} onToggle={toggle} align="right" />
          <Th className="w-10">
            <span className="sr-only">Open</span>
          </Th>
        </tr>
      </thead>
      <TBody>
        {sorted.map((row) => {
          const Icon = row.kind === 'full' ? FileBarChart2 : ClipboardList
          const chip = chipFor(row)
          return (
            <Row key={`${row.kind}-${row.id}`} interactive className="relative">
              <Td data-primary className="max-w-[22rem]">
                <span className="flex items-center gap-3">
                  <span className="hidden h-8 w-8 shrink-0 items-center justify-center rounded-[8px] bg-segment text-icon sm:flex" aria-hidden>
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <Link
                      href={row.status.href}
                      className="block truncate font-medium text-ink after:absolute after:inset-0 after:content-[''] focus-visible:outline-none group-focus-within:underline"
                      title={row.title}
                    >
                      {row.title}
                    </Link>
                    <span className="block truncate text-meta text-label">{row.kind === 'full' ? 'Full scorecard' : 'Procurement scorecard'}</span>
                  </span>
                </span>
              </Td>
              {showCompany ? (
                <Td label="Company" className="max-w-[16rem] truncate text-label" title={row.companyName}>
                  {row.companyName}
                </Td>
              ) : null}
              <Td label="Status">
                <Chip tone={chip.tone}>{chip.label}</Chip>
              </Td>
              <Td label="Points" align="right" className="whitespace-nowrap" title={row.score ?? undefined}>
                {row.points ? (
                  <span className="inline-flex flex-wrap items-center justify-end gap-x-2.5">
                    {row.points.of != null ? <MiniBar value={row.points.value} max={row.points.of} className="hidden sm:inline-block" /> : null}
                    <span>
                    <Num value={row.points.value} className="font-medium text-ink" />
                    {row.points.of != null ? <span className="text-label"> of {formatCeiling(row.points.of)}</span> : null}
                    </span>
                    {/* Procurement bonus, apart from the base (as on the score page). */}
                    {row.points.bonus ? (
                      <span className="block text-meta text-label">
                        bonus {row.points.bonus.value.toFixed(2)} of {formatCeiling(row.points.bonus.of)}
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span className="text-subtle">—</span>
                )}
              </Td>
              <Td label="Next step" className="whitespace-nowrap text-label">
                {row.status.next}
              </Td>
              <Td label="Updated" align="right" className="whitespace-nowrap text-label">
                {formatDate(row.updatedAt)}
              </Td>
              <Td data-stack-hide className="w-10 text-right">
                <ChevronRight className="ml-auto h-4 w-4 text-icon opacity-0 transition-opacity duration-150 group-focus-within:opacity-100 group-hover:opacity-100" aria-hidden />
              </Td>
            </Row>
          )
        })}
      </TBody>
    </Table>
  )
}
