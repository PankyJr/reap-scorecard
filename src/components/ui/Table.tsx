import type { HTMLAttributes, ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react'
import { cn } from './cn'

/**
 * Tables: a 12px uppercase grey header on the #F7F9F8 strip, 56px rows,
 * hairline dividers, figures right-aligned and tabular
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
    <thead className="border-b border-line">
      <tr>{children}</tr>
    </thead>
  )
}

export function Th({ children, align = 'left', className, ...rest }: ThHTMLAttributes<HTMLTableCellElement> & { align?: 'left' | 'right' }) {
  return (
    <th
      scope="col"
      className={cn(
        'h-10 whitespace-nowrap px-3 text-caps font-medium text-subtle first:pl-0 last:pr-0',
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

/** One row: 52px, a #F0F0F2 divider below (not after the last), #FAFAFB on hover. */
export function Row({ children, className, interactive = false, ...rest }: HTMLAttributes<HTMLTableRowElement> & { interactive?: boolean }) {
  return (
    <tr
      className={cn(
        'border-b border-divider last:border-b-0',
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
      className={cn('h-[52px] px-3 align-middle text-body text-ink first:pl-0 last:pr-0', align === 'right' && 'text-right', className)}
      {...rest}
    >
      {children}
    </td>
  )
}
