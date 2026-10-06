import { describe, expect, it } from 'vitest'
import { fetchAllRows, insertRowsInBatches } from '../supplierStore'

function fakeInsertClient(failOnBatch?: number) {
  const calls: number[] = []
  return {
    calls,
    from(table: string) {
      expect(table).toBe('procurement_suppliers')
      return {
        insert(rows: Record<string, unknown>[]) {
          calls.push(rows.length)
          const error = failOnBatch === calls.length ? { code: '57014', message: 'timeout' } : null
          return Promise.resolve({ error })
        },
      }
    },
  }
}

const rows = (n: number) => Array.from({ length: n }, (_, i) => ({ i }))

describe('insertRowsInBatches', () => {
  it('saves 8,000 suppliers as eight inserts of 1,000', async () => {
    const client = fakeInsertClient()
    const result = await insertRowsInBatches(client, 'procurement_suppliers', rows(8000))
    expect(client.calls).toEqual([1000, 1000, 1000, 1000, 1000, 1000, 1000, 1000])
    expect(result).toEqual({ error: null, insertedRows: 8000, batches: 8 })
  })

  it('sends a short last batch and nothing for an empty list', async () => {
    const client = fakeInsertClient()
    await insertRowsInBatches(client, 'procurement_suppliers', rows(2500))
    expect(client.calls).toEqual([1000, 1000, 500])
    const empty = fakeInsertClient()
    expect(await insertRowsInBatches(empty, 'procurement_suppliers', [])).toEqual({ error: null, insertedRows: 0, batches: 0 })
    expect(empty.calls).toEqual([])
  })

  it('stops at the first failed batch and says how far it got', async () => {
    const client = fakeInsertClient(3)
    const result = await insertRowsInBatches(client, 'procurement_suppliers', rows(8000))
    expect(client.calls).toEqual([1000, 1000, 1000])
    expect(result.error?.code).toBe('57014')
    expect(result.insertedRows).toBe(2000)
  })
})

describe('fetchAllRows', () => {
  // A table of 2,345 rows behind an API that returns at most 1,000 per request.
  const table = rows(2345)
  const api = (from: number, to: number) => Promise.resolve({ data: table.slice(from, Math.min(to + 1, from + 1000)), error: null })

  it('reads past the 1,000-row page limit', async () => {
    const pages: [number, number][] = []
    const result = await fetchAllRows((from, to) => {
      pages.push([from, to])
      return api(from, to)
    })
    expect(result.data).toHaveLength(2345)
    expect(result.data[2344]).toEqual({ i: 2344 })
    expect(result.data.map((r) => (r as { i: number }).i)).toEqual(table.map((r) => (r as { i: number }).i))
    // The first page alone, then the next four at once.
    expect(pages).toEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
      [3000, 3999],
      [4000, 4999],
    ])
  })

  it('reads a short list with one request', async () => {
    let requests = 0
    const result = await fetchAllRows((from, to) => {
      requests++
      return Promise.resolve({ data: rows(12).slice(from, to + 1), error: null })
    })
    expect(result.data).toHaveLength(12)
    expect(requests).toBe(1)
  })

  it('reads 8,000 suppliers in three waits instead of nine', async () => {
    const big = rows(8000)
    let inFlight = 0
    let waves = 0
    const result = await fetchAllRows(async (from, to) => {
      if (inFlight === 0) waves++
      inFlight++
      await new Promise((resolve) => setTimeout(resolve, 1))
      inFlight--
      return { data: big.slice(from, Math.min(to + 1, from + 1000)), error: null }
    })
    expect(result.data).toHaveLength(8000)
    expect(result.data[7999]).toEqual({ i: 7999 })
    expect(waves).toBe(3)
  })

  it('a single unpaged read would have stopped at 1,000', async () => {
    expect((await api(0, 100_000)).data).toHaveLength(1000)
  })

  it('makes one extra request when the total is an exact multiple of the page', async () => {
    let requests = 0
    const result = await fetchAllRows((from, to) => {
      requests++
      return Promise.resolve({ data: rows(2000).slice(from, to + 1), error: null })
    })
    expect(result.data).toHaveLength(2000)
    // First page, then one wave of four that finds the end.
    expect(requests).toBe(5)
  })

  it('returns the error and the rows read so far', async () => {
    const result = await fetchAllRows((from, to) =>
      from === 0 ? api(from, to) : Promise.resolve({ data: null, error: { message: 'boom' } }),
    )
    expect(result.error?.message).toBe('boom')
    expect(result.data).toHaveLength(1000)
  })
})
