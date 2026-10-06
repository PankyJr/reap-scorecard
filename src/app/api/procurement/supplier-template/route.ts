import type { NextRequest } from 'next/server'
import {
  SUPPLIER_TEMPLATE_FILENAME,
  supplierTemplateCsv,
  supplierTemplateXlsx,
} from '@/lib/procurement/supplierTemplate'

export const runtime = 'nodejs'

/**
 * The blank supplier list template: ?format=csv for CSV, otherwise Excel.
 * It holds no data, only column names and one example row.
 */
export async function GET(request: NextRequest) {
  const format = request.nextUrl.searchParams.get('format') === 'csv' ? 'csv' : 'xlsx'
  if (format === 'csv') {
    return new Response(supplierTemplateCsv(), {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${SUPPLIER_TEMPLATE_FILENAME}.csv"`,
        'Cache-Control': 'private, max-age=3600',
      },
    })
  }
  return new Response(new Uint8Array(supplierTemplateXlsx()), {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${SUPPLIER_TEMPLATE_FILENAME}.xlsx"`,
      'Cache-Control': 'private, max-age=3600',
    },
  })
}
