import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { ensureLessonBookmark, ensureLessonBookmarkQuiet } from '../server/utils/lessonBookmarks.ts'

globalThis.createError = (error) => Object.assign(new Error(error.message), error)

function bookmarkClient({ lookup, insert } = {}) {
  const calls = []
  const query = {
    select() {
      return query
    },
    eq() {
      return query
    },
    maybeSingle() {
      calls.push('lookup')
      return Promise.resolve(lookup)
    },
    insert(row) {
      calls.push(['insert', row])
      return Promise.resolve(insert ?? { error: null })
    },
  }
  return {
    calls,
    client: {
      from() {
        return query
      },
    },
  }
}

describe('ensureLessonBookmark', () => {
  it('does not insert when the row already exists', async () => {
    const supabase = bookmarkClient({ lookup: { data: { id: 'b1' }, error: null } })
    await ensureLessonBookmark(supabase.client, 'user-1', 'lesson-1')
    assert.deepEqual(supabase.calls, ['lookup'])
  })

  it('inserts a missing row', async () => {
    const supabase = bookmarkClient({ lookup: { data: null, error: null } })
    await ensureLessonBookmark(supabase.client, 'user-1', 'lesson-1')
    assert.deepEqual(supabase.calls, ['lookup', ['insert', { user_id: 'user-1', lesson_id: 'lesson-1' }]])
  })

  it('treats a unique violation as success', async () => {
    const supabase = bookmarkClient({
      lookup: { data: null, error: null },
      insert: { error: { code: '23505', message: 'duplicate' } },
    })
    await ensureLessonBookmark(supabase.client, 'user-1', 'lesson-1')
  })

  it('throws when the insert fails for another reason', async () => {
    const original = console.error
    console.error = () => {}
    const supabase = bookmarkClient({
      lookup: { data: null, error: null },
      insert: { error: { code: 'XX', message: 'down' } },
    })
    await assert.rejects(
      () => ensureLessonBookmark(supabase.client, 'user-1', 'lesson-1'),
      (error) => error.statusCode === 500 && error.message === 'Κάτι πήγε στραβά',
    )
    console.error = original
  })

  it('throws when the lookup fails', async () => {
    const original = console.error
    console.error = () => {}
    const supabase = bookmarkClient({ lookup: { data: null, error: { message: 'down' } } })
    await assert.rejects(
      () => ensureLessonBookmark(supabase.client, 'user-1', 'lesson-1'),
      (error) => error.statusCode === 500 && error.message === 'Κάτι πήγε στραβά',
    )
    console.error = original
  })
})

describe('ensureLessonBookmarkQuiet', () => {
  it('swallows a bookmark failure', async () => {
    const original = console.error
    const logged = []
    console.error = (...args) => logged.push(args)
    const supabase = bookmarkClient({ lookup: { data: null, error: { message: 'down' } } })
    await ensureLessonBookmarkQuiet(supabase.client, 'user-1', 'lesson-1')
    assert.equal(logged.length > 0, true)
    console.error = original
  })
})
