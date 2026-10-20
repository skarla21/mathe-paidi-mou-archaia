import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readingTimeMinutesFromBody } from '../server/utils/readingTime.ts'

describe('readingTimeMinutesFromBody', () => {
  it('returns 1 for empty or whitespace-only bodies', () => {
    assert.equal(readingTimeMinutesFromBody(''), 1)
    assert.equal(readingTimeMinutesFromBody('   '), 1)
  })

  it('returns 1 for up to 200 words', () => {
    const twoHundred = Array.from({ length: 200 }, (_, i) => `λέξη${i}`).join(' ')
    assert.equal(readingTimeMinutesFromBody(twoHundred), 1)
  })

  it('returns 2 once the word count exceeds 200', () => {
    const twoOhOne = Array.from({ length: 201 }, (_, i) => `λέξη${i}`).join(' ')
    assert.equal(readingTimeMinutesFromBody(twoOhOne), 2)
  })
})
