import { describe, expect, it } from 'vitest'

import {
  TMPS_CUSTOM_LINES_MAX,
  newTmpsCustomLineFormRow,
  normalizeStoredCustomLinesToFormRows,
  parseTmpsCustomLinesFromUnknown,
  serializeTmpsCustomFormRows,
  type ProcurementTmpsCustomLine,
} from '../tmpsCustom'

/**
 * Custom TMPS lines are user-entered adjustments to the procurement scoring
 * denominator. They round-trip through a jsonb database column, so
 * parseTmpsCustomLinesFromUnknown receives genuinely untrusted shapes and must
 * never throw, never emit NaN, and never exceed the row cap.
 */

describe('parseTmpsCustomLinesFromUnknown', () => {
  it('reads well-formed lines unchanged', () => {
    const parsed = parseTmpsCustomLinesFromUnknown([
      { id: 'a', label: 'Imports', amount: 1000 },
      { id: 'b', label: 'Rebates', amount: 250.5 },
    ])

    expect(parsed).toEqual([
      { id: 'a', label: 'Imports', amount: 1000 },
      { id: 'b', label: 'Rebates', amount: 250.5 },
    ])
  })

  // Anything that is not an array is a corrupt or absent column value.
  it.each([[null], [undefined], ['not an array'], [42], [{ id: 'x' }]])(
    'returns an empty list for the non-array input %p',
    (value) => {
      expect(parseTmpsCustomLinesFromUnknown(value)).toEqual([])
    },
  )

  it('skips entries that are not objects', () => {
    const parsed = parseTmpsCustomLinesFromUnknown([
      null,
      'string',
      7,
      { id: 'keep', label: 'Kept', amount: 5 },
    ])

    expect(parsed).toEqual([{ id: 'keep', label: 'Kept', amount: 5 }])
  })

  // A line with neither a label nor an amount carries no information and would
  // show as a blank row on the assessment.
  it('drops entries that have no label and no amount', () => {
    expect(
      parseTmpsCustomLinesFromUnknown([
        { id: 'empty', label: '   ', amount: 0 },
        { id: 'also-empty' },
      ]),
    ).toEqual([])
  })

  it('keeps a line that has an amount but no label, under a default label', () => {
    const parsed = parseTmpsCustomLinesFromUnknown([{ id: 'x', amount: 10 }])
    expect(parsed).toEqual([{ id: 'x', label: 'Custom line', amount: 10 }])
  })

  it('generates a positional id when one is missing or blank', () => {
    const parsed = parseTmpsCustomLinesFromUnknown([
      { label: 'First', amount: 1 },
      { id: '   ', label: 'Second', amount: 2 },
    ])

    expect(parsed.map((l) => l.id)).toEqual(['line-0', 'line-1'])
  })

  it('trims surrounding whitespace from id and label', () => {
    const parsed = parseTmpsCustomLinesFromUnknown([
      { id: '  padded  ', label: '  Spaced label  ', amount: 3 },
    ])

    expect(parsed[0].id).toBe('padded')
    expect(parsed[0].label).toBe('Spaced label')
  })

  // Boundary: negative and non-numeric amounts must collapse to 0 rather than
  // reducing the denominator, which would inflate the procurement score.
  it.each([
    [-100, 0],
    ['not a number', 0],
    [NaN, 0],
    [Infinity, 0],
    [null, 0],
    ['250', 250],
    [0, 0],
  ])('normalises the amount %p to %p', (amount, expected) => {
    const parsed = parseTmpsCustomLinesFromUnknown([
      { id: 'x', label: 'Line', amount },
    ])
    expect(parsed[0].amount).toBe(expected)
  })

  it('truncates an over-long id and label instead of rejecting the line', () => {
    const parsed = parseTmpsCustomLinesFromUnknown([
      { id: 'i'.repeat(200), label: 'L'.repeat(900), amount: 1 },
    ])

    expect(parsed[0].id).toHaveLength(80)
    expect(parsed[0].label).toHaveLength(500)
  })

  // Boundary: the cap bounds how much untrusted data one column can expand to.
  it('stops at the maximum line count', () => {
    const oversized = Array.from({ length: TMPS_CUSTOM_LINES_MAX + 15 }, (_, i) => ({
      id: `line-${i}`,
      label: `Line ${i}`,
      amount: 1,
    }))

    expect(parseTmpsCustomLinesFromUnknown(oversized)).toHaveLength(
      TMPS_CUSTOM_LINES_MAX,
    )
  })

  it('accepts exactly the maximum number of lines', () => {
    const exact = Array.from({ length: TMPS_CUSTOM_LINES_MAX }, (_, i) => ({
      id: `line-${i}`,
      label: `Line ${i}`,
      amount: 1,
    }))

    expect(parseTmpsCustomLinesFromUnknown(exact)).toHaveLength(
      TMPS_CUSTOM_LINES_MAX,
    )
  })
})

describe('newTmpsCustomLineFormRow', () => {
  it('creates a blank row with a unique id', () => {
    const a = newTmpsCustomLineFormRow()
    const b = newTmpsCustomLineFormRow()

    expect(a.label).toBe('')
    expect(a.amount).toBe('')
    expect(a.id).toBeTruthy()
    expect(a.id).not.toBe(b.id)
  })
})

describe('normalizeStoredCustomLinesToFormRows', () => {
  it('turns stored numbers into form strings', () => {
    const rows = normalizeStoredCustomLinesToFormRows([
      { id: 'a', label: 'Imports', amount: 1000 },
    ])

    expect(rows).toEqual([{ id: 'a', label: 'Imports', amount: '1000' }])
  })

  // A stored zero becomes an empty input box rather than a literal "0", so the
  // user sees an empty field to fill in.
  it('renders a zero amount as an empty string', () => {
    const rows = normalizeStoredCustomLinesToFormRows([
      { id: 'a', label: 'Nil line', amount: 0 },
    ])

    expect(rows[0].amount).toBe('')
  })

  it.each([[null], [undefined], [[] as ProcurementTmpsCustomLine[]]])(
    'returns an empty list for %p',
    (value) => {
      expect(normalizeStoredCustomLinesToFormRows(value)).toEqual([])
    },
  )
})

describe('serializeTmpsCustomFormRows', () => {
  it('parses the posted string amounts back into numbers', () => {
    const lines = serializeTmpsCustomFormRows([
      { id: 'a', label: 'Imports', amount: '1000' },
      { id: 'b', label: 'Rebates', amount: '250.5' },
    ])

    expect(lines).toEqual([
      { id: 'a', label: 'Imports', amount: 1000 },
      { id: 'b', label: 'Rebates', amount: 250.5 },
    ])
  })

  it('drops rows the user left completely blank', () => {
    const lines = serializeTmpsCustomFormRows([
      { id: 'a', label: '  ', amount: '' },
      { id: 'b', label: 'Real', amount: '5' },
    ])

    expect(lines).toEqual([{ id: 'b', label: 'Real', amount: 5 }])
  })

  it('floors a negative or unparseable amount at zero', () => {
    const lines = serializeTmpsCustomFormRows([
      { id: 'a', label: 'Negative', amount: '-500' },
      { id: 'b', label: 'Rubbish', amount: 'abc' },
    ])

    expect(lines.map((l) => l.amount)).toEqual([0, 0])
  })

  it('applies the default label and the same length limits as the parser', () => {
    const lines = serializeTmpsCustomFormRows([
      { id: 'i'.repeat(200), label: '', amount: '10' },
    ])

    expect(lines[0].label).toBe('Custom line')
    expect(lines[0].id).toHaveLength(80)
  })

  it('enforces the maximum line count', () => {
    const rows = Array.from({ length: TMPS_CUSTOM_LINES_MAX + 5 }, (_, i) => ({
      id: `row-${i}`,
      label: `Row ${i}`,
      amount: '1',
    }))

    expect(serializeTmpsCustomFormRows(rows)).toHaveLength(TMPS_CUSTOM_LINES_MAX)
  })

  // Round-trip: what the form serialises must survive the database read path
  // unchanged, otherwise a saved assessment would reopen with different numbers.
  it('round-trips through the untrusted-value parser unchanged', () => {
    const serialized = serializeTmpsCustomFormRows([
      { id: 'a', label: 'Imports', amount: '1000' },
      { id: 'b', label: 'Rebates', amount: '0' },
    ])

    expect(parseTmpsCustomLinesFromUnknown(serialized)).toEqual(serialized)
  })
})
