import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { sortChapters } from '../shared/utils/catalogOrder.mjs'

describe('sortChapters', () => {
  it('orders by position and breaks ties by Greek title', () => {
    const sorted = sortChapters([
      { id: 'late', order: 2, title: 'Α' },
      { id: 'beta', order: 0, title: 'Β' },
      { id: 'alpha', order: 0, title: 'Α' },
    ])
    assert.deepEqual(sorted.map((chapter) => chapter.id), ['alpha', 'beta', 'late'])
  })

  it('leaves the original list unchanged', () => {
    const input = [
      { id: 'beta', order: 0, title: 'Β' },
      { id: 'alpha', order: 0, title: 'Α' },
    ]
    sortChapters(input)
    assert.deepEqual(input.map((chapter) => chapter.id), ['beta', 'alpha'])
  })
})
