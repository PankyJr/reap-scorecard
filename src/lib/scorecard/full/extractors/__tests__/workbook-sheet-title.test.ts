import { describe, expect, it } from 'vitest'
import type { ParsedWorkbookResult } from '../../types'
import {
  canonicalWorkbookSheetTitle,
  findWorkbookSheetByTitle,
  normalizeWorkbookSheetTitle,
} from '../helpers'

function parsedWithSheets(names: string[]): ParsedWorkbookResult {
  return {
    filename: 'x.xlsx',
    fileSize: 1,
    detectedSheetNames: names,
    sheets: names.map((sheetName, i) => ({
      sheetKey: `k${i}`,
      sheetName,
      rowCount: 1,
      columnCount: 1,
      rows: [[]],
      cells: {},
      parseWarnings: [],
    })),
  }
}

describe('workbook sheet title matching', () => {
  it('normalizes ampersand so ED&SD matches ED & SD', () => {
    expect(normalizeWorkbookSheetTitle('ED&SD')).toBe(normalizeWorkbookSheetTitle('ED & SD'))
  })

  it('canonical strips leading section numbers', () => {
    expect(canonicalWorkbookSheetTitle('7 SED')).toBe('sed')
    expect(canonicalWorkbookSheetTitle('03 - Ownership')).toBe('ownership')
  })

  it('findWorkbookSheetByTitle matches numbered tab titles', () => {
    const p = parsedWithSheets(['1. Ownership', 'Other'])
    const s = findWorkbookSheetByTitle(p, 'Ownership')
    expect(s?.sheetName).toBe('1. Ownership')
  })

  it('findWorkbookSheetByTitle matches ED&SD vs ED & SD', () => {
    const p = parsedWithSheets(['ED&SD'])
    expect(findWorkbookSheetByTitle(p, 'ED & SD')?.sheetName).toBe('ED&SD')
  })
})
