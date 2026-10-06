import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Add a company', () => {
  it('shows no example figures inside the turnover and ownership boxes, which looked already filled in', () => {
    const form = readFileSync(join(__dirname, '../app/(dashboard)/companies/new/NewCompanyForm.tsx'), 'utf8')
    expect(form).not.toMatch(/placeholder="30 000 000"|placeholder="51"/)
    expect(form).toContain('For example 30 000 000')
  })
})
