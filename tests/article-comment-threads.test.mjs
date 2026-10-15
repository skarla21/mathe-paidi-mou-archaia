import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import {
  ARTICLE_COMMENT_REPLY_CAP_PER_ROOT,
  ARTICLE_COMMENT_ROOT_LIMIT,
  capRepliesPerRoot,
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

  it('exports a root page size of 20 and reply cap of 50', () => {
    assert.equal(ARTICLE_COMMENT_ROOT_LIMIT, 20)
    assert.equal(ARTICLE_COMMENT_REPLY_CAP_PER_ROOT, 50)
  })

  it('caps replies per root', () => {
    const replies = [
      { id: 'a1', parent_id: 'r1', created_at: '2026-01-01T01:00:00Z' },
      { id: 'a2', parent_id: 'r1', created_at: '2026-01-01T02:00:00Z' },
      { id: 'a3', parent_id: 'r1', created_at: '2026-01-01T03:00:00Z' },
      { id: 'b1', parent_id: 'r2', created_at: '2026-01-02T01:00:00Z' },
    ]
    const capped = capRepliesPerRoot(replies, 2)
    assert.deepEqual(
      capped.map((row) => row.id),
      ['a1', 'a2', 'b1'],
    )
  })
})

describe('article comment API routes', () => {
  it('loads newest roots then their replies instead of a flat oldest window', () => {
    const source = readFileSync(
      new URL('../server/api/articles/[slug]/comments/index.get.ts', import.meta.url),
      'utf8',
    )
    assert.match(source, /mergeCommentThreads/)
    assert.match(source, /ARTICLE_COMMENT_ROOT_LIMIT/)
    assert.match(source, /\.is\(['"]parent_id['"],\s*null\)/)
    assert.match(source, /ascending:\s*false/)
  })

  it('fetches replies per root so a busy thread cannot starve others', () => {
    const source = readFileSync(
      new URL('../server/api/articles/[slug]/comments/index.get.ts', import.meta.url),
      'utf8',
    )
    assert.match(source, /Promise\.all/)
    assert.match(source, /\.eq\(['"]parent_id['"],\s*rootId\)/)
    assert.match(source, /\.limit\(ARTICLE_COMMENT_REPLY_CAP_PER_ROOT\)/)
    assert.doesNotMatch(source, /replyFetchCap/)
  })

  it('uses the same [slug] param as article detail so nested routes mount', () => {
    const source = readFileSync(
      new URL('../server/api/articles/[slug]/comments/index.get.ts', import.meta.url),
      'utf8',
    )
    assert.match(source, /getRouterParam\(event, ['"]slug['"]\)/)
    assert.doesNotMatch(source, /getRouterParam\(event, ['"]id['"]\)/)
  })

  it('mounts GET/POST under comments/index so nested commentId routes work', () => {
    const root = new URL('../server/api/articles/[slug]/', import.meta.url)
    assert.equal(existsSync(new URL('comments/index.get.ts', root)), true)
    assert.equal(existsSync(new URL('comments/index.post.ts', root)), true)
    assert.equal(existsSync(new URL('comments.get.ts', root)), false)
    assert.equal(existsSync(new URL('comments.post.ts', root)), false)
    assert.equal(existsSync(new URL('comments/[commentId].patch.ts', root)), true)
  })

  it('allows delete of own comment without verified email; create still requires it', () => {
    const post = readFileSync(
      new URL('../server/api/articles/[slug]/comments/index.post.ts', import.meta.url),
      'utf8',
    )
    const del = readFileSync(
      new URL('../server/api/articles/[slug]/comments/[commentId].delete.ts', import.meta.url),
      'utf8',
    )
    const likeDel = readFileSync(
      new URL('../server/api/articles/[slug]/like.delete.ts', import.meta.url),
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
      new URL('../server/api/articles/[slug]/comments/index.post.ts', import.meta.url),
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
