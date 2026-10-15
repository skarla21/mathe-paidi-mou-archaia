import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  mapChapterWithCounts,
  mapSubjectWithCounts,
} from '../server/utils/catalogCounts.ts'
import { embedCount, wantsCounts } from '../server/utils/embedCount.ts'

describe('embedCount', () => {
  it('reads the PostgREST count embed shape', () => {
    assert.equal(embedCount([{ count: 4 }]), 4)
    assert.equal(embedCount([]), 0)
    assert.equal(embedCount(null), 0)
    assert.equal(embedCount(undefined), 0)
  })
})

describe('wantsCounts', () => {
  it('accepts common truthy query forms', () => {
    assert.equal(wantsCounts('1'), true)
    assert.equal(wantsCounts('true'), true)
    assert.equal(wantsCounts(true), true)
    assert.equal(wantsCounts('0'), false)
    assert.equal(wantsCounts(undefined), false)
    assert.equal(wantsCounts(['1']), false)
  })
})

describe('mapSubjectWithCounts', () => {
  it('sums direct placements with lessons inside chapters', () => {
    const mapped = mapSubjectWithCounts({
      id: 's1',
      name: 'Γραμματική',
      lesson_placements: [{ count: 2 }],
      chapters: [
        { lesson_placements: [{ count: 5 }] },
        { lesson_placements: [{ count: 3 }] },
      ],
    })
    assert.equal(mapped.id, 's1')
    assert.equal(mapped.chapter_count, 2)
    assert.equal(mapped.lesson_count, 10)
    assert.equal(Object.hasOwn(mapped, 'chapters'), false)
    assert.equal(Object.hasOwn(mapped, 'lesson_placements'), false)
  })

  it('treats missing embeds as empty', () => {
    const mapped = mapSubjectWithCounts({ id: 's2', name: 'Κενό' })
    assert.equal(mapped.chapter_count, 0)
    assert.equal(mapped.lesson_count, 0)
  })
})

describe('mapChapterWithCounts', () => {
  it('exposes lesson_count and strips the embed', () => {
    const mapped = mapChapterWithCounts({
      id: 'c1',
      title: 'Κεφάλαιο',
      lesson_placements: [{ count: 7 }],
    })
    assert.equal(mapped.lesson_count, 7)
    assert.equal(Object.hasOwn(mapped, 'lesson_placements'), false)
  })
})
