import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  publicListPage,
  publicPage,
  publicPageRange,
  publicPageSize,
} from '../server/utils/publicListPage.ts'

describe('publicPage', () => {
  it('falls back to 1 for blank, null, undefined, zero, negative, and non-numeric values', () => {
    for (const value of ['', '   ', null, undefined, 0, -1, '-3', 'abc', NaN]) {
      assert.equal(publicPage(value), 1)
    }
  })

  it('uses the first element when the query value is an array', () => {
    assert.equal(publicPage(['3', '9']), 3)
  })

  it('floors decimal page numbers', () => {
    assert.equal(publicPage('2.9'), 2)
  })
})

describe('publicPageSize', () => {
  it('defaults to 20 when the value is blank or invalid', () => {
    assert.equal(publicPageSize(''), 20)
    assert.equal(publicPageSize(null), 20)
    assert.equal(publicPageSize('nope'), 20)
  })

  it('uses a custom fallback when the value is blank or invalid', () => {
    assert.equal(publicPageSize('', 12), 12)
    assert.equal(publicPageSize(undefined, 8), 8)
  })

  it('clamps page size above 50 to 50', () => {
    assert.equal(publicPageSize('100'), 50)
    assert.equal(publicPageSize(75), 50)
  })
})

describe('publicListPage', () => {
  it('returns the page payload unchanged', () => {
    assert.deepEqual(publicListPage(['a'], 4, 2, 20), {
      items: ['a'],
      total: 4,
      page: 2,
      pageSize: 20,
    })
  })
})

describe('publicPageRange', () => {
  it('returns the supabase range for the page and size', () => {
    assert.deepEqual(publicPageRange(2, 20), { from: 20, to: 39 })
  })
})
