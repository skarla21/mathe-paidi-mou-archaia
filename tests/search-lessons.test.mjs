import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  emptyLessonSearchPage,
  LESSON_SEARCH_FETCH_CAP,
  LESSON_SEARCH_PAGE_SIZE,
  mapLessonSearchRows,
  paginateLessonSearchItems,
  withLessonSearchBookmarks,
} from '../server/utils/lessonSearchPage.ts'

describe('lesson search page helpers', () => {
  it('uses a fixed page size of 20 and a fetch cap', () => {
    assert.equal(LESSON_SEARCH_PAGE_SIZE, 20)
    assert.equal(LESSON_SEARCH_FETCH_CAP, 500)
  })

  it('returns an empty page for short queries', () => {
    assert.deepEqual(emptyLessonSearchPage(3), {
      items: [],
      total: 0,
      page: 3,
      pageSize: 20,
    })
  })

  it('maps rows with public paths, preview metadata, and strips raw content into excerpts', () => {
    const items = mapLessonSearchRows(
      [
        {
          id: 'a',
          title: 'Αγωγή',
          is_free: true,
          content: '<p>Πρώτη παράγραφος για απόσπασμα.</p>',
          preview_url: 'previews/a.webp',
          page_count: 12,
          file_bytes: 4096,
        },
        { id: 'b', title: 'Χωρίς διαδρομή', is_free: false, content: '<p>Κρυφό</p>' },
        { id: 'c', title: 'Πληρωμένο', is_free: false, content: null },
      ],
      new Map([
        ['a', '/a-lykeiou/archaia/enotita/agogi'],
        ['c', '/category/extra/pliromeno'],
      ]),
    )
    assert.equal(items.length, 2)
    assert.deepEqual(items[0], {
      id: 'a',
      title: 'Αγωγή',
      url: '/a-lykeiou/archaia/enotita/agogi',
      excerpt: 'Πρώτη παράγραφος για απόσπασμα.',
      is_free: true,
      preview_url: 'previews/a.webp',
      page_count: 12,
      file_bytes: 4096,
      bookmarked: false,
    })
    assert.equal(items[1].id, 'c')
    assert.equal(items[1].excerpt, '')
    assert.equal(items[1].is_free, false)
    assert.equal(items[1].preview_url, null)
    assert.equal(items[1].page_count, null)
    assert.equal(items[1].file_bytes, null)
    assert.equal(items[1].bookmarked, false)
    assert.equal(items.some((row) => row.id === 'b'), false)
  })

  it('marks bookmarked lessons for the signed-in user', () => {
    const items = withLessonSearchBookmarks(
      [
        {
          id: 'a',
          title: 'Α',
          url: '/a',
          excerpt: '',
          is_free: true,
          preview_url: null,
          page_count: null,
          file_bytes: null,
          bookmarked: false,
        },
        {
          id: 'b',
          title: 'Β',
          url: '/b',
          excerpt: '',
          is_free: true,
          preview_url: null,
          page_count: null,
          file_bytes: null,
          bookmarked: false,
        },
      ],
      new Set(['b']),
    )
    assert.equal(items[0].bookmarked, false)
    assert.equal(items[1].bookmarked, true)
  })

  it('paginates path-resolved items so total matches visible results', () => {
    const items = Array.from({ length: 25 }, (_, i) => ({
      id: String(i),
      title: `Μάθημα ${i}`,
      url: `/x/${i}`,
      excerpt: '',
      is_free: true,
      preview_url: null,
      page_count: null,
      file_bytes: null,
      bookmarked: false,
    }))
    const page2 = paginateLessonSearchItems(items, 2)
    assert.equal(page2.total, 25)
    assert.equal(page2.page, 2)
    assert.equal(page2.pageSize, 20)
    assert.equal(page2.items.length, 5)
    assert.equal(page2.items[0].id, '20')
  })
})

describe('GET /api/search/lessons', () => {
  it('searches folded titles then paginates path-resolved rows', () => {
    const source = readFileSync(new URL('../server/api/search/lessons.get.ts', import.meta.url), 'utf8')
    assert.match(source, /title_folded/)
    assert.match(source, /searchLikePattern/)
    assert.match(source, /canonicalLessonPaths/)
    assert.match(source, /mapLessonSearchRows/)
    assert.match(source, /paginateLessonSearchItems/)
    assert.match(source, /withLessonSearchBookmarks/)
    assert.match(source, /lesson_bookmarks/)
    assert.match(source, /LESSON_SEARCH_FETCH_CAP/)
    assert.match(source, /foldGreekSearch/)
    assert.match(source, /select\('id, title, slug, is_free, content, preview_url, page_count, file_bytes'/)
    assert.doesNotMatch(source, /count:\s*['"]exact['"]/)
    assert.doesNotMatch(source, /\.ilike\(/)
  })
})

describe('search page lesson rows', () => {
  it('forwards preview and bookmark fields into CatalogLessonList', () => {
    const source = readFileSync(new URL('../app/pages/search.vue', import.meta.url), 'utf8')
    assert.match(source, /preview_url:\s*lesson\.preview_url/)
    assert.match(source, /page_count:\s*lesson\.page_count/)
    assert.match(source, /file_bytes:\s*lesson\.file_bytes/)
    assert.match(source, /bookmarked:\s*Boolean\(lesson\.bookmarked\)/)
    assert.match(source, /credentials:\s*['"]include['"]/)
  })
})
