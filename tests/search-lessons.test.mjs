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
          tags: ['Οδύσσεια'],
          preview_url: 'https://abc.supabase.co/storage/v1/object/public/uploads/lesson-previews/cover.png',
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
      'https://abc.supabase.co',
    )
    assert.equal(items.length, 2)
    assert.deepEqual(items[0], {
      id: 'a',
      title: 'Αγωγή',
      url: '/a-lykeiou/archaia/enotita/agogi',
      excerpt: 'Πρώτη παράγραφος για απόσπασμα.',
      tags: ['Οδύσσεια'],
      is_free: true,
      preview_url: 'https://abc.supabase.co/storage/v1/object/public/uploads/lesson-previews/cover.png',
      page_count: 12,
      file_bytes: 4096,
      bookmarked: false,
      avg_rating: 0,
      rating_count: 0,
    })
    assert.equal(items[1].id, 'c')
    assert.equal(items[1].excerpt, '')
    assert.deepEqual(items[1].tags, [])
    assert.equal(items[1].is_free, false)
    assert.equal(items[1].preview_url, null)
    assert.equal(items[1].page_count, null)
    assert.equal(items[1].file_bytes, null)
    assert.equal(items[1].bookmarked, false)
    assert.equal(items[1].avg_rating, 0)
    assert.equal(items[1].rating_count, 0)
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
          tags: [],
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
          tags: [],
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
      tags: [],
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
  it('searches folded titles and tags then paginates path-resolved rows', () => {
    const source = readFileSync(new URL('../server/api/search/lessons.get.ts', import.meta.url), 'utf8')
    assert.match(source, /title_folded/)
    assert.match(source, /tags_folded/)
    assert.match(source, /searchLikePattern/)
    assert.match(source, /canonicalLessonPaths/)
    assert.match(source, /mapLessonSearchRows/)
    assert.match(source, /paginateLessonSearchItems/)
    assert.match(source, /withLessonSearchBookmarks/)
    assert.match(source, /lesson_bookmarks/)
    assert.match(source, /LESSON_SEARCH_FETCH_CAP/)
    assert.match(source, /foldGreekSearch/)
    assert.match(source, /select\('id, title, slug, is_free, content, tags, preview_url, page_count, file_bytes, avg_rating, rating_count'/)
    assert.doesNotMatch(source, /count:\s*['"]exact['"]/)
    assert.doesNotMatch(source, /\.ilike\(/)
  })
})

describe('search page lesson rows', () => {
  it('forwards preview, tags, and bookmark fields into CatalogLessonList', () => {
    const source = readFileSync(new URL('../app/pages/search.vue', import.meta.url), 'utf8')
    assert.match(source, /preview_url:\s*lesson\.preview_url/)
    assert.match(source, /page_count:\s*lesson\.page_count/)
    assert.match(source, /file_bytes:\s*lesson\.file_bytes/)
    assert.match(source, /tags:\s*lesson\.tags/)
    assert.match(source, /bookmarked:\s*Boolean\(lesson\.bookmarked\)/)
    assert.match(source, /credentials:\s*['"]include['"]/)
  })
})

describe('lesson tags schema', () => {
  it('adds tags and tags_folded in migration and schema', () => {
    const migration = readFileSync(
      new URL('../supabase/migrations/20261015220000_lesson_tags.sql', import.meta.url),
      'utf8',
    )
    const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')
    assert.match(migration, /alter table public\.lessons[\s\S]*tags text\[]/)
    assert.match(migration, /tags_folded[\s\S]*fold_article_tags\(tags\)/)
    assert.match(migration, /lessons_tags_folded_idx/)
    assert.match(schema, /create table if not exists public\.lessons[\s\S]*tags text\[]/)
    assert.match(schema, /lessons[\s\S]*tags_folded[\s\S]*fold_article_tags\(tags\)/)
    assert.match(schema, /lessons_tags_folded_idx/)
  })
})
