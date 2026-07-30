import * as XLSX from 'xlsx'

import type {
  CalculatorImportPreview,
  CalculatorImportRow,
  HeaderAliasMap,
  ImportRowValidationStatus,
} from '../../types'

export const MANAGEMENT_CONTROL_REGISTER_IMPORT_VERSION =
  'management-control-register-import-v1'

type RegisterKind = 'board' | 'executive_committee'

type RegisterDefinition = {
  kind: RegisterKind
  expectedSheetName: string
  sheetAliases: readonly string[]
  headerAliases: HeaderAliasMap
  requiredFields: readonly string[]
}

const COMMON_HEADER_ALIASES: HeaderAliasMap = {
  personName: [
    'name and surname',
    'board member name and surname',
    'full name',
    'employee name',
  ],
  gender: ['gender', 'sex'],
  race: ['race', 'population group', 'demographic group'],
  nationality: ['nationality', 'citizenship', 'citizen status'],
  position: ['position', 'position / designation', 'position/ designation', 'designation'],
}

const REGISTER_DEFINITIONS: readonly RegisterDefinition[] = [
  {
    kind: 'board',
    expectedSheetName: '3 Board Members',
    sheetAliases: ['3 Board Members', 'Board Members', 'Board'],
    headerAliases: {
      ...COMMON_HEADER_ALIASES,
      roleCategory: [
        'executive/ non executive/ independent non executive',
        'executive / non executive / independent non executive',
        'director type',
        'board member type',
      ],
      resignationDate: ['resignation date', 'date resigned'],
      identityNumber: ['identity number', 'id number', 'identity no', 'id no'],
    },
    requiredFields: ['personName', 'roleCategory', 'gender', 'race', 'nationality'],
  },
  {
    kind: 'executive_committee',
    expectedSheetName: '4 Executive Committe',
    sheetAliases: [
      '4 Executive Committe',
      '4 Executive Committee',
      'Executive Committe',
      'Executive Committee',
      'Exco',
    ],
    headerAliases: {
      ...COMMON_HEADER_ALIASES,
      roleCategory: [
        'executive director / executive manager',
        'executive director/executive manager',
        'executive role',
        'executive category',
      ],
    },
    requiredFields: ['personName', 'roleCategory', 'gender', 'race', 'nationality'],
  },
] as const

function normalize(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[–—]/g, '-')
    .replace(/\s*\/\s*/g, ' / ')
    .replace(/\s+/g, ' ')
}

function cleanText(value: unknown): string | null {
  const text = String(value ?? '').trim().replace(/\s+/g, ' ')
  return text || null
}

function titleCaseWords(value: string): string {
  return value
    .split(' ')
    .map((part) => {
      if (!part) return part
      if (part === '/') return part
      return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
    })
    .join(' ')
}

function normalizeGender(value: string | null): string | null {
  if (!value) return null
  const key = normalize(value)
  if (key === 'male' || key === 'm') return 'Male'
  if (key === 'female' || key === 'f') return 'Female'
  return titleCaseWords(value)
}

function normalizeRace(value: string | null): string | null {
  if (!value) return null
  const key = normalize(value)
  if (key === 'african') return 'African'
  if (key === 'coloured' || key === 'colored') return 'Coloured'
  if (key === 'indian') return 'Indian'
  if (key === 'white') return 'White'
  return titleCaseWords(value)
}

function normalizeNationality(value: string | null): string | null {
  if (!value) return null
  const key = normalize(value)
  if (
    key === 'south african' ||
    key === 'south africa' ||
    key === 'sa' ||
    key === 'rsa'
  ) {
    return 'South African'
  }
  return titleCaseWords(value)
}

function normalizeRoleCategory(value: string | null): string | null {
  if (!value) return null
  const key = normalize(value)
  if (key === 'executive director') return 'Executive Director'
  if (key === 'executive manager') return 'Executive Manager'
  if (key === 'non executive' || key === 'non-executive') return 'Non Executive'
  if (
    key === 'independent non executive' ||
    key === 'independent non-executive'
  ) {
    return 'Independent Non Executive'
  }
  return titleCaseWords(value)
}

function findSheetName(
  sheetNames: readonly string[],
  aliases: readonly string[],
): string | null {
  for (const alias of aliases) {
    const match = sheetNames.find((name) => normalize(name) === normalize(alias))
    if (match) return match
  }
  return null
}

function detectHeader(args: {
  matrix: unknown[][]
  aliases: HeaderAliasMap
  requiredFields: readonly string[]
}): {
  rowIndex: number
  columns: Record<string, number>
  labels: Record<string, string>
} | null {
  const aliasLookup = new Map<string, string>()
  for (const [field, aliases] of Object.entries(args.aliases)) {
    for (const alias of aliases) aliasLookup.set(normalize(alias), field)
  }

  let best:
    | {
        rowIndex: number
        columns: Record<string, number>
        labels: Record<string, string>
        requiredMatches: number
      }
    | null = null

  for (let rowIndex = 0; rowIndex < Math.min(args.matrix.length, 20); rowIndex += 1) {
    const row = args.matrix[rowIndex] ?? []
    const columns: Record<string, number> = {}
    const labels: Record<string, string> = {}

    for (let column = 0; column < row.length; column += 1) {
      const field = aliasLookup.get(normalize(row[column]))
      if (!field || columns[field] != null) continue
      columns[field] = column
      labels[field] = cleanText(row[column]) ?? field
    }

    const requiredMatches = args.requiredFields.filter(
      (field) => columns[field] != null,
    ).length
    if (
      !best ||
      requiredMatches > best.requiredMatches ||
      (requiredMatches === best.requiredMatches &&
        Object.keys(columns).length > Object.keys(best.columns).length)
    ) {
      best = { rowIndex, columns, labels, requiredMatches }
    }
  }

  if (!best || best.requiredMatches !== args.requiredFields.length) return null
  return best
}

function rowStatus(args: {
  hasName: boolean
  roleCategory: string | null
  gender: string | null
  race: string | null
  nationality: string | null
}): { status: ImportRowValidationStatus; messages: string[] } {
  const messages: string[] = []
  if (!args.hasName) messages.push('Name is missing in the source workbook.')
  if (!args.roleCategory) messages.push('Role category is missing.')
  if (!args.gender) messages.push('Gender is missing.')
  if (!args.race) messages.push('Race is missing.')
  if (!args.nationality) messages.push('Nationality is missing.')

  if (messages.length > 0) return { status: 'rejected', messages }

  const normalizedGender = normalize(args.gender)
  if (!['male', 'female'].includes(normalizedGender)) {
    messages.push('Gender value requires review.')
  }

  const normalizedRace = normalize(args.race)
  if (!['african', 'coloured', 'indian', 'white'].includes(normalizedRace)) {
    messages.push('Race value requires review.')
  }

  return {
    status: messages.length > 0 ? 'warning' : 'valid',
    messages,
  }
}

function parseRegister(args: {
  workbook: XLSX.WorkBook
  definition: RegisterDefinition
}): {
  sheetName: string | null
  detectedHeaders: Record<string, string>
  rows: CalculatorImportRow[]
  notes: string[]
} {
  const { workbook, definition } = args
  const sheetName = findSheetName(workbook.SheetNames, definition.sheetAliases)
  if (!sheetName) {
    return {
      sheetName: null,
      detectedHeaders: {},
      rows: [],
      notes: [`Sheet "${definition.expectedSheetName}" was not found.`],
    }
  }

  const worksheet = workbook.Sheets[sheetName]
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    defval: null,
    raw: true,
  })
  const header = detectHeader({
    matrix,
    aliases: definition.headerAliases,
    requiredFields: definition.requiredFields,
  })

  if (!header) {
    return {
      sheetName,
      detectedHeaders: {},
      rows: [],
      notes: [
        `Required ${definition.expectedSheetName} headers were not detected.`,
      ],
    }
  }

  const detectedHeaders = Object.fromEntries(
    Object.entries(header.labels)
      // Never persist name/identity header keys into the snapshot surface.
      .filter(([field]) => field !== 'personName' && field !== 'identityNumber')
      .map(([field, label]) => [`${definition.kind}.${field}`, label]),
  )
  const rows: CalculatorImportRow[] = []

  for (
    let rowIndex = header.rowIndex + 1;
    rowIndex < matrix.length;
    rowIndex += 1
  ) {
    const source = matrix[rowIndex] ?? []
    if (!source.some((value) => cleanText(value) != null)) continue

    // Names and identity numbers are used only for presence validation. They
    // are deliberately excluded from the persisted import preview and UI.
    const hasName =
      cleanText(source[header.columns.personName]) != null
    const roleCategory = normalizeRoleCategory(
      cleanText(source[header.columns.roleCategory]),
    )
    const gender = normalizeGender(cleanText(source[header.columns.gender]))
    const race = normalizeRace(cleanText(source[header.columns.race]))
    const nationality = normalizeNationality(
      cleanText(source[header.columns.nationality]),
    )
    const position =
      header.columns.position == null
        ? null
        : cleanText(source[header.columns.position])
    const resignationDate =
      header.columns.resignationDate == null
        ? null
        : cleanText(source[header.columns.resignationDate])

    const validation = rowStatus({
      hasName,
      roleCategory,
      gender,
      race,
      nationality,
    })

    rows.push({
      sourceSheet: sheetName.trim(),
      sourceRowNumber: rowIndex + 1,
      values: {
        register: definition.kind,
        roleCategory,
        gender,
        race,
        nationality,
        positionProvided: position != null ? 'yes' : 'no',
        resignationRecorded: resignationDate != null ? 'yes' : 'no',
      },
      validationStatus: validation.status,
      validationMessages: validation.messages,
    })
  }

  return {
    sheetName,
    detectedHeaders,
    rows,
    notes: [],
  }
}

/**
 * Imports the person registers supplied in the confirmed Book2 layout.
 *
 * This is validation and privacy-safe preview only. It does not calculate
 * Management Control points and never persists names or identity numbers.
 */
export function importManagementControlRegisterWorkbook(args: {
  workbookBuffer: ArrayBuffer | Buffer
}): CalculatorImportPreview {
  const workbook = XLSX.read(args.workbookBuffer, {
    type: 'buffer',
    cellDates: true,
    cellFormula: true,
  })

  const parsed = REGISTER_DEFINITIONS.map((definition) =>
    parseRegister({ workbook, definition }),
  )
  const rows = parsed.flatMap((register) => register.rows)
  const detectedHeaders = Object.assign(
    {},
    ...parsed.map((register) => register.detectedHeaders),
  )
  const matchedSheets = parsed
    .map((register) => register.sheetName?.trim())
    .filter((name): name is string => Boolean(name))

  const validRowCount = rows.filter(
    (row) => row.validationStatus === 'valid',
  ).length
  const warningCount = rows.filter(
    (row) => row.validationStatus === 'warning',
  ).length
  const rejectedRowCount = rows.filter(
    (row) => row.validationStatus === 'rejected',
  ).length

  const notes = [
    ...parsed.flatMap((register) => register.notes),
    `Importer version: ${MANAGEMENT_CONTROL_REGISTER_IMPORT_VERSION}.`,
    'Names, identity numbers, exact positions and resignation dates are not stored in the import preview.',
    'Book2 register import validates Board and Executive Committee records only; it does not calculate Management Control points.',
  ]

  return {
    sheetName: matchedSheets.join(' + '),
    detectedHeaders,
    rows,
    validRowCount,
    warningCount,
    rejectedRowCount,
    platformTotalRecognised: null,
    workbookDisplayedTotal: null,
    totalsMatch: null,
    notes,
    importVersion: MANAGEMENT_CONTROL_REGISTER_IMPORT_VERSION,
  }
}
