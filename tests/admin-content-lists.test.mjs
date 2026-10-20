import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { loadAdminLessons } from '../server/utils/adminLessons.ts'
import { loadAdminArticles } from '../server/utils/adminArticles.ts'
import { loadAdminDetailPage } from '../server/utils/adminDetailPage.ts'
import { foldedTextOr } from '../server/utils/adminList.ts'

const adminEvent = { context: { auth: { userId: 'admin', isAdmin: true } } }

function eventFor(path) {
  return { ...adminEvent, path }
}

function chainQuery(table, calls, resolvers) {
  const tableResolvers = resolvers[table] ?? {}

  const base = {
    select(columns, options) {
      calls.push([table, 'select', columns, options ?? null])
      return base
    },
    order(column, options) {
      calls.push([table, 'order', column, options])
      if (tableResolvers.order !== undefined) {
        return thenable(base, tableResolvers.order)
      }
      return base
    },
    or(filters, options) {
      calls.push([table, 'or', filters, options ?? null])
      return base
    },
    range(start, end) {
      calls.push([table, 'range', start, end])
      return Promise.resolve(tableResolvers.range)
    },
    in(column, values) {
      calls.push([table, 'in', column, values])
      if (tableResolvers.inTerminal) {
        return Promise.resolve(tableResolvers.in)
      }
      return base
    },
    eq(column, value) {
      calls.push([table, 'eq', column, value])
      if (tableResolvers.eq !== undefined) {
        return thenable(base, tableResolvers.eq)
      }
      return base
    },
  }

  return base
}

function thenable(base, result) {
  return {
    select(...args) {
      return base.select(...args)
    },
    order(...args) {
      return base.order(...args)
    },
    or(...args) {
      return base.or(...args)
    },
    range(...args) {
      return base.range(...args)
    },
    in(...args) {
      return base.in(...args)
    },
    eq(...args) {
      return base.eq(...args)
    },
    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject)
    },
  }
}

function queryClient(resolvers) {
  const calls = []
  return {
    calls,
    client: {
      from(table) {
        calls.push([table, 'from'])
        return chainQuery(table, calls, resolvers)
      },
    },
  }
}

describe('loadAdminLessons', () => {
  it('rejects a non-admin before querying', async () => {
    const supabase = {
      from() {
        throw new Error('queried')
      },
    }
    await assert.rejects(
      () => loadAdminLessons({ context: { auth: { userId: 'student', isAdmin: false } } }, supabase),
      (error) => error.statusCode === 403,
    )
  })

  it('pages the newest lessons on the default page', async () => {
    const supabase = queryClient({
      lessons: {
        range: { data: [], error: null, count: 0 },
      },
    })
    const result = await loadAdminLessons(eventFor('/api/admin/lessons'), supabase.client)
    assert.deepEqual(result, { items: [], total: 0, page: 1, pageSize: 20 })
    assert.deepEqual(supabase.calls.filter((call) => call[1] === 'order'), [
      ['lessons', 'order', 'created_at', { ascending: false }],
      ['lessons', 'order', 'id', { ascending: true }],
    ])
    assert.deepEqual(supabase.calls.filter((call) => call[1] === 'range'), [
      ['lessons', 'range', 0, 19],
    ])
  })

  it('searches folded title and tags', async () => {
    const q = 'όδυσσεια'
    const supabase = queryClient({
      lessons: {
        range: { data: [], error: null, count: 0 },
      },
    })
    await loadAdminLessons(
      eventFor(`/api/admin/lessons?q=${encodeURIComponent(q)}`),
      supabase.client,
    )
    const orFilter = supabase.calls.find((call) => call[1] === 'or')?.[2]
    assert.ok(orFilter)
    assert.match(orFilter, /title_folded/)
    assert.match(orFilter, /tags_folded/)
    const expected = [
      foldedTextOr('title_folded', q),
      foldedTextOr('tags_folded', q),
    ].filter(Boolean).join(',')
    assert.equal(orFilter, expected)
  })

  it('returns early when a chapter filter matches no lessons', async () => {
    const supabase = queryClient({
      lesson_placements: {
        eq: { data: [], error: null },
      },
    })
    const result = await loadAdminLessons(
      eventFor('/api/admin/lessons?chapter_id=ch-empty'),
      supabase.client,
    )
    assert.deepEqual(result, { items: [], total: 0, page: 1, pageSize: 20 })
    assert.equal(supabase.calls.some((call) => call[0] === 'lessons'), false)
    assert.deepEqual(supabase.calls.find((call) => call[1] === 'eq'), [
      'lesson_placements',
      'eq',
      'chapter_id',
      'ch-empty',
    ])
  })

  it('filters lessons by chapter placement ids', async () => {
    const supabase = queryClient({
      lesson_placements: {
        eq: { data: [{ lesson_id: 'l1' }, { lesson_id: 'l2' }], error: null },
        in: { data: [], error: null },
        order: { data: [], error: null },
      },
      lessons: {
        range: { data: [], error: null, count: 0 },
      },
      lesson_ratings: {
        inTerminal: true,
        in: { data: [], error: null },
      },
    })
    await loadAdminLessons(
      eventFor('/api/admin/lessons?chapter_id=ch1'),
      supabase.client,
    )
    assert.deepEqual(supabase.calls.find((call) => call[0] === 'lessons' && call[1] === 'in'), [
      'lessons',
      'in',
      'id',
      ['l1', 'l2'],
    ])
  })

  it('fails when the lessons page query fails', async () => {
    const supabase = queryClient({
      lessons: {
        range: { data: null, error: { message: 'db down' }, count: null },
      },
    })
    await assert.rejects(
      () => loadAdminLessons(eventFor('/api/admin/lessons'), supabase.client),
      (error) => error.statusCode === 500 && error.message === 'Database operation failed',
    )
  })

  it('maps comment, placement, and rating fields', async () => {
    const supabase = queryClient({
      lessons: {
        range: {
          data: [{
            id: 'l1',
            title: 'Όμηρος',
            created_at: '2026-03-01T00:00:00.000Z',
            lesson_comments: [{ count: 4 }],
          }],
          error: null,
          count: 1,
        },
      },
      lesson_placements: {
        inTerminal: false,
        in: undefined,
        order: {
          data: [{
            id: 'p1',
            lesson_id: 'l1',
            subject_id: 's1',
            chapter_id: null,
            category_id: null,
            order: 0,
            subjects: { name: 'Αρχαία', grade_id: 'g1' },
            chapters: null,
            categories: null,
          }],
          error: null,
        },
      },
      lesson_ratings: {
        inTerminal: true,
        in: {
          data: [
            { lesson_id: 'l1', rating: 4 },
            { lesson_id: 'l1', rating: 5 },
          ],
          error: null,
        },
      },
    })
    const result = await loadAdminLessons(eventFor('/api/admin/lessons'), supabase.client)
    assert.equal(result.items.length, 1)
    assert.equal(result.items[0].commentCount, 4)
    assert.deepEqual(result.items[0].placements, [{
      id: 'p1',
      lesson_id: 'l1',
      subject_id: 's1',
      chapter_id: null,
      category_id: null,
      order: 0,
      subjects: { name: 'Αρχαία', grade_id: 'g1' },
      chapters: null,
      categories: null,
    }])
    assert.equal(result.items[0].avgRating, 4.5)
    assert.equal(result.items[0].ratingCount, 2)
    assert.equal(result.items[0].lesson_comments, undefined)
  })
})

describe('loadAdminArticles', () => {
  it('rejects a non-admin before querying', async () => {
    const supabase = {
      from() {
        throw new Error('queried')
      },
    }
    await assert.rejects(
      () => loadAdminArticles({ context: { auth: { userId: 'student', isAdmin: false } } }, supabase),
      (error) => error.statusCode === 403,
    )
  })

  it('pages articles with default ordering', async () => {
    const supabase = queryClient({
      articles: {
        range: { data: [], error: null, count: 0 },
      },
    })
    const result = await loadAdminArticles(eventFor('/api/admin/articles'), supabase.client)
    assert.deepEqual(result, { items: [], total: 0, page: 1, pageSize: 20 })
    assert.deepEqual(supabase.calls.filter((call) => call[1] === 'order'), [
      ['articles', 'order', 'created_at', { ascending: false }],
      ['articles', 'order', 'id', { ascending: true }],
    ])
    assert.deepEqual(supabase.calls.filter((call) => call[1] === 'range'), [
      ['articles', 'range', 0, 19],
    ])
  })

  it('searches folded title and tags', async () => {
    const q = 'όδυσσεια'
    const supabase = queryClient({
      articles: {
        range: { data: [], error: null, count: 0 },
      },
    })
    await loadAdminArticles(
      eventFor(`/api/admin/articles?q=${encodeURIComponent(q)}`),
      supabase.client,
    )
    const orFilter = supabase.calls.find((call) => call[1] === 'or')?.[2]
    assert.match(orFilter, /title_folded/)
    assert.match(orFilter, /tags_folded/)
  })

  it('maps like and comment embed counts', async () => {
    const supabase = queryClient({
      articles: {
        range: {
          data: [{
            id: 'a1',
            title: 'Άρθρο',
            article_likes: [{ count: 2 }],
            article_comments: [{ count: 7 }],
          }],
          error: null,
          count: 1,
        },
      },
    })
    const result = await loadAdminArticles(eventFor('/api/admin/articles'), supabase.client)
    assert.deepEqual(result.items[0], {
      id: 'a1',
      title: 'Άρθρο',
      likeCount: 2,
      commentCount: 7,
    })
  })

  it('fails when the articles query errors', async () => {
    const supabase = queryClient({
      articles: {
        range: { data: null, error: { message: 'db down' }, count: null },
      },
    })
    await assert.rejects(
      () => loadAdminArticles(eventFor('/api/admin/articles'), supabase.client),
      (error) => error.statusCode === 500 && error.message === 'Database operation failed',
    )
  })
})

describe('loadAdminDetailPage', () => {
  const detailOpts = {
    table: 'lesson_comments',
    select: 'id, body, created_at',
    eq: { column: 'lesson_id', value: 'l1' },
    order: { column: 'created_at' },
    logLabel: '[admin/lesson-comments]',
  }

  it('rejects a non-admin before querying', async () => {
    const supabase = {
      from() {
        throw new Error('queried')
      },
    }
    await assert.rejects(
      () => loadAdminDetailPage(
        { context: { auth: { userId: 'student', isAdmin: false } } },
        supabase,
        detailOpts,
      ),
      (error) => error.statusCode === 403,
    )
  })

  it('loads one paged detail list with default descending order', async () => {
    const rows = [{ id: 'c1', body: 'Γεια', created_at: '2026-03-01T00:00:00.000Z' }]
    const supabase = queryClient({
      lesson_comments: {
        range: { data: rows, error: null, count: 3 },
      },
    })
    const result = await loadAdminDetailPage(
      eventFor('/api/admin/lessons/l1/comments'),
      supabase.client,
      detailOpts,
    )
    assert.deepEqual(result, { items: rows, total: 3, page: 1, pageSize: 20 })
    assert.deepEqual(supabase.calls.find((call) => call[1] === 'select'), [
      'lesson_comments',
      'select',
      'id, body, created_at',
      { count: 'exact' },
    ])
    assert.deepEqual(supabase.calls.find((call) => call[1] === 'eq'), [
      'lesson_comments',
      'eq',
      'lesson_id',
      'l1',
    ])
    assert.deepEqual(supabase.calls.filter((call) => call[1] === 'order'), [
      ['lesson_comments', 'order', 'created_at', { ascending: false }],
      ['lesson_comments', 'order', 'id', { ascending: true }],
    ])
    assert.deepEqual(supabase.calls.filter((call) => call[1] === 'range'), [
      ['lesson_comments', 'range', 0, 19],
    ])
  })

  it('returns an empty page without a 404', async () => {
    const supabase = queryClient({
      lesson_comments: {
        range: { data: [], error: null, count: 0 },
      },
    })
    const result = await loadAdminDetailPage(
      eventFor('/api/admin/lessons/l1/comments'),
      supabase.client,
      detailOpts,
    )
    assert.deepEqual(result, { items: [], total: 0, page: 1, pageSize: 20 })
  })

  it('honours ascending order when requested', async () => {
    const supabase = queryClient({
      lesson_comments: {
        range: { data: [], error: null, count: 0 },
      },
    })
    await loadAdminDetailPage(
      eventFor('/api/admin/lessons/l1/comments'),
      supabase.client,
      {
        ...detailOpts,
        order: { column: 'created_at', ascending: true },
      },
    )
    assert.deepEqual(supabase.calls.filter((call) => call[1] === 'order')[0], [
      'lesson_comments',
      'order',
      'created_at',
      { ascending: true },
    ])
  })

  it('fails when the detail query errors', async () => {
    const supabase = queryClient({
      lesson_comments: {
        range: { data: null, error: { message: 'db down' }, count: null },
      },
    })
    await assert.rejects(
      () => loadAdminDetailPage(eventFor('/api/admin/lessons/l1/comments'), supabase.client, detailOpts),
      (error) => error.statusCode === 500 && error.message === 'Database operation failed',
    )
  })
})
