import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  lessonContentPathFromUrl,
  lessonPreviewPathFromUrl,
  LESSON_CONTENT_REAP_AGE_MS,
  reapOrphanLessonContent,
  removeUnusedLessonContent,
} from '../server/utils/lessonStorage.ts'

const SUPABASE_URL = 'https://proj.supabase.co'
const FILE_URL = `${SUPABASE_URL}/storage/v1/object/public/uploads/lesson-content/1-notes.pdf`
const SAME_FILE_WITH_QUERY = `${FILE_URL}?download=notes.pdf`

function fakeSupabase(urls, { removeError = null, listError = null } = {}) {
  const removed = []
  const query = {
    select() {
      return query
    },
    eq(_column, value) {
      if (listError) return Promise.resolve({ count: null, error: listError, data: null })
      const count = urls.filter(url => url === value).length
      return Promise.resolve({ count, error: null, data: null })
    },
    not() {
      return query
    },
    order() {
      return query
    },
    range(start, end) {
      if (listError) return Promise.resolve({ data: null, error: listError })
      return Promise.resolve({
        data: urls.slice(start, end + 1).map(content_url => ({ content_url })),
        error: null,
      })
    },
  }
  return {
    removed,
    client: {
      from() {
        return query
      },
      storage: {
        from() {
          return {
            remove(paths) {
              removed.push(...paths)
              return Promise.resolve({ error: removeError })
            },
          }
        },
      },
    },
  }
}

describe('lessonContentPathFromUrl', () => {
  it('reads a lesson-content key and ignores a query string', () => {
    assert.equal(
      lessonContentPathFromUrl(SAME_FILE_WITH_QUERY, SUPABASE_URL),
      'lesson-content/1-notes.pdf',
    )
  })

  it('reads a stored object path and rejects traversal', () => {
    assert.equal(
      lessonContentPathFromUrl('lesson-content/1-notes.pdf', SUPABASE_URL),
      'lesson-content/1-notes.pdf',
    )
    assert.equal(lessonContentPathFromUrl('lesson-content/../secret.pdf', SUPABASE_URL), null)
    assert.equal(lessonContentPathFromUrl('lesson-content/%2e%2e/secret.pdf', SUPABASE_URL), null)
  })

  it('reads a lesson-previews key', () => {
    assert.equal(
      lessonPreviewPathFromUrl(
        `${SUPABASE_URL}/storage/v1/object/public/uploads/lesson-previews/1-preview.png`,
        SUPABASE_URL,
      ),
      'lesson-previews/1-preview.png',
    )
  })

  it('rejects another origin, a non-lesson prefix, and path traversal', () => {
    assert.equal(
      lessonContentPathFromUrl('https://evil.example/storage/v1/object/public/uploads/lesson-content/1-notes.pdf', SUPABASE_URL),
      null,
    )
    assert.equal(
      lessonContentPathFromUrl(`${SUPABASE_URL}/storage/v1/object/public/uploads/entity-images/1-notes.pdf`, SUPABASE_URL),
      null,
    )
    assert.equal(
      lessonContentPathFromUrl(`${SUPABASE_URL}/storage/v1/object/public/uploads/lesson-content/../secret.pdf`, SUPABASE_URL),
      null,
    )
    assert.equal(
      lessonContentPathFromUrl(`${SUPABASE_URL}/storage/v1/object/public/uploads/lesson-content/%2e%2e/secret.pdf`, SUPABASE_URL),
      null,
    )
  })
})

describe('removeUnusedLessonContent', () => {
  it('keeps the object when another lesson uses the same storage path', async () => {
    const supabase = fakeSupabase([SAME_FILE_WITH_QUERY])
    await removeUnusedLessonContent(supabase.client, FILE_URL, SUPABASE_URL)
    assert.deepEqual(supabase.removed, [])
  })

  it('keeps the object when the matching lesson is past the first page', async () => {
    const urls = Array.from({ length: 1000 }, (_, index) => (
      `${SUPABASE_URL}/storage/v1/object/public/uploads/lesson-content/other-${index}.pdf`
    ))
    urls.push(SAME_FILE_WITH_QUERY)
    const supabase = fakeSupabase(urls)
    await removeUnusedLessonContent(supabase.client, FILE_URL, SUPABASE_URL)
    assert.deepEqual(supabase.removed, [])
  })

  it('removes the object when no lesson path matches', async () => {
    const supabase = fakeSupabase([
      `${SUPABASE_URL}/storage/v1/object/public/uploads/lesson-content/2-other.pdf`,
    ])
    await removeUnusedLessonContent(supabase.client, FILE_URL, SUPABASE_URL)
    assert.deepEqual(supabase.removed, ['lesson-content/1-notes.pdf'])
  })

  it('does not remove a file when the lesson lookup fails', async () => {
    const supabase = fakeSupabase([FILE_URL], { listError: { message: 'db down' } })
    await removeUnusedLessonContent(supabase.client, FILE_URL, SUPABASE_URL)
    assert.deepEqual(supabase.removed, [])
  })

  it('leaves the saved lesson in place when storage removal fails', async () => {
    const supabase = fakeSupabase([], { removeError: { message: 'storage down' } })
    await removeUnusedLessonContent(supabase.client, FILE_URL, SUPABASE_URL)
    assert.deepEqual(supabase.removed, ['lesson-content/1-notes.pdf'])
  })

  it('skips a url that is not a lesson file in this project', async () => {
    const supabase = fakeSupabase([])
    await removeUnusedLessonContent(supabase.client, 'https://cdn.example/file.pdf', SUPABASE_URL)
    assert.deepEqual(supabase.removed, [])
  })
})

function fakeBucket(urls, objects, { listError = null, removeError = null, lessonsError = null } = {}) {
  const removed = []
  const listed = []
  const query = {
    select() {
      return query
    },
    not() {
      return query
    },
    order() {
      return query
    },
    range(start, end) {
      if (lessonsError) return Promise.resolve({ data: null, error: lessonsError })
      return Promise.resolve({
        data: urls.slice(start, end + 1).map(content_url => ({ content_url })),
        error: null,
      })
    },
  }
  return {
    removed,
    listed,
    client: {
      from() {
        return query
      },
      storage: {
        from() {
          return {
            list(prefix, options = {}) {
              listed.push(prefix)
              if (prefix !== 'lesson-content') {
                return Promise.resolve({
                  data: [{ name: 'secret.png', id: 'other', created_at: '2000-01-01T00:00:00.000Z' }],
                  error: null,
                })
              }
              if (listError) return Promise.resolve({ data: null, error: listError })
              const start = options.offset ?? 0
              const limit = options.limit ?? objects.length
              return Promise.resolve({ data: objects.slice(start, start + limit), error: null })
            },
            remove(paths) {
              removed.push(...paths)
              return Promise.resolve({ error: removeError })
            },
          }
        },
      },
    },
  }
}

describe('reapOrphanLessonContent', () => {
  const now = Date.parse('2026-10-06T12:00:00.000Z')
  const staleAt = new Date(now - LESSON_CONTENT_REAP_AGE_MS - 1000).toISOString()
  const freshAt = new Date(now - 60 * 1000).toISOString()

  it('deletes an old unreferenced lesson file and keeps referenced, fresh, and unsafe names', async () => {
    const supabase = fakeBucket(
      [`${FILE_URL}?download=notes.pdf`],
      [
        { name: '1-notes.pdf', id: 'kept', created_at: staleAt },
        { name: 'orphan.pdf', id: 'orphan', created_at: staleAt },
        { name: 'fresh.pdf', id: 'fresh', created_at: freshAt },
        { name: 'folder', id: null, created_at: staleAt },
        { name: 'undated.pdf', id: 'undated', created_at: null },
        { name: '../secret.pdf', id: 'bad', created_at: staleAt },
      ],
    )
    await reapOrphanLessonContent(supabase.client, SUPABASE_URL, now)
    assert.deepEqual(supabase.listed, ['lesson-content'])
    assert.deepEqual(supabase.removed, ['lesson-content/orphan.pdf'])
  })

  it('pages through the lesson-content folder', async () => {
    const objects = Array.from({ length: 1001 }, (_, index) => ({
      name: `old-${index}.pdf`,
      id: `id-${index}`,
      created_at: staleAt,
    }))
    const supabase = fakeBucket([], objects)
    await reapOrphanLessonContent(supabase.client, SUPABASE_URL, now)
    assert.deepEqual(supabase.listed, ['lesson-content', 'lesson-content'])
    assert.equal(supabase.removed.length, 1001)
    assert.equal(supabase.removed[0], 'lesson-content/old-0.pdf')
    assert.equal(supabase.removed[1000], 'lesson-content/old-1000.pdf')
  })

  it('does not remove files when a saved lesson url is not a storage path', async () => {
    const supabase = fakeBucket(['https://cdn.example/legacy.pdf'], [
      { name: 'orphan.pdf', id: 'orphan', created_at: staleAt },
    ])
    await reapOrphanLessonContent(supabase.client, SUPABASE_URL, now)
    assert.deepEqual(supabase.removed, [])
  })

  it('does not remove files when the lesson lookup fails', async () => {
    const supabase = fakeBucket([FILE_URL], [
      { name: 'orphan.pdf', id: 'orphan', created_at: staleAt },
    ], { lessonsError: { message: 'db down' } })
    await reapOrphanLessonContent(supabase.client, SUPABASE_URL, now)
    assert.deepEqual(supabase.listed, [])
    assert.deepEqual(supabase.removed, [])
  })

  it('does not remove files when the storage listing fails', async () => {
    const supabase = fakeBucket([], [
      { name: 'orphan.pdf', id: 'orphan', created_at: staleAt },
    ], { listError: { message: 'storage down' } })
    await reapOrphanLessonContent(supabase.client, SUPABASE_URL, now)
    assert.deepEqual(supabase.listed, ['lesson-content'])
    assert.deepEqual(supabase.removed, [])
  })

  it('still reports the stale paths when storage removal fails', async () => {
    const supabase = fakeBucket([], [
      { name: 'orphan.pdf', id: 'orphan', created_at: staleAt },
    ], { removeError: { message: 'storage down' } })
    await reapOrphanLessonContent(supabase.client, SUPABASE_URL, now)
    assert.deepEqual(supabase.removed, ['lesson-content/orphan.pdf'])
  })
})
