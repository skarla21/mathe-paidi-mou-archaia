import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { normalizeContentTags } from '../server/utils/contentTags.ts'

describe('normalizeContentTags', () => {
  it('trims, caps length, and keeps insertion order', () => {
    assert.deepEqual(
      normalizeContentTags(['  Οδύσσεια  ', `${'α'.repeat(80)}`, 'Ίλιας']),
      ['Οδύσσεια', 'α'.repeat(64), 'Ίλιας'],
    )
  })

  it('dedupes by folded Greek form and keeps the first spelling', () => {
    assert.deepEqual(
      normalizeContentTags(['Οδύσσεια', 'οδυσσεια', 'ΟΔΥΣΣΕΙΑ', 'Ίλιας']),
      ['Οδύσσεια', 'Ίλιας'],
    )
  })

  it('ignores non-strings, empties, and caps at 30 tags', () => {
    const many = Array.from({ length: 40 }, (_, i) => `ετικετα-${i}`)
    assert.deepEqual(normalizeContentTags([null, '', '  ', 1, ...many]), many.slice(0, 30))
    assert.deepEqual(normalizeContentTags('not-an-array'), [])
    assert.deepEqual(normalizeContentTags(undefined), [])
  })
})
