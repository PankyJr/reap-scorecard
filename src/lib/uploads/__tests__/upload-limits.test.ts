import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { analyseGenericScorecardWorkbook } from '@/lib/scorecard/generic/workbook-import'
import { SERVER_ACTION_BODY_LIMIT_BYTES } from '@/lib/procurement/uploadLimits'
import { MAX_FULL_SCORECARD_UPLOAD_BYTES } from '@/lib/scorecard-upload/constants'
import { SPREADSHEET_UPLOAD_MAX_BYTES } from '../limits'

const root = join(__dirname, '../../../..')
const read = (path: string) => readFileSync(join(root, path), 'utf8')

describe('one upload limit the server can keep', () => {
  it('is below what a server action may receive, and next.config.ts says the same', () => {
    expect(SPREADSHEET_UPLOAD_MAX_BYTES).toBeLessThan(SERVER_ACTION_BODY_LIMIT_BYTES)
    const configured = read('next.config.ts').match(/bodySizeLimit:\s*'(\d+)mb'/)
    expect(Number(configured?.[1]) * 1024 * 1024).toBe(SERVER_ACTION_BODY_LIMIT_BYTES)
    expect(MAX_FULL_SCORECARD_UPLOAD_BYTES).toBe(SPREADSHEET_UPLOAD_MAX_BYTES)
  })

  it('refuses a workbook over the limit with a plain reason, before reading it', () => {
    const big = Buffer.alloc(SPREADSHEET_UPLOAD_MAX_BYTES + 200 * 1024)
    big.set([0x50, 0x4b, 0x03, 0x04])
    expect(() => analyseGenericScorecardWorkbook({ filename: 'scorecard.xlsx', buffer: big })).toThrow(
      /^“scorecard\.xlsx” is 4\.1 MB, which is larger than the 3\.9 MB limit\. Remove unused sheets or images and try again\.$/,
    )
  })

  it.each([
    'src/app/(dashboard)/scorecards/calculator/[assessmentId]/generic/page.tsx',
    'src/app/(dashboard)/scorecards/calculator/[assessmentId]/elements/[elementKey]/page.tsx',
  ])('the upload form checks the size in the browser and states the real limit: %s', (path) => {
    const source = read(path)
    expect(source).toContain('<SpreadsheetFileInput')
    expect(source).toContain('uploadLimitLabel(SPREADSHEET_UPLOAD_MAX_BYTES)')
    expect(source).not.toMatch(/\b(8|25) MB\b/)
  })
})
