import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'

import { managementControlAdapter } from '../elements/management-control/adapter'
import {
  importManagementControlRegisterWorkbook,
  MANAGEMENT_CONTROL_REGISTER_IMPORT_VERSION,
} from '../elements/management-control/import'

function buildBook2Fixture(): Buffer {
  const workbook = XLSX.utils.book_new()
  const board = XLSX.utils.aoa_to_sheet([
    [],
    [
      'Board Member Name and Surname',
      'Executive/ Non Executive/ Independent Non Executive',
      'Gender',
      'Race',
      'Nationality',
      'Position',
      'Resignation Date',
      'Identity Number',
    ],
    ['Person 001', 'Executive Director', 'Male', 'Indian', 'South African', null, null, 'REDACTED'],
    ['Person 002', 'Non executive', 'Female', 'African', 'South African', null, null, null],
    ['Person 003', 'Non executive', 'Male', 'White', 'South African', null, null, null],
    ['Person 004', 'Independent Non Executive', 'Female', 'Coloured', 'South African', null, null, null],
    ['Person 005', 'Executive Director', 'Female', 'African', 'South African', null, null, null],
    ['Person 006', 'Non executive', 'Male', 'African', 'South African', null, null, null],
    ['Person 007', 'Non executive', 'Female', 'Indian', 'South African', null, null, null],
  ])
  const executive = XLSX.utils.aoa_to_sheet([
    [],
    [
      'Name and Surname',
      'Executive Director / Executive Manager',
      'Gender',
      'Race',
      'Nationality',
      'Position/ Designation',
    ],
    ['Person 101', 'Executive Manager', 'Male', 'African', 'South African', null],
    ['Person 102', 'Executive Manager', 'Female', 'African', 'South African', null],
    ['Person 103', 'Executive Manager', 'Male', 'Coloured', 'South African', null],
    ['Person 104', 'Executive Manager', 'Female', 'Coloured', 'South African', null],
    ['Person 105', 'Executive Director', 'Male', 'Indian', 'South African', null],
    ['Person 106', 'Executive Manager', 'Female', 'Indian', 'South African', null],
    ['Person 107', 'Executive Manager', 'Male', 'White', 'South African', null],
    ['Person 108', 'Executive Manager', 'Female', 'African', 'South African', null],
  ])

  // The supplied reference workbook contains trailing spaces in both names.
  XLSX.utils.book_append_sheet(workbook, board, '3 Board Members ')
  XLSX.utils.book_append_sheet(workbook, executive, '4 Executive Committe ')
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' }) as Buffer
}

describe('Management Control Book2 register importer', () => {
  it('detects both confirmed sheets and imports all populated records', () => {
    const preview = importManagementControlRegisterWorkbook({
      workbookBuffer: buildBook2Fixture(),
    })

    expect(preview.importVersion).toBe(MANAGEMENT_CONTROL_REGISTER_IMPORT_VERSION)
    expect(preview.sheetName).toBe('3 Board Members + 4 Executive Committe')
    expect(preview.rows).toHaveLength(15)
    expect(preview.validRowCount).toBe(15)
    expect(preview.warningCount).toBe(0)
    expect(preview.rejectedRowCount).toBe(0)
    expect(preview.rows.filter((row) => row.values.register === 'board')).toHaveLength(7)
    expect(
      preview.rows.filter((row) => row.values.register === 'executive_committee'),
    ).toHaveLength(8)
    expect(preview.rows.every((row) => Boolean(row.sourceSheet))).toBe(true)
  })

  it('detects Book2 headers while excluding direct identifiers from persisted rows', () => {
    const preview = managementControlAdapter.parseWorkbook({
      workbookBuffer: buildBook2Fixture(),
    })

    expect(preview.detectedHeaders['board.roleCategory']).toBe(
      'Executive/ Non Executive/ Independent Non Executive',
    )
    expect(preview.detectedHeaders['board.gender']).toBe('Gender')
    expect(preview.detectedHeaders['executive_committee.roleCategory']).toBe(
      'Executive Director / Executive Manager',
    )
    expect(preview.detectedHeaders['board.personName']).toBeUndefined()
    expect(preview.detectedHeaders['board.identityNumber']).toBeUndefined()

    const persistedRows = JSON.stringify(preview.rows)
    const persistedNotes = JSON.stringify(preview.notes)
    const persistedHeaders = JSON.stringify(preview.detectedHeaders)
    expect(persistedRows).not.toContain('Person 001')
    expect(persistedRows).not.toContain('Person 101')
    expect(persistedRows).not.toContain('REDACTED')
    expect(persistedRows).not.toContain('identityNumber')
    expect(persistedRows).not.toContain('personName')
    expect(persistedRows).not.toContain('"position":')
    expect(persistedRows).toContain('positionProvided')
    expect(persistedNotes).not.toContain('Person 001')
    expect(persistedNotes).not.toContain('REDACTED')
    expect(persistedHeaders).not.toContain('Identity Number')
    expect(persistedHeaders).not.toContain('Name and Surname')
  })

  it('normalises role, gender, race and nationality values', () => {
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        [],
        [
          'Board Member Name and Surname',
          'Executive/ Non Executive/ Independent Non Executive',
          'Gender',
          'Race',
          'Nationality',
        ],
        ['Person 401', 'non executive', 'female', 'coloured', 'south african'],
        ['Person 402', 'EXECUTIVE DIRECTOR', 'MALE', 'INDIAN', 'South Africa'],
      ]),
      '3 Board Members',
    )
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        [],
        [
          'Name and Surname',
          'Executive Director / Executive Manager',
          'Gender',
          'Race',
          'Nationality',
          'Position/ Designation',
        ],
        ['Person 501', 'executive manager', 'Female', 'african', 'RSA', null],
      ]),
      '4 Executive Committe',
    )
    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer
    const preview = importManagementControlRegisterWorkbook({ workbookBuffer: buffer })
    expect(preview.validRowCount).toBe(3)
    expect(preview.rows.map((row) => row.values.roleCategory).sort()).toEqual([
      'Executive Director',
      'Executive Manager',
      'Non Executive',
    ])
    expect(preview.rows.map((row) => row.values.gender).sort()).toEqual([
      'Female',
      'Female',
      'Male',
    ])
    expect(preview.rows.map((row) => row.values.race).sort()).toEqual([
      'African',
      'Coloured',
      'Indian',
    ])
    expect(
      preview.rows.every((row) => row.values.nationality === 'South African'),
    ).toBe(true)
  })

  it('rejects incomplete demographic records without calculating points', () => {
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        [],
        [
          'Board Member Name and Surname',
          'Executive/ Non Executive/ Independent Non Executive',
          'Gender',
          'Race',
          'Nationality',
        ],
        ['Person 999', 'Executive Director', null, 'African', 'South African'],
      ]),
      '3 Board Members',
    )
    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer

    const preview = importManagementControlRegisterWorkbook({
      workbookBuffer: buffer,
    })
    expect(preview.validRowCount).toBe(0)
    expect(preview.rejectedRowCount).toBe(1)
    expect(preview.notes).toContain('Sheet "4 Executive Committe" was not found.')

    const result = managementControlAdapter.calculate({
      rows: preview.rows,
      contextualInputs: {},
    })
    expect(managementControlAdapter.scoringReady).toBe(false)
    expect(result.pointsAchieved).toBeNull()
    expect(result.pointsAvailable).toBeNull()
  })

  it('warns on unexpected demographic values and ignores blank rows', () => {
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        [],
        [
          'Board Member Name and Surname',
          'Executive/ Non Executive/ Independent Non Executive',
          'Gender',
          'Race',
          'Nationality',
        ],
        ['Person 201', 'Executive Director', 'Unknown', 'African', 'South African'],
        [null, null, null, null, null],
        ['Person 202', 'Non executive', 'Female', 'African', 'South African'],
      ]),
      '3 Board Members',
    )
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        [],
        [
          'Name and Surname',
          'Executive Director / Executive Manager',
          'Gender',
          'Race',
          'Nationality',
          'Position/ Designation',
        ],
        ['Person 301', 'Executive Manager', 'Male', 'Other', 'South African', null],
      ]),
      '4 Executive Committe',
    )
    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer

    const preview = importManagementControlRegisterWorkbook({ workbookBuffer: buffer })
    expect(preview.rows).toHaveLength(3)
    expect(preview.warningCount).toBe(2)
    expect(preview.validRowCount).toBe(1)
    expect(preview.rejectedRowCount).toBe(0)
  })

  it('reports missing sheets and malformed headers without inventing rows', () => {
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(
      workbook,
      XLSX.utils.aoa_to_sheet([
        ['Wrong Header A', 'Wrong Header B'],
        ['x', 'y'],
      ]),
      'Wrong Sheet',
    )
    const buffer = XLSX.write(workbook, {
      type: 'buffer',
      bookType: 'xlsx',
    }) as Buffer

    const preview = importManagementControlRegisterWorkbook({ workbookBuffer: buffer })
    expect(preview.rows).toHaveLength(0)
    expect(preview.validRowCount).toBe(0)
    expect(preview.notes).toContain('Sheet "3 Board Members" was not found.')
    expect(preview.notes).toContain('Sheet "4 Executive Committe" was not found.')
  })

  it('keeps unscored uploads out of ready-to-calculate and calculation-run paths', () => {
    const actionsSrc = readFileSync(
      join(
        __dirname,
        '../../../../app/(dashboard)/scorecards/calculator/actions.ts',
      ),
      'utf8',
    )
    const pageSrc = readFileSync(
      join(
        __dirname,
        '../../../../app/(dashboard)/scorecards/calculator/[assessmentId]/elements/[elementKey]/page.tsx',
      ),
      'utf8',
    )

    expect(actionsSrc).toContain('!adapter.scoringReady && preview.rows.length > 0')
    expect(actionsSrc).toContain("status = 'needs_review'")
    expect(actionsSrc).toContain('if (!adapter.scoringReady)')
    expect(actionsSrc).toContain('Verified+scoring+is+not+available+for+this+element')
    expect(pageSrc).toContain('Import review only — scoring unavailable')
    expect(pageSrc).toContain("elementKey === 'management_control'")
    expect(pageSrc).toContain('roleCategory')
    expect(pageSrc).not.toMatch(
      /management_control[\s\S]{0,200}JSON\.stringify\(row\.values/,
    )
  })
})
