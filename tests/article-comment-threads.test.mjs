import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  ARTICLE_COMMENT_ROOT_LIMIT,
  mergeCommentThreads,
} from '../server/utils/articleCommentThreads.ts'

describe('mergeCommentThreads', () => {
  it('keeps the newest roots within the limit and sorts them oldest-first for display', () => {
    const rootsNewestFirst = [
      { id: 'r3', parent_id: null, created_at: '2026-01-03T00:00:00Z' },
      { id: 'r2', parent_id: null, created_at: '2026-01-02T00:00:00Z' },
      { id: 'r1', parent_id: null, created_at: '2026-01-01T00:00:00Z' },
    ]
    const merged = mergeCommentThreads(rootsNewestFirst, [])
    assert.deepEqual(
      merged.map((row) => row.id),
      ['r1', 'r2', 'r3'],
    )
  })

  it('includes only replies whose parent root is present', () => {
    const roots = [
      { id: 'r2', parent_id: null, created_at: '2026-01-02T00:00:00Z' },
      { id: 'r1', parent_id: null, created_at: '2026-01-01T00:00:00Z' },
    ]
    const replies = [
      { id: 'a1', parent_id: 'r1', created_at: '2026-01-01T01:00:00Z' },
      { id: 'orphan', parent_id: 'missing', created_at: '2026-01-01T02:00:00Z' },
      { id: 'a2', parent_id: 'r2', created_at: '2026-01-02T01:00:00Z' },
    ]
    const merged = mergeCommentThreads(roots, replies)
    assert.deepEqual(
      merged.map((row) => row.id),
      ['r1', 'r2', 'a1', 'a2'],
    )
  })

  it('exports a root fetch limit of 200', () => {
    assert.equal(ARTICLE_COMMENT_ROOT_LIMIT, 200)
  })
})

describe('article comment API routes', () => {
  it('loads newest roots then their replies instead of a flat oldest window', () => {
    const source = readFileSync(
      new URL('../server/api/articles/[id]/comments.get.ts', import.meta.url),
      'utf8',
    )
    assert.match(source, /mergeCommentThreads/)
    assert.match(source, /ARTICLE_COMMENT_ROOT_LIMIT/)
    assert.match(source, /\.is\(['"]parent_id['"],\s*null\)/)
    assert.match(source, /ascending:\s*false/)
  })

  it('allows delete of own comment without verified email; create still requires it', () => {
    const post = readFileSync(
      new URL('../server/api/articles/[id]/comments.post.ts', import.meta.url),
      'utf8',
    )
    const del = readFileSync(
      new URL('../server/api/articles/[id]/comments/[commentId].delete.ts', import.meta.url),
      'utf8',
    )
    const likeDel = readFileSync(
      new URL('../server/api/articles/[id]/like.delete.ts', import.meta.url),
      'utf8',
    )
    assert.match(post, /requireVerifiedEmail/)
    assert.match(del, /requireAuth/)
    assert.doesNotMatch(del, /requireVerifiedEmail/)
    assert.match(likeDel, /requireAuth/)
    assert.doesNotMatch(likeDel, /requireVerifiedEmail/)
  })

  it('returns Greek error messages on comment mutations', () => {
    const post = readFileSync(
      new URL('../server/api/articles/[id]/comments.post.ts', import.meta.url),
      'utf8',
    )
    assert.match(post, /Το σχόλιο πρέπει να είναι από 1 έως 2000 χαρακτήρες/)
    assert.doesNotMatch(post, /Comment body must be/)
  })

  it('enforces one-level replies in schema and migration', () => {
    const migration = readFileSync(
      new URL('../supabase/migrations/20261015191000_article_comments_parent_check.sql', import.meta.url),
      'utf8',
    )
    const schema = readFileSync(new URL('../supabase/schema.sql', import.meta.url), 'utf8')
    assert.match(migration, /article_comments_validate_parent/)
    assert.match(migration, /cannot reply to a reply/)
    assert.match(schema, /article_comments_validate_parent/)
  })
})
