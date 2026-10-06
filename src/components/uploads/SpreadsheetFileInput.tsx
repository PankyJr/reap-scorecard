'use client'

import type { InputHTMLAttributes } from 'react'
import { fileTooLargeMessage } from '@/lib/uploads/spreadsheet-file'

/**
 * A file field that refuses a file over the upload limit as soon as it is
 * chosen, with the same plain message the server would give. Without it, the
 * server refuses an oversized upload before our own check runs, and the user
 * sees an error page instead of a reason.
 */
export function SpreadsheetFileInput({ maxBytes, ...props }: { maxBytes: number } & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  return (
    <input
      {...props}
      type="file"
      data-max-bytes={maxBytes}
      onChange={(event) => {
        const input = event.currentTarget
        const file = input.files?.[0]
        input.setCustomValidity(file && file.size > maxBytes ? fileTooLargeMessage(file.name, file.size, maxBytes) : '')
        input.reportValidity()
        props.onChange?.(event)
      }}
    />
  )
}
