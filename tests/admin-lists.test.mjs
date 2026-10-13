import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import { ilikeContains, orIlike } from '../server/utils/adminList.ts'
import { loadAdminPurchases } from '../server/utils/adminPurchases.ts'
import { loadAdminUsers } from '../server/utils/adminUsers.ts'

const here = dirname(fileURLToPath(import.meta.url))
const adminEvent = { context: { auth: { userId: 'admin', isAdmin: true } } }

function read(path) {
  return readFileSync(join(here, path), 'utf8')
}

function eventFor(path) {
  return { ...adminEvent, path }
}

function queryClient(resolvers) {
  const calls = []
  return {
    calls,
    client: {
      from(table) {
        calls.push([table, 'from'])
        const query = {
          select(columns, options) {
            calls.push([table, 'select', columns, options ?? null])
            return query
          },
          order(column, options) {
            calls.push([table, 'order', column, options])
            return query
          },
          or(filters, options) {
            calls.push([table, 'or', filters, options ?? null])
            return query
          },
          range(start, end) {
            calls.push([table, 'range', start, end])
            return Promise.resolve(resolvers[table].range)
          },
          in(column, values) {
            calls.push([table, 'in', column, values])
            return Promise.resolve(resolvers[table].in)
          },
        }
        return query
      },
    },
  }
}

describe('admin users page', () => {
  it('rejects a non-admin before querying users', async () => {
    const supabase = {
      from() {
        throw new Error('queried')
      },
    }
    await assert.rejects(
      () => loadAdminUsers({ context: { auth: { userId: 'student', isAdmin: false } } }, supabase),
      (error) => error.statusCode === 403,
    )
  })

  it('returns the newest 20 users with article counts for that page', async () => {
    const stats = [
      {
        id: 'u1',
        name: 'Άννα',
        email: 'a@x.gr',
        avatar_url: null,
        isAdmin: false,
        created_at: '2026-03-01T00:00:00.000Z',
        download_count: 4,
        purchase_count: 1,
      },
      {
        id: 'u2',
        name: null,
        email: 'b@x.gr',
        avatar_url: 'https://cdn.example/a.png',
        isAdmin: true,
        created_at: '2026-02-01T00:00:00.000Z',
        download_count: 0,
        purchase_count: 2,
      },
    ]
    const supabase = queryClient({
      admin_user_stats: { range: { data: stats, error: null, count: 21 } },
      users: {
        in: {
          data: [
            { id: 'u1', article_likes: [{ count: 3 }], article_comments: [{ count: 1 }] },
            { id: 'u2', article_likes: [], article_comments: null },
          ],
          error: null,
        },
      },
    })
    const result = await loadAdminUsers(eventFor('/api/admin/users'), supabase.client)
    assert.deepEqual(result, {
      items: [
        {
          id: 'u1',
          name: 'Άννα',
          email: 'a@x.gr',
          avatar_url: null,
          isAdmin: false,
          created_at: '2026-03-01T00:00:00.000Z',
          downloadCount: 4,
          purchaseCount: 1,
          articleLikeCount: 3,
          articleCommentCount: 1,
        },
        {
          id: 'u2',
          name: null,
          email: 'b@x.gr',
          avatar_url: 'https://cdn.example/a.png',
          isAdmin: true,
          created_at: '2026-02-01T00:00:00.000Z',
          downloadCount: 0,
          purchaseCount: 2,
          articleLikeCount: 0,
          articleCommentCount: 0,
        },
      ],
      total: 21,
      page: 1,
      pageSize: 20,
    })
    assert.deepEqual(supabase.calls.find((call) => call[1] === 'select' && call[0] === 'admin_user_stats'), [
      'admin_user_stats',
      'select',
      'id, name, email, avatar_url, "isAdmin", created_at, download_count, purchase_count',
      { count: 'exact' },
    ])
    assert.deepEqual(supabase.calls.filter((call) => call[1] === 'order'), [
      ['admin_user_stats', 'order', 'created_at', { ascending: false }],
      ['admin_user_stats', 'order', 'id', { ascending: true }],
    ])
    assert.deepEqual(supabase.calls.find((call) => call[1] === 'in'), [
      'users',
      'in',
      'id',
      ['u1', 'u2'],
    ])
  })

  it('filters and sorts user counts before the page range', async () => {
    const supabase = queryClient({
      admin_user_stats: { range: { data: [], error: null, count: 0 } },
    })
    const result = await loadAdminUsers(
      eventFor(`/api/admin/users?page=2&q=${encodeURIComponent('άννα')}&sort=downloads&order=asc`),
      supabase.client,
    )
    assert.deepEqual(result, { items: [], total: 0, page: 2, pageSize: 20 })
    assert.deepEqual(supabase.calls.find((call) => call[1] === 'or'), [
      'admin_user_stats',
      'or',
      orIlike(['name', 'email'], ilikeContains('άννα')),
      null,
    ])
    assert.deepEqual(supabase.calls.filter((call) => call[1] === 'order'), [
      ['admin_user_stats', 'order', 'download_count', { ascending: true }],
      ['admin_user_stats', 'order', 'id', { ascending: true }],
    ])
    assert.deepEqual(supabase.calls.filter((call) => call[1] === 'range'), [
      ['admin_user_stats', 'range', 20, 39],
    ])
    assert.equal(supabase.calls.some((call) => call[0] === 'users'), false)
  })

  it('sorts users by name or purchases and ignores an unknown sort', async () => {
    const byName = queryClient({
      admin_user_stats: { range: { data: [], error: null, count: 0 } },
    })
    await loadAdminUsers(eventFor('/api/admin/users?sort=name&order=asc'), byName.client)
    assert.deepEqual(byName.calls.filter((call) => call[1] === 'order'), [
      ['admin_user_stats', 'order', 'name_sort', { ascending: true }],
      ['admin_user_stats', 'order', 'id', { ascending: true }],
    ])

    const byPurchases = queryClient({
      admin_user_stats: { range: { data: [], error: null, count: 0 } },
    })
    await loadAdminUsers(eventFor('/api/admin/users?sort=purchases'), byPurchases.client)
    assert.deepEqual(byPurchases.calls.filter((call) => call[1] === 'order'), [
      ['admin_user_stats', 'order', 'purchase_count', { ascending: false }],
      ['admin_user_stats', 'order', 'id', { ascending: true }],
    ])

    const fallback = queryClient({
      admin_user_stats: { range: { data: [], error: null, count: 0 } },
    })
    await loadAdminUsers(eventFor('/api/admin/users?sort=email&order=sideways'), fallback.client)
    assert.deepEqual(fallback.calls.filter((call) => call[1] === 'order'), [
      ['admin_user_stats', 'order', 'created_at', { ascending: false }],
      ['admin_user_stats', 'order', 'id', { ascending: true }],
    ])
  })

  it('fails when the user page or the article counts fail', async () => {
    const statsDown = queryClient({
      admin_user_stats: { range: { data: null, error: { message: 'db down' }, count: null } },
    })
    await assert.rejects(
      () => loadAdminUsers(eventFor('/api/admin/users'), statsDown.client),
      (error) => error.statusCode === 500,
    )

    const countsDown = queryClient({
      admin_user_stats: {
        range: {
          data: [{
            id: 'u1',
            name: 'Άννα',
            email: 'a@x.gr',
            avatar_url: null,
            isAdmin: false,
            created_at: '2026-03-01T00:00:00.000Z',
            download_count: 1,
            purchase_count: 0,
          }],
          error: null,
          count: 1,
        },
      },
      users: { in: { data: null, error: { message: 'counts down' } } },
    })
    await assert.rejects(
      () => loadAdminUsers(eventFor('/api/admin/users'), countsDown.client),
      (error) => error.statusCode === 500,
    )
  })

  it('reads user pages from the service-role stats view', () => {
    const route = read('../server/api/admin/users.get.ts')
    const schema = read('../supabase/schema.sql')
    const migration = read('../supabase/migrations/20261013181700_admin_user_stats.sql')
    assert.match(route, /loadAdminUsers/)
    assert.doesNotMatch(route, /\.from\(/)
    for (const sql of [schema, migration]) {
      assert.match(sql, /drop view if exists public\.admin_user_stats/)
      assert.match(sql, /create view public\.admin_user_stats/)
      assert.match(sql, /security_invoker = true/)
      assert.match(sql, /download_count/)
      assert.match(sql, /purchase_count/)
      assert.match(sql, /revoke all on table public\.admin_user_stats from public, anon, authenticated/)
      assert.match(sql, /grant select on table public\.admin_user_stats to service_role/)
    }
  })
})

describe('admin purchases page', () => {
  it('returns the newest 20 purchases', async () => {
    const items = [{ id: 'p1', created_at: '2026-03-01T00:00:00.000Z' }]
    const supabase = queryClient({
      purchases: { range: { data: items, error: null, count: 25 } },
    })
    const result = await loadAdminPurchases(eventFor('/api/admin/purchases'), supabase.client)
    assert.deepEqual(result, { items, total: 25, page: 1, pageSize: 20 })
    assert.deepEqual(supabase.calls.find((call) => call[1] === 'select'), [
      'purchases',
      'select',
      '*, users!inner(name, email), lessons!inner(title)',
      { count: 'exact' },
    ])
    assert.deepEqual(supabase.calls.filter((call) => call[1] === 'order'), [
      ['purchases', 'order', 'created_at', { ascending: false }],
      ['purchases', 'order', 'id', { ascending: true }],
    ])
    assert.deepEqual(supabase.calls.filter((call) => call[1] === 'range'), [
      ['purchases', 'range', 0, 19],
    ])
  })

  it('filters purchases by user or lesson before paging', async () => {
    const supabase = queryClient({
      purchases: { range: { data: [], error: null, count: 41 } },
    })
    const result = await loadAdminPurchases(
      eventFor(`/api/admin/purchases?page=3&user=${encodeURIComponent('a@x.gr')}&lesson=${encodeURIComponent('Όμηρος')}`),
      supabase.client,
    )
    assert.deepEqual(result, { items: [], total: 41, page: 3, pageSize: 20 })
    assert.deepEqual(supabase.calls.filter((call) => call[1] === 'or'), [
      ['purchases', 'or', orIlike(['name', 'email'], ilikeContains('a@x.gr')), { referencedTable: 'users' }],
      ['purchases', 'or', orIlike(['title'], ilikeContains('Όμηρος')), { referencedTable: 'lessons' }],
    ])
    assert.deepEqual(supabase.calls.filter((call) => call[1] === 'range'), [
      ['purchases', 'range', 40, 59],
    ])
  })

  it('fails the request when the purchase query fails', async () => {
    const supabase = queryClient({
      purchases: { range: { data: null, error: { message: 'db down' }, count: null } },
    })
    await assert.rejects(
      () => loadAdminPurchases(eventFor('/api/admin/purchases'), supabase.client),
      (error) => error.statusCode === 500,
    )
  })

  it('keeps the purchase route on the paged loader', () => {
    const route = read('../server/api/admin/purchases.get.ts')
    const page = read('../app/pages/admin/purchases.vue')
    assert.match(route, /loadAdminPurchases/)
    assert.doesNotMatch(route, /\.from\(/)
    for (const path of ['downloads.vue', 'users.vue', 'purchases.vue']) {
      const source = read(`../app/pages/admin/${path}`)
      assert.match(source, /AdminTablePager/)
      assert.match(source, /useAdminTablePage/)
    }
    assert.match(page, /toast\.error\('Κάτι πήγε στραβά'\)/)
    assert.match(page, /if \(page\.value === 1\) await load\(\)\s*else page\.value = 1/)
  })

  it('sorts admin names with the folded greek key', () => {
    const schema = read('../supabase/schema.sql')
    const migration = read('../supabase/migrations/20261013184500_admin_name_sort.sql')
    const expression = /fold_greek_search\(\s*case\s+when name is null or btrim\(name\) = '' then email\s+else name\s+end\s*\)/
    for (const sql of [schema, migration]) {
      assert.match(sql, /name_sort text/)
      assert.match(sql, expression)
      assert.match(sql, /users_name_sort_idx/)
      assert.match(sql, /u\.name_sort/)
    }
    assert.doesNotMatch(schema, /real columns/)
  })
})
