/**
 * Writing and reading large supplier lists.
 *
 * One insert of 8,000 rows is a single very large request that the database
 * API may refuse or time out on; rows go in batches of 1,000 instead.
 *
 * Supabase returns at most 1,000 rows per select by default (the API's
 * max-rows setting), silently. A plain select of an 8,000-supplier
 * assessment therefore showed, scored and attached only the first 1,000.
 * Reads go page by page until a short page comes back.
 */

export const SUPPLIER_INSERT_BATCH_SIZE = 1000
export const SUPPLIER_READ_PAGE_SIZE = 1000

export type StoreError = { code?: string; message?: string; details?: string | null; hint?: string | null }

type InsertResult = PromiseLike<{ error: StoreError | null }>
type InsertableClient = {
  from(table: string): { insert(rows: Record<string, unknown>[]): InsertResult }
}

/**
 * Inserts rows in batches. Stops at the first failed batch and returns its
 * error with how many rows went in before it, so the caller can roll back.
 */
export async function insertRowsInBatches(
  client: InsertableClient,
  table: string,
  rows: Record<string, unknown>[],
  batchSize = SUPPLIER_INSERT_BATCH_SIZE,
): Promise<{ error: StoreError | null; insertedRows: number; batches: number }> {
  const size = Math.max(1, Math.floor(batchSize))
  let insertedRows = 0
  let batches = 0
  for (let start = 0; start < rows.length; start += size) {
    const chunk = rows.slice(start, start + size)
    const { error } = await client.from(table).insert(chunk)
    batches++
    if (error) return { error, insertedRows, batches }
    insertedRows += chunk.length
  }
  return { error: null, insertedRows, batches }
}

type PageResult<T> = PromiseLike<{ data: T[] | null; error: StoreError | null }>

/**
 * Reads every row of a query, a page at a time. `page(from, to)` must apply
 * `.range(from, to)` to a query with a stable order (end the order with a
 * unique column such as id), or rows can repeat or go missing between pages.
 */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PageResult<T>,
  pageSize = SUPPLIER_READ_PAGE_SIZE,
): Promise<{ data: T[]; error: StoreError | null }> {
  const size = Math.max(1, Math.floor(pageSize))
  const all: T[] = []
  for (let from = 0; ; from += size) {
    const { data, error } = await page(from, from + size - 1)
    if (error) return { data: all, error }
    const rows = data ?? []
    all.push(...rows)
    if (rows.length < size) return { data: all, error: null }
  }
}
