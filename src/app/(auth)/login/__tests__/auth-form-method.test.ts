import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('login AuthForm progressive enhancement', () => {
  it('declares method=post so credentials are never GET-serialized before hydration', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../AuthForm.tsx'),
      'utf8',
    )
    expect(source).toMatch(/<form[\s\S]*?method="post"/)
    expect(source).toMatch(/e\.preventDefault\(\)/)
    expect(source).toMatch(/Sign in with email/)
  })
})
