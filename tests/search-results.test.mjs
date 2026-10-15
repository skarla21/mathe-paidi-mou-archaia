import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  SEARCH_CANDIDATE_LIMIT,
  SEARCH_RESULT_LIMIT,
  publicSearchResults,
} from '../server/utils/contentPath.ts'

function placedChapter(id) {
  return {
    id,
    title: `Κεφάλαιο ${id}`,
    slug: 'enotita',
    subjects: { slug: 'archaia', grades: { slug: 'a-lykeiou' } },
  }
}

describe('publicSearchResults', () => {
  it('fills ten chapter results after skipping chapters with no public path', () => {
    const chapters = [
      { id: 'orphan', title: 'Χωρίς', slug: null, subjects: null },
      ...Array.from({ length: SEARCH_RESULT_LIMIT }, (_, index) => placedChapter(`c${index}`)),
    ]
    const results = publicSearchResults({
      chapters,
      lessons: [],
      lessonPaths: new Map(),
    })
    assert.equal(results.length, SEARCH_RESULT_LIMIT)
    assert.equal(results[0].id, 'c0')
    assert.equal(results[0].url, '/a-lykeiou/archaia/enotita')
    assert.equal(results.every((row) => row.type === 'chapter'), true)
  })

  it('fills ten lesson results after skipping lessons with no public path', () => {
    const lessons = [
      { id: 'missing', title: 'Χωρίς' },
      ...Array.from({ length: SEARCH_RESULT_LIMIT }, (_, index) => ({ id: `l${index}`, title: `Υλικό ${index}` })),
    ]
    const lessonPaths = new Map(lessons.slice(1).map((row) => [row.id, `/a-lykeiou/archaia/enotita/${row.id}`]))
    const results = publicSearchResults({ chapters: [], lessons, lessonPaths })
    assert.equal(results.length, SEARCH_RESULT_LIMIT)
    assert.equal(results[0].id, 'l0')
    assert.equal(results.some((row) => row.id === 'missing'), false)
  })

  it('asks the database for more rows than the ten it returns', () => {
    assert.ok(SEARCH_CANDIDATE_LIMIT > SEARCH_RESULT_LIMIT)
    const source = readFileSync(new URL('../server/api/search.get.ts', import.meta.url), 'utf8')
    assert.match(source, /publicSearchResults/)
    assert.match(source, /SEARCH_CANDIDATE_LIMIT/)
    assert.match(source, /chaptersRes\.error/)
    assert.match(source, /lessonsRes\.error/)
    assert.match(source, /title_folded/)
    assert.match(source, /tags_folded/)
    assert.match(source, /searchLikePattern/)
    assert.doesNotMatch(source, /\.ilike\(/)
    assert.doesNotMatch(source, /\.limit\(10\)/)
  })
})
