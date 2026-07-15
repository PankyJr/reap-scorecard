'use client'

import { useCallback, useRef, useState } from 'react'
import * as XLSX from 'xlsx'
import { parseAberdareSpendReport, type AberdareParseResult } from '@/lib/clients/aberdare'
import { ABERDARE_THEME } from './theme'

const MAX_BYTES = 5 * 1024 * 1024

interface AberdareUploadPanelProps {
  onParsed(result: AberdareParseResult): void
  disabled?: boolean
}

export function AberdareUploadPanel({
  onParsed,
  disabled = false,
}: AberdareUploadPanelProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const processingRef = useRef(false)

  const processFile = useCallback(
    async (file: File) => {
      if (processingRef.current || disabled) return
      processingRef.current = true
      setProcessing(true)
      setError(null)
      setFileName(file.name)

      try {
        if (!file.name.toLowerCase().endsWith('.xlsx')) {
          throw new Error('Please upload an Excel workbook (.xlsx).')
        }
        if (file.size > MAX_BYTES) {
          throw new Error('The file is larger than the 5 MB demo limit.')
        }

        const buffer = await file.arrayBuffer()
        const result = parseAberdareSpendReport(buffer, file.name, {
          read: (data, opts) => XLSX.read(data, opts),
          utils: {
            sheet_to_json: (sheet, opts) =>
              XLSX.utils.sheet_to_json(sheet, opts) as unknown[][],
          },
        })
        onParsed(result)
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Could not read the spend report.'
        setError(message)
      } finally {
        processingRef.current = false
        setProcessing(false)
      }
    },
    [disabled, onParsed],
  )

  return (
    <section
      className="rounded-xl border bg-white p-6 sm:p-8"
      style={{ borderColor: ABERDARE_THEME.border }}
      data-testid="aberdare-upload-panel"
    >
      <h2
        className="text-2xl font-semibold"
        style={{ color: ABERDARE_THEME.charcoal }}
      >
        Upload monthly spend report
      </h2>
      <p className="mt-2 text-lg" style={{ color: ABERDARE_THEME.muted }}>
        Choose Aberdare’s BBBEE spend report (.xlsx). The file is processed in your
        browser and is not sent to an external service.
      </p>

      <div
        className="mt-6 rounded-xl border-2 border-dashed px-6 py-10 text-center transition"
        style={{
          borderColor: dragOver ? ABERDARE_THEME.cyan : ABERDARE_THEME.border,
          background: dragOver ? ABERDARE_THEME.cyanSoft : '#FAFBFC',
        }}
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const file = e.dataTransfer.files?.[0]
          if (file) void processFile(file)
        }}
      >
        <p className="text-lg font-medium" style={{ color: ABERDARE_THEME.text }}>
          Drag and drop the .xlsx file here
        </p>
        <p className="mt-2 text-base" style={{ color: ABERDARE_THEME.muted }}>
          or
        </p>
        <button
          type="button"
          disabled={processing || disabled}
          onClick={() => inputRef.current?.click()}
          className="mt-4 inline-flex min-h-11 items-center justify-center rounded-lg px-5 text-base font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 disabled:opacity-60"
          style={{ background: ABERDARE_THEME.cyanDark }}
        >
          {processing ? 'Processing…' : 'Browse files'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) void processFile(file)
            e.target.value = ''
          }}
        />
        {fileName ? (
          <p className="mt-4 text-base font-medium" style={{ color: ABERDARE_THEME.text }}>
            Selected: {fileName}
          </p>
        ) : null}
      </div>

      {error ? (
        <div
          className="mt-4 rounded-lg border px-4 py-3 text-base"
          style={{
            borderColor: '#F3C1BC',
            background: '#FFF5F4',
            color: ABERDARE_THEME.danger,
          }}
          role="alert"
        >
          {error}
        </div>
      ) : null}
    </section>
  )
}
