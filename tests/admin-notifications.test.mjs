import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { describe, it } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  deleteAdminNotification,
  loadAdminNotifications,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
} from '../server/utils/adminNotificationFeed.ts'

const here = dirname(fileURLToPath(import.meta.url))
const adminEvent = { context: { auth: { userId: 'admin-1', isAdmin: true } } }
const notificationId = '550e8400-e29b-41d4-a716-446655440000'

function read(path) {
  return readFileSync(join(here, path), 'utf8')
}

function eventFor(path) {
  return { ...adminEvent, path }
}

function scriptedClient(steps) {
  const calls = []
  let index = 0
  return {
    calls,
    client: {
      from(table) {
        const step = steps[index]
        index += 1
        assert.equal(table, step.table)
        const query = {
          select(...args) {
            calls.push([table, 'select', ...args])
            return query
          },
          eq(...args) {
            calls.push([table, 'eq', ...args])
            return query
          },
          in(...args) {
            calls.push([table, 'in', ...args])
            return query
          },
          order(...args) {
            calls.push([table, 'order', ...args])
            return query
          },
          range(...args) {
            calls.push([table, 'range', ...args])
            return query
          },
          delete() {
            calls.push([table, 'delete'])
            return query
          },
          update(values, options) {
            calls.push([table, 'update', values, options ?? null])
            return query
          },
          lt(...args) {
            calls.push([table, 'lt', ...args])
            return query
          },
          maybeSingle() {
            calls.push([table, 'maybeSingle'])
            return query
          },
          then(resolve, reject) {
            return Promise.resolve(step.result).then(resolve, reject)
          },
        }
        return query
      },
    },
  }
}

const allKinds = [
  'purchase',
  'download',
  'rating',
  'comment',
  'contact',
  'article_like',
  'article_comment',
]

function prefs(overrides = {}) {
  return {
    table: 'admin_notification_preferences',
    result: {
      data: {
        notify_purchase: true,
        notify_download: true,
        notify_rating: true,
        notify_comment: true,
        notify_contact: true,
        notify_article_like: true,
        notify_article_comment: true,
        ...overrides,
      },
      error: null,
    },
  }
}

describe('admin notification feed', () => {
  it('returns the unread count without loading a page', async () => {
    const supabase = scriptedClient([
      { table: 'admin_notifications', result: { error: null } },
      prefs(),
      { table: 'admin_notifications', result: { count: 3, error: null } },
    ])
    const result = await loadAdminNotifications(
      eventFor('/api/admin/notifications?summary=1'),
      supabase.client,
    )
    assert.deepEqual(result, { unreadCount: 3 })
    assert.equal(supabase.calls.some((call) => call[1] === 'range'), false)
    assert.deepEqual(supabase.calls.find((call) => call[1] === 'in' && call[2] === 'kind'), [
      'admin_notifications',
      'in',
      'kind',
      allKinds,
    ])
    assert.deepEqual(supabase.calls.find((call) => call[1] === 'eq' && call[2] === 'read'), [
      'admin_notifications',
      'eq',
      'read',
      false,
    ])
  })

  it('fails when notification preferences cannot be loaded', async () => {
    const supabase = scriptedClient([
      { table: 'admin_notifications', result: { error: null } },
      {
        table: 'admin_notification_preferences',
        result: { data: null, error: { message: 'prefs down' } },
      },
    ])
    await assert.rejects(
      () => loadAdminNotifications(eventFor('/api/admin/notifications?summary=1'), supabase.client),
      (error) => error.statusCode === 500,
    )
    assert.equal(supabase.calls.some((call) => call[1] === 'in'), false)
  })

  it('returns one notification page and copies each row read flag', async () => {
    const rows = [
      { id: 'n1', kind: 'purchase', payload: { lesson_title: 'Πλάτων' }, created_at: '2026-03-02T00:00:00.000Z', read: false },
      { id: 'n2', kind: 'contact', payload: { email: 'a@x.gr', message: 'Γεια' }, created_at: '2026-03-01T00:00:00.000Z', read: true },
    ]
    const supabase = scriptedClient([
      { table: 'admin_notifications', result: { error: null } },
      prefs({ notify_contact: false }),
      { table: 'admin_notifications', result: { count: 7, error: null } },
      { table: 'admin_notifications', result: { data: rows, count: 12, error: null } },
    ])
    const result = await loadAdminNotifications(
      eventFor('/api/admin/notifications?page=2&limit=10'),
      supabase.client,
    )
    assert.deepEqual(result, {
      items: [
        { ...rows[0], read: false },
        { ...rows[1], read: true },
      ],
      unreadCount: 7,
      total: 12,
      page: 2,
      pageSize: 10,
    })
    assert.deepEqual(
      supabase.calls.find((call) => call[1] === 'in' && call[2] === 'kind')[3],
      allKinds.filter((kind) => kind !== 'contact'),
    )
    assert.deepEqual(supabase.calls.filter((call) => call[1] === 'range'), [
      ['admin_notifications', 'range', 10, 19],
    ])
  })

  it('caps the page size and skips the counts when every kind is hidden', async () => {
    const hidden = scriptedClient([
      { table: 'admin_notifications', result: { error: null } },
      prefs({
        notify_purchase: false,
        notify_download: false,
        notify_rating: false,
        notify_comment: false,
        notify_contact: false,
        notify_article_like: false,
        notify_article_comment: false,
      }),
    ])
    const result = await loadAdminNotifications(
      eventFor('/api/admin/notifications?summary=1'),
      hidden.client,
    )
    assert.deepEqual(result, { unreadCount: 0 })
    assert.equal(hidden.calls.some((call) => call[1] === 'in'), false)

    const capped = scriptedClient([
      { table: 'admin_notifications', result: { error: null } },
      prefs(),
      { table: 'admin_notifications', result: { count: 0, error: null } },
      { table: 'admin_notifications', result: { data: [], count: 0, error: null } },
    ])
    const page = await loadAdminNotifications(
      eventFor('/api/admin/notifications?limit=100'),
      capped.client,
    )
    assert.deepEqual(page, { items: [], unreadCount: 0, total: 0, page: 1, pageSize: 20 })
    assert.deepEqual(capped.calls.filter((call) => call[1] === 'range'), [
      ['admin_notifications', 'range', 0, 19],
    ])
  })

  it('fails when the unread count cannot be loaded', async () => {
    const supabase = scriptedClient([
      { table: 'admin_notifications', result: { error: null } },
      prefs(),
      { table: 'admin_notifications', result: { count: null, error: { message: 'db down' } } },
    ])
    await assert.rejects(
      () => loadAdminNotifications(eventFor('/api/admin/notifications?summary=1'), supabase.client),
      (error) => error.statusCode === 500,
    )
  })

  it('keeps the notification routes on the feed helpers', () => {
    const list = read('../server/api/admin/notifications.get.ts')
    const remove = read('../server/api/admin/notifications/[id].delete.ts')
    const readOne = read('../server/api/admin/notifications/[id]/read.post.ts')
    const readAll = read('../server/api/admin/notifications/read-all.post.ts')
    const modal = read('../app/components/admin/AdminNotificationsModal.vue')
    assert.match(list, /loadAdminNotifications/)
    assert.doesNotMatch(list, /\.from\(/)
    assert.match(remove, /deleteAdminNotification/)
    assert.doesNotMatch(remove, /\.from\(/)
    assert.match(readOne, /markAdminNotificationRead/)
    assert.doesNotMatch(readOne, /\.from\(/)
    assert.match(readAll, /markAllAdminNotificationsRead/)
    assert.doesNotMatch(readAll, /\.from\(/)
    assert.match(modal, /@click="removeItem\(item\.id\)"/)
    assert.doesNotMatch(modal, /pendingDeleteId/)
    assert.doesNotMatch(modal, /Η ειδοποίηση θα διαγραφεί οριστικά/)
  })
})

describe('admin notification delete', () => {
  function deleteClient(result) {
    const calls = []
    return {
      calls,
      client: {
        from(table) {
          calls.push(['from', table])
          const query = {
            delete(options) {
              calls.push(['delete', options])
              return query
            },
            eq(column, value) {
              calls.push(['eq', column, value])
              return query
            },
            then(resolve, reject) {
              return Promise.resolve(result).then(resolve, reject)
            },
          }
          return query
        },
      },
    }
  }

  it('rejects a non-admin and an id that is not a uuid', async () => {
    const queried = {
      from() {
        throw new Error('queried')
      },
    }
    await assert.rejects(
      () => deleteAdminNotification(
        { context: { auth: { userId: 'student', isAdmin: false }, params: { id: notificationId } } },
        queried,
      ),
      (error) => error.statusCode === 403,
    )
    await assert.rejects(
      () => deleteAdminNotification(
        { ...adminEvent, context: { ...adminEvent.context, params: { id: 'not-a-uuid' } } },
        queried,
      ),
      (error) => error.statusCode === 400,
    )
  })

  it('deletes one notification and reports a missing id', async () => {
    const supabase = deleteClient({ error: null, count: 1 })
    const result = await deleteAdminNotification(
      { ...adminEvent, context: { ...adminEvent.context, params: { id: notificationId } } },
      supabase.client,
    )
    assert.deepEqual(result, { ok: true })
    assert.deepEqual(supabase.calls, [
      ['from', 'admin_notifications'],
      ['delete', { count: 'exact' }],
      ['eq', 'id', notificationId],
    ])

    const missing = deleteClient({ error: null, count: 0 })
    await assert.rejects(
      () => deleteAdminNotification(
        { ...adminEvent, context: { ...adminEvent.context, params: { id: notificationId } } },
        missing.client,
      ),
      (error) => error.statusCode === 404,
    )
  })
})

function readEvent(id = notificationId) {
  return { ...adminEvent, context: { ...adminEvent.context, params: { id } } }
}

describe('admin notification read', () => {
  it('rejects a non-admin and an id that is not a uuid', async () => {
    const queried = {
      from() {
        throw new Error('queried')
      },
    }
    await assert.rejects(
      () => markAdminNotificationRead(
        { context: { auth: { userId: 'student', isAdmin: false }, params: { id: notificationId } } },
        queried,
      ),
      (error) => error.statusCode === 403,
    )
    await assert.rejects(
      () => markAdminNotificationRead(readEvent('not-a-uuid'), queried),
      (error) => error.statusCode === 400,
    )
  })

  it('marks one unread notification read', async () => {
    const supabase = scriptedClient([
      { table: 'admin_notifications', result: { error: null, count: 1 } },
    ])
    const result = await markAdminNotificationRead(readEvent(), supabase.client)
    assert.deepEqual(result, { ok: true })
    const update = supabase.calls.find((call) => call[1] === 'update')
    assert.equal(update[2].read, true)
    assert.equal(typeof update[2].read_at, 'string')
    assert.deepEqual(update[3], { count: 'exact' })
    assert.deepEqual(supabase.calls.filter((call) => call[1] === 'eq'), [
      ['admin_notifications', 'eq', 'id', notificationId],
      ['admin_notifications', 'eq', 'read', false],
    ])
  })

  it('keeps an already-read notification and reports a missing id', async () => {
    const already = scriptedClient([
      { table: 'admin_notifications', result: { error: null, count: 0 } },
      { table: 'admin_notifications', result: { data: { id: notificationId }, error: null } },
    ])
    const result = await markAdminNotificationRead(readEvent(), already.client)
    assert.deepEqual(result, { ok: true })
    assert.equal(already.calls.filter((call) => call[1] === 'update').length, 1)

    const missing = scriptedClient([
      { table: 'admin_notifications', result: { error: null, count: 0 } },
      { table: 'admin_notifications', result: { data: null, error: null } },
    ])
    await assert.rejects(
      () => markAdminNotificationRead(readEvent(), missing.client),
      (error) => error.statusCode === 404,
    )
  })
})

describe('admin notification read all', () => {
  it('rejects a non-admin before loading preferences', async () => {
    const queried = {
      from() {
        throw new Error('queried')
      },
    }
    await assert.rejects(
      () => markAllAdminNotificationsRead(
        { context: { auth: { userId: 'student', isAdmin: false } } },
        queried,
      ),
      (error) => error.statusCode === 403,
    )
  })

  it('fails when notification preferences cannot be loaded', async () => {
    const supabase = scriptedClient([
      {
        table: 'admin_notification_preferences',
        result: { data: null, error: { message: 'prefs down' } },
      },
    ])
    await assert.rejects(
      () => markAllAdminNotificationsRead(adminEvent, supabase.client),
      (error) => error.statusCode === 500,
    )
    assert.equal(supabase.calls.some((call) => call[1] === 'update'), false)
  })

  it('marks unread notifications for the enabled kinds', async () => {
    const supabase = scriptedClient([
      prefs({ notify_contact: false }),
      { table: 'admin_notifications', result: { error: null } },
    ])
    const result = await markAllAdminNotificationsRead(adminEvent, supabase.client)
    assert.deepEqual(result, { ok: true })
    const update = supabase.calls.find((call) => call[1] === 'update')
    assert.equal(update[2].read, true)
    assert.equal(typeof update[2].read_at, 'string')
    assert.deepEqual(
      supabase.calls.find((call) => call[1] === 'in'),
      ['admin_notifications', 'in', 'kind', allKinds.filter((kind) => kind !== 'contact')],
    )
    assert.deepEqual(supabase.calls.find((call) => call[1] === 'eq' && call[2] === 'read'), [
      'admin_notifications',
      'eq',
      'read',
      false,
    ])
  })

  it('skips the update when every kind is hidden', async () => {
    const supabase = scriptedClient([
      prefs({
        notify_purchase: false,
        notify_download: false,
        notify_rating: false,
        notify_comment: false,
        notify_contact: false,
        notify_article_like: false,
        notify_article_comment: false,
      }),
    ])
    const result = await markAllAdminNotificationsRead(adminEvent, supabase.client)
    assert.deepEqual(result, { ok: true })
    assert.equal(supabase.calls.some((call) => call[1] === 'update'), false)
  })

  it('fails when the update cannot be saved', async () => {
    const supabase = scriptedClient([
      prefs(),
      { table: 'admin_notifications', result: { error: { message: 'db down' } } },
    ])
    await assert.rejects(
      () => markAllAdminNotificationsRead(adminEvent, supabase.client),
      (error) => error.statusCode === 500,
    )
  })
})
