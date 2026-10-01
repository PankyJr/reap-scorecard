import { describe, expect, it } from 'vitest'
import { stepsFor } from '../flows'

describe('stepsFor', () => {
  it('marks earlier steps done, the current one current and later ones to do', () => {
    expect(stepsFor('full', 2).map((s) => s.state)).toEqual(['done', 'done', 'current', 'todo', 'todo'])
  })

  it('keeps a passed but unfinished step as to do', () => {
    // On the result page with elements still partial: "Complete the elements" is not done.
    expect(stepsFor('full', 4, {}, [3]).map((s) => s.state)).toEqual(['done', 'done', 'done', 'todo', 'current'])
  })
})
