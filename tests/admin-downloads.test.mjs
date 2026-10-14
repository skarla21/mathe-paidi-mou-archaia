import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  downloadsEmptyMessage,
  LESSON_TYPE_HEADING,
  lessonTypeLabel,
} from '../shared/utils/adminDownloads.mjs'
import { resetAdminMainScroll } from '../shared/utils/adminShell.mjs'
import { foldedContains, orIlike } from '../server/utils/adminList.ts'
import { loadAdminDownloads } from '../server/utils/adminDownloads.ts'

const here = dirname(fileURLToPath(import.meta.url))

function read(path) {
  return readFileSync(join(here, path), 'utf8')
}

function row(id, downloadedAt, user, lesson) {
  return {
    id,
    user_id: `user-${id}`,
    lesson_id: `lesson-${id}`,
    downloaded_at: downloadedAt,
    users: user,
    lessons: lesson,
  }
}

const sample = [
  row('1', '2026-01-02T00:00:00.000Z', { name: 'Βάσω', email: 'b@x.gr' }, { title: 'Όμηρος', is_free: true }),
  row('2', '2026-03-01T00:00:00.000Z', { name: 'Άννα', email: 'a@x.gr' }, { title: 'Πλάτων', is_free: false }),
  row('3', '2026-02-01T00:00:00.000Z', { name: null, email: 'z@x.gr' }, { title: null, is_free: true }),
  row('4', '2026-02-01T00:00:00.000Z', { name: 'Άννα', email: 'm@x.gr' }, { title: 'Πλάτων', is_free: false }),
]

function adminPath(search = '') {
  return { ...adminEvent, path: `/api/admin/downloads${search}` }
}

function fakeDownloads(result) {
  const calls = []
  const query = {
    select(columns, options) {
      calls.push(['select', columns, options])
      return query
    },
    order(column, options) {
      calls.push(['order', column, options])
      return query
    },
    or(filters, options) {
      calls.push(['or', filters, options])
      return query
    },
    range(start, end) {
      calls.push(['range', start, end])
      return Promise.resolve(result)
    },
  }
  return {
    calls,
    client: {
      from(table) {
        calls.push(['from', table])
        assert.equal(table, 'downloads')
        return query
      },
    },
  }
}

const adminEvent = { context: { auth: { userId: 'admin', isAdmin: true } } }

describe('admin downloads list', () => {
  it('rejects a non-admin before querying downloads', async () => {
    const supabase = {
      from() {
        throw new Error('queried')
      },
    }
    await assert.rejects(
      () => loadAdminDownloads({ context: { auth: { userId: 'student', isAdmin: false } } }, supabase),
      (error) => error.statusCode === 403,
    )
    await assert.rejects(
      () => loadAdminDownloads({ context: { auth: null } }, supabase),
      (error) => error.statusCode === 403,
    )
  })

  it('escapes like wildcards before building an or filter', () => {
    assert.equal(foldedContains('  '), null)
    assert.equal(foldedContains('΄'), null)
    assert.equal(foldedContains('  Άννα  '), '%αννα%')
    assert.equal(foldedContains('100%_\\*'), '%100\\%\\_\\\\\\*%')
    assert.equal(
      orIlike(['name', 'email'], '%a"b%'),
      'name.ilike."%a\\"b%",email.ilike."%a\\"b%"',
    )
  })

  it('returns the newest 20 downloads and a stable id order', async () => {
    const items = [row('1', '2026-03-01T00:00:00.000Z', { name: 'Άννα', email: 'a@x.gr' }, { title: 'Πλάτων', is_free: false })]
    const supabase = fakeDownloads({ data: items, error: null, count: 41 })
    const result = await loadAdminDownloads(adminPath(), supabase.client)
    assert.deepEqual(result, { items, total: 41, page: 1, pageSize: 20 })
    assert.deepEqual(supabase.calls.find((call) => call[0] === 'select'), [
      'select',
      '*, users!inner(name, email), lessons!inner(title, is_free)',
      { count: 'exact' },
    ])
    assert.deepEqual(supabase.calls.filter((call) => call[0] === 'order'), [
      ['order', 'downloaded_at', { ascending: false }],
      ['order', 'id', { ascending: true }],
    ])
    assert.deepEqual(supabase.calls.filter((call) => call[0] === 'range'), [['range', 0, 19]])
    assert.equal(supabase.calls.some((call) => call[0] === 'or'), false)
  })

  it('reads a later page and filters user and lesson on the server', async () => {
    const supabase = fakeDownloads({ data: [], error: null, count: 0 })
    const result = await loadAdminDownloads(
      adminPath(`?page=2&user=${encodeURIComponent('100%_\\"Άννα')}&lesson=${encodeURIComponent('πλά')}&sort=lesson&order=asc`),
      supabase.client,
    )
    assert.deepEqual(result, { items: [], total: 0, page: 2, pageSize: 20 })
    assert.deepEqual(supabase.calls.filter((call) => call[0] === 'or'), [
      ['or', "name_sort.like.\"%100\\\\%\\\\_\\\\\\\\\\\"αννα%\",email.ilike.\"%100\\\\%\\\\_\\\\\\\\\\\"Άννα%\"", { referencedTable: 'users' }],
      ['or', 'title_folded.like."%πλα%"', { referencedTable: 'lessons' }],
    ])
    assert.deepEqual(supabase.calls.filter((call) => call[0] === 'order'), [
      ['order', 'title_folded', { referencedTable: 'lessons', ascending: true }],
      ['order', 'id', { ascending: true }],
    ])
    assert.deepEqual(supabase.calls.filter((call) => call[0] === 'range'), [['range', 20, 39]])
  })

  it('sorts downloads by user and falls back to newest when sort is unknown', async () => {
    const byUser = fakeDownloads({ data: [], error: null, count: 0 })
    await loadAdminDownloads(adminPath('?sort=user&order=asc'), byUser.client)
    assert.deepEqual(byUser.calls.filter((call) => call[0] === 'order'), [
      ['order', 'name_sort', { referencedTable: 'users', ascending: true }],
      ['order', 'id', { ascending: true }],
    ])
    const fallback = fakeDownloads({ data: [], error: null, count: 0 })
    await loadAdminDownloads(adminPath('?page=0&sort=nope&order=sideways'), fallback.client)
    assert.deepEqual(fallback.calls.filter((call) => call[0] === 'order'), [
      ['order', 'downloaded_at', { ascending: false }],
      ['order', 'id', { ascending: true }],
    ])
    assert.deepEqual(fallback.calls.filter((call) => call[0] === 'range'), [['range', 0, 19]])
  })

  it('fails the request when the download query fails', async () => {
    const supabase = fakeDownloads({ data: null, error: { message: 'db down' }, count: null })
    await assert.rejects(
      () => loadAdminDownloads(adminPath(), supabase.client),
      (error) => error.statusCode === 500,
    )
  })

  it('explains an empty download table', () => {
    assert.equal(downloadsEmptyMessage(false), 'Δεν υπάρχουν λήψεις ακόμη.')
    assert.equal(downloadsEmptyMessage(true), 'Δεν βρέθηκαν λήψεις.')
  })

  it('labels the lesson type as it is now', () => {
    assert.equal(LESSON_TYPE_HEADING, 'Τύπος υλικού')
    assert.equal(lessonTypeLabel(sample[0]), 'Δωρεάν')
    assert.equal(lessonTypeLabel(sample[1]), 'Επί πληρωμή')
    assert.equal(lessonTypeLabel(row('9', '2026-01-01T00:00:00.000Z', null, null)), '—')
  })
})

describe('admin shell', () => {
  it('scrolls the admin main pane back to the top', () => {
    const calls = []
    resetAdminMainScroll({
      scrollTo(x, y) {
        calls.push([x, y])
      },
    })
    resetAdminMainScroll(null)
    assert.deepEqual(calls, [[0, 0]])
  })

  it('lets the mobile menu scroll and resets the main pane on navigation', () => {
    const layout = read('../app/layouts/admin.vue')
    const drawer = layout.match(/v-if="mobileMenuOpen"[\s\S]*?class="([^"]+)"/)
    assert.ok(drawer)
    assert.match(drawer[1], /min-h-0/)
    assert.match(drawer[1], /flex-1/)
    assert.match(drawer[1], /overflow-y-auto/)
    assert.doesNotMatch(drawer[1], /shrink-0/)
    assert.match(layout, /mobileMenuOpen \? 'hidden md:flex' : 'flex'/)
    assert.match(layout, /watch\(\(\) => route\.path/)
    assert.match(layout, /resetAdminMainScroll\(mainEl\.value\)/)
    assert.match(layout, /border-border\/60/)
    assert.doesNotMatch(layout, /border-border(?!\/)/)
  })

  it('pages downloads and names the current lesson type', () => {
    const route = read('../server/api/admin/downloads.get.ts')
    assert.match(route, /loadAdminDownloads/)
    assert.doesNotMatch(route, /\.select\(/)
    const page = read('../app/pages/admin/downloads.vue')
    assert.match(page, /LESSON_TYPE_HEADING/)
    assert.match(page, /lessonTypeLabel/)
    assert.match(page, /downloadsEmptyMessage/)
    assert.match(page, /AdminTablePager/)
    assert.match(page, /useAdminTablePage/)
    assert.doesNotMatch(page, /filterDownloads/)
    assert.doesNotMatch(page, /sortDownloads/)
    assert.doesNotMatch(page, />Τύπος</)
    assert.match(page, /rounded-2xl border border-border/)
    assert.doesNotMatch(page, /border-border\/40/)
  })
})
