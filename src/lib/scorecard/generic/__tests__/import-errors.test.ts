import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { analyseGenericScorecardWorkbook } from '../workbook-import'
import { IMPORT_NOT_FINISHED, plainWorkbookError, WORKBOOK_UNREADABLE } from '../ux/import-errors'

function errorFrom(run: () => unknown): unknown {
  try {
    run()
  } catch (error) {
    return error
  }
  throw new Error('expected the call to fail')
}

describe('workbook upload errors are plain', () => {
  it('replaces the spreadsheet library’s own error for a damaged workbook', () => {
    // Passes the file check (a ZIP that mentions xl/workbook) but cannot be opened.
    const damaged = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from('xl/workbook.xml truncated')])
    const error = errorFrom(() => analyseGenericScorecardWorkbook({ filename: 'scorecard.xlsx', buffer: damaged }))
    expect((error as Error).message.startsWith('“')).toBe(false)
    expect(plainWorkbookError(error, WORKBOOK_UNREADABLE)).toBe(WORKBOOK_UNREADABLE)
  })

  it('keeps our own messages, which already name the file plainly', () => {
    const error = errorFrom(() => analyseGenericScorecardWorkbook({ filename: 'notes.xlsx', buffer: Buffer.from('hello') }))
    expect(plainWorkbookError(error, WORKBOOK_UNREADABLE)).toMatch(/^“notes\.xlsx” is not a valid Excel workbook/)
    const instruction = new Error('Accept the import warnings before continuing, or skip the affected elements.')
    expect(plainWorkbookError(instruction, IMPORT_NOT_FINISHED)).toBe(instruction.message)
  })

  it('is what the upload and confirm actions show', () => {
    const source = readFileSync(join(__dirname, '../../../../app/(dashboard)/scorecards/calculator/[assessmentId]/generic/actions.ts'), 'utf8')
    expect(source).toContain('plainWorkbookError(error, WORKBOOK_UNREADABLE)')
    expect(source).toContain('plainWorkbookError(error, IMPORT_NOT_FINISHED)')
    expect(source).not.toMatch(/error instanceof Error \? error\.message : '(Workbook analysis|Import confirmation) failed\.'/)
  })
})
