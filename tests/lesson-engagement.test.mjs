import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const lessonApi = new URL('../server/api/lessons/[id]/', import.meta.url)

describe('lesson comment API routes', () => {
  it('mounts GET/POST under comments/index so nested commentId routes work', () => {
    assert.equal(existsSync(new URL('comments/index.get.ts', lessonApi)), true)
    assert.equal(existsSync(new URL('comments/index.post.ts', lessonApi)), true)
    assert.equal(existsSync(new URL('comments/[commentId].patch.ts', lessonApi)), true)
    assert.equal(existsSync(new URL('comments/[commentId].delete.ts', lessonApi)), true)
    assert.equal(existsSync(new URL('comments.get.ts', lessonApi)), false)
    assert.equal(existsSync(new URL('comment.put.ts', lessonApi)), false)
    assert.equal(existsSync(new URL('comment.delete.ts', lessonApi)), false)
  })

  it('loads newest roots then replies per root via mergeCommentThreads', () => {
    const source = readFileSync(
      new URL('comments/index.get.ts', lessonApi),
      'utf8',
    )
    assert.match(source, /mergeCommentThreads/)
    assert.match(source, /\.is\(['"]parent_id['"],\s*null\)/)
    assert.match(source, /ascending:\s*false/)
    assert.match(source, /Promise\.all/)
    assert.match(source, /\.eq\(['"]parent_id['"],\s*rootId\)/)
  })

  it('gates create on verified email and lesson access; delete is ownership/auth only', () => {
    const post = readFileSync(
      new URL('comments/index.post.ts', lessonApi),
      'utf8',
    )
    const del = readFileSync(
      new URL('comments/[commentId].delete.ts', lessonApi),
      'utf8',
    )
    assert.match(post, /requireVerifiedEmail/)
    assert.match(post, /canAccessLesson/)
    assert.match(del, /requireAuth/)
    assert.doesNotMatch(del, /requireVerifiedEmail/)
    assert.doesNotMatch(del, /canAccessLesson/)
  })

  it('returns Greek error messages on comment mutations', () => {
    const post = readFileSync(
      new URL('comments/index.post.ts', lessonApi),
      'utf8',
    )
    assert.match(post, /Το σχόλιο πρέπει να είναι από 1 έως 2000 χαρακτήρες/)
    assert.doesNotMatch(post, /Comment body must be/)
  })

  it('enforces one-level replies in schema and engagement migration', () => {
    const migration = readFileSync(
      new URL(
        '../supabase/migrations/20261015230000_lesson_engagement_denorm.sql',
        import.meta.url,
      ),
      'utf8',
    )
    const schema = readFileSync(
      new URL('../supabase/schema.sql', import.meta.url),
      'utf8',
    )
    assert.match(migration, /lesson_comments_validate_parent/)
    assert.match(migration, /cannot reply to a reply/)
    assert.match(schema, /lesson_comments_validate_parent/)
  })
})

describe('lesson rating API routes', () => {
  it('requires access to put a rating but not to delete own rating', () => {
    const put = readFileSync(new URL('rating.put.ts', lessonApi), 'utf8')
    const del = readFileSync(new URL('rating.delete.ts', lessonApi), 'utf8')
    assert.match(put, /canAccessLesson/)
    assert.match(put, /requireVerifiedEmail/)
    assert.doesNotMatch(del, /canAccessLesson/)
    assert.match(del, /requireAuth|requireVerifiedEmail/)
  })

  it('returns denorm avgRating and ratingCount from put and delete', () => {
    const put = readFileSync(new URL('rating.put.ts', lessonApi), 'utf8')
    const del = readFileSync(new URL('rating.delete.ts', lessonApi), 'utf8')
    assert.match(put, /avgRating/)
    assert.match(put, /ratingCount/)
    assert.match(del, /avgRating/)
    assert.match(del, /ratingCount/)
    assert.match(del, /rating:\s*null/)
  })

  it('returns Greek validation messages on rating put', () => {
    const put = readFileSync(new URL('rating.put.ts', lessonApi), 'utf8')
    assert.match(put, /Η βαθμολογία πρέπει να είναι ακέραιος από 1 έως 5/)
  })
})

describe('engagement denorm locks', () => {
  it('adds row locks in a follow-up migration, not by rewriting the applied denorm migration', () => {
    const original = readFileSync(
      new URL(
        '../supabase/migrations/20261015230000_lesson_engagement_denorm.sql',
        import.meta.url,
      ),
      'utf8',
    )
    const lockMigration = readFileSync(
      new URL(
        '../supabase/migrations/20261016112500_engagement_denorm_row_lock.sql',
        import.meta.url,
      ),
      'utf8',
    )
    const schema = readFileSync(
      new URL('../supabase/schema.sql', import.meta.url),
      'utf8',
    )
    assert.match(original, /lesson_ratings_refresh_lesson_avg/)
    assert.doesNotMatch(original, /for update/i)
    for (const source of [lockMigration, schema]) {
      assert.match(source, /lesson_ratings_refresh_lesson_avg/)
      assert.match(source, /article_likes_refresh_like_count/)
      assert.match(source, /for update/i)
    }
  })
})

describe('lesson comment edit error copy', () => {
  it('distinguishes unverified email from missing lesson access on PATCH 403', () => {
    const source = readFileSync(
      new URL('../app/components/lesson/LessonCommentItem.vue', import.meta.url),
      'utf8',
    )
    assert.match(source, /email_verified/)
    assert.match(source, /Χρειάζεστε πρόσβαση στο υλικό για να σχολιάσετε/)
    assert.match(
      source,
      /Επαληθεύστε το email σας για να σχολιάσετε ή να αξιολογήσετε/,
    )
  })
})
