import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from './cn'

/**
 * Tables (FinTrack + Untitled UI): hairline frame, 12px uppercase grey
 * headers, 56px rows, dashed dividers, figures right-aligned and tabular
 * (design rule 8). Sorting lives in SortHeader (client).
 *
 * On a phone, pass `stackOnMobile` and give each cell a `label`: rows become
 * stacked cards with label/value lines, so there is no sideways scrolling.
 */
export function Table({ children, className, stackOnMobile = false, caption }: { children: ReactNode; className?: string; stackOnMobile?: boolean; caption?: string }) {
  return (
    <div className={cn('min-w-0', !stackOnMobile && 'overflow-x-auto', className)} data-stack={stackOnMobile ? 'true' : undefined}>
      <table className={cn('w-full border-collapse text-left text-sm tabular-nums', stackOnMobile && 'reap-stack-table')}>
        {caption ? <caption className="sr-only">{caption}</caption> : null}
        {children}
      </table>
    </div>
  )
}

export function THead({ children }: { children: ReactNode }) {
  return (
    <thead className="border-y border-line bg-sunken">
      <tr>{children}</tr>
    </thead>
  )
}

export function Th({ children, align = 'left', className, ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' }) {
  return (
    <th
      scope="col"
      className={cn(
        'h-10 whitespace-nowrap px-4 text-xs font-semibold uppercase tracking-label text-label first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6',
        align === 'right' && 'text-right',
        className,
      )}
      {...rest}
    >
      {children}
    </th>
  )
}

export function TBody({ children }: { children: ReactNode }) {
  return <tbody>{children}</tbody>
}

/** One row: 56px, dashed hairline below (not after the last), hover tint. */
export function Row({ children, className, interactive = false, ...rest }: HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  return (
    <tr
      className={cn(
        'border-b border-dashed border-line last:border-b-0',
        interactive && 'group cursor-pointer transition-colors duration-150 hover:bg-sunken focus-within:bg-sunken',
        className,
      )}
      {...rest}
    >
      {children}
    </tr>
  )
}

export function Td({
  children,
  align = 'left',
  label,
  className,
  ...rest
}: TdHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right'; /** The column name, shown beside the value when rows stack on a phone. */ label?: string }) {
  return (
    <td
      data-label={label}
      className={cn('h-14 px-4 align-middle text-ink first:pl-5 last:pr-5 sm:first:pl-6 sm:last:pr-6', align === 'right' && 'text-right', className)}
      {...rest}
    >
      {children}
    </td>
  )
}
