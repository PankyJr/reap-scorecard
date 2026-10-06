/**
 * A small stand-in for the Supabase client in page tests. It answers the
 * query shapes the procurement pages use, from plain arrays, and behaves like
 * the hosted API where it matters to these tests:
 *
 * - a read returns at most 1,000 rows (the API's max-rows), honouring range();
 * - `procurement_results(...)` in a select on procurement_assessments embeds
 *   that assessment's result rows, as the foreign key makes the API do.
 *
 * Filters on embedded tables (e.g. `companies.owner_id`) are ignored.
 */
export type FakeRow = Record<string, unknown>
export type FakeTables = Record<string, FakeRow[]>

export const FAKE_MAX_ROWS = 1000

class FakeQuery {
  private filters: ((row: FakeRow) => boolean)[] = []
  private isSingle = false
  private from = 0
  private to = Number.POSITIVE_INFINITY
  private max = Number.POSITIVE_INFINITY
  private columns = '*'
  constructor(
    private tables: () => FakeTables,
    private table: string,
    private seen: string[],
  ) {}
  select(columns = '*') {
    this.columns = columns
    this.seen.push(`${this.table}: ${columns}`)
    return this
  }
  eq(column: string, value: unknown) {
    if (!column.includes('.')) this.filters.push((row) => row[column] === value)
    return this
  }
  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]))
    return this
  }
  lt(column: string, value: string) {
    this.filters.push((row) => String(row[column]) < value)
    return this
  }
  not(column: string) {
    this.filters.push((row) => row[column] != null)
    return this
  }
  order() {
    return this
  }
  limit(n: number) {
    this.max = n
    return this
  }
  range(from: number, to: number) {
    this.from = from
    this.to = to
    return this
  }
  single() {
    this.isSingle = true
    return this
  }
  maybeSingle() {
    this.isSingle = true
    return this
  }
  private embed(row: FakeRow): FakeRow {
    if (this.table !== 'procurement_assessments' || !/procurement_results\s*\(/.test(this.columns)) return row
    const results = (this.tables().procurement_results ?? []).filter((r) => r.assessment_id === row.id)
    return { ...row, procurement_results: results }
  }
  then(resolve?: (value: { data: unknown; error: null }) => unknown, reject?: (reason: unknown) => unknown) {
    const rows = (this.tables()[this.table] ?? []).filter((row) => this.filters.every((f) => f(row)))
    const page = rows
      .slice(this.from, Math.min(this.to + 1, this.from + FAKE_MAX_ROWS))
      .slice(0, this.max)
      .map((row) => this.embed(row))
    const data = this.isSingle ? (page[0] ?? null) : page
    return Promise.resolve({ data, error: null }).then(resolve, reject)
  }
}

/** A client over `tables()`; `seen` records every table and select, in order. */
export function fakeSupabase(tables: () => FakeTables) {
  const seen: string[] = []
  return {
    seen,
    from: (table: string) => new FakeQuery(tables, table, seen),
  }
}
