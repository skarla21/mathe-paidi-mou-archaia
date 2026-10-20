import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  createAdminNotification,
  cleanupOldAdminNotifications,
  notifyPurchaseCreated,
  notifyCommentCreated,
  notifyContactMessage,
  notifyArticleLikeCreated,
} from '../server/utils/adminNotifications.ts'

function notificationClient(tableHandlers = {}) {
  const inserts = []
  const calls = []

  function queryFor(table) {
    const handlers = tableHandlers[table] ?? {}
    const query = {
      select(columns) {
        calls.push([table, 'select', columns])
        return query
      },
      eq(column, value) {
        calls.push([table, 'eq', column, value])
        return query
      },
      insert(row) {
        calls.push([table, 'insert', row])
        inserts.push(row)
        return Promise.resolve(handlers.insert ?? { error: null })
      },
      delete() {
        calls.push([table, 'delete'])
        return query
      },
      lt(column, value) {
        calls.push([table, 'lt', column, value])
        return Promise.resolve(handlers.deleteLt ?? { error: null })
      },
      single() {
        calls.push([table, 'single'])
        return Promise.resolve(handlers.single ?? { data: null, error: null })
      },
      maybeSingle() {
        calls.push([table, 'maybeSingle'])
        return Promise.resolve(handlers.maybeSingle ?? { data: null, error: null })
      },
    }
    return query
  }

  return {
    inserts,
    calls,
    client: {
      from(table) {
        calls.push([table, 'from'])
        return queryFor(table)
      },
    },
  }
}

describe('createAdminNotification', () => {
  it('inserts kind, payload, and a null source id by default', async () => {
    const supabase = notificationClient({
      admin_notifications: { insert: { error: null } },
    })
    await createAdminNotification(supabase.client, {
      kind: 'contact',
      payload: { email: 'a@x.gr', message: 'Γεια' },
    })
    assert.deepEqual(supabase.inserts, [{
      kind: 'contact',
      payload: { email: 'a@x.gr', message: 'Γεια' },
      source_id: null,
    }])
  })

  it('stores sourceId as source_id', async () => {
    const supabase = notificationClient({
      admin_notifications: { insert: { error: null } },
    })
    await createAdminNotification(supabase.client, {
      kind: 'purchase',
      sourceId: 'p1',
      payload: { purchase_id: 'p1' },
    })
    assert.equal(supabase.inserts[0].source_id, 'p1')
  })

  it('ignores unique violations', async () => {
    const supabase = notificationClient({
      admin_notifications: { insert: { error: { code: '23505', message: 'duplicate' } } },
    })
    await createAdminNotification(supabase.client, {
      kind: 'purchase',
      sourceId: 'p1',
      payload: {},
    })
  })

  it('logs other insert errors without throwing', async () => {
    const original = console.error
    const logs = []
    console.error = (...args) => logs.push(args)
    try {
      const supabase = notificationClient({
        admin_notifications: { insert: { error: { code: 'XX000', message: 'insert failed' } } },
      })
      await createAdminNotification(supabase.client, {
        kind: 'purchase',
        payload: {},
      })
      assert.deepEqual(logs, [['[createAdminNotification]', 'insert failed']])
    } finally {
      console.error = original
    }
  })
})

describe('cleanupOldAdminNotifications', () => {
  it('deletes rows older than about one calendar month', async () => {
    const supabase = notificationClient({
      admin_notifications: { deleteLt: { error: null } },
    })
    await cleanupOldAdminNotifications(supabase.client)
    const cutoff = supabase.calls.find((call) => call[1] === 'lt')?.[3]
    assert.match(cutoff, /^\d{4}-\d{2}-\d{2}T/)
    const cutoffMs = Date.parse(cutoff)
    const ageDays = (Date.now() - cutoffMs) / (1000 * 60 * 60 * 24)
    assert.ok(ageDays >= 28 && ageDays <= 31)
    assert.deepEqual(supabase.calls.filter((call) => call[1] === 'delete'), [
      ['admin_notifications', 'delete'],
    ])
  })

  it('logs delete errors without throwing', async () => {
    const original = console.error
    const logs = []
    console.error = (...args) => logs.push(args)
    try {
      const supabase = notificationClient({
        admin_notifications: { deleteLt: { error: { message: 'delete failed' } } },
      })
      await cleanupOldAdminNotifications(supabase.client)
      assert.deepEqual(logs, [['[cleanupOldAdminNotifications]', 'delete failed']])
    } finally {
      console.error = original
    }
  })
})

describe('notifyPurchaseCreated', () => {
  it('returns without inserting when the purchase row is missing', async () => {
    const supabase = notificationClient({
      purchases: { single: { data: null, error: { message: 'missing' } } },
    })
    const original = console.error
    const logs = []
    console.error = (...args) => logs.push(args)
    try {
      await notifyPurchaseCreated(supabase.client, 'p-missing')
      assert.equal(supabase.inserts.length, 0)
      assert.deepEqual(logs, [['[notifyPurchaseCreated]', 'missing']])
    } finally {
      console.error = original
    }
  })

  it('inserts a purchase notification with lesson and user details', async () => {
    const supabase = notificationClient({
      purchases: {
        single: { data: { id: 'p1', user_id: 'u1', lesson_id: 'l1' }, error: null },
      },
      lessons: { maybeSingle: { data: { title: 'Όμηρος' }, error: null } },
      users: { maybeSingle: { data: { name: 'Άννα', email: 'a@x.gr' }, error: null } },
      admin_notifications: { insert: { error: null } },
    })
    await notifyPurchaseCreated(supabase.client, 'p1')
    assert.deepEqual(supabase.inserts[0], {
      kind: 'purchase',
      source_id: 'p1',
      payload: {
        purchase_id: 'p1',
        lesson_id: 'l1',
        lesson_title: 'Όμηρος',
        user_id: 'u1',
        user_name: 'Άννα',
        user_email: 'a@x.gr',
      },
    })
  })
})

describe('notifyCommentCreated', () => {
  it('returns without inserting when the comment row is missing', async () => {
    const supabase = notificationClient({
      lesson_comments: { single: { data: null, error: null } },
    })
    await notifyCommentCreated(supabase.client, 'c-missing')
    assert.equal(supabase.inserts.length, 0)
  })

  it('inserts a comment notification with a full or trimmed excerpt', async () => {
    const longBody = `${'α'.repeat(201)}tail`
    const supabase = notificationClient({
      lesson_comments: {
        single: { data: { id: 'c1', user_id: 'u1', lesson_id: 'l1', body: longBody }, error: null },
      },
      lessons: { maybeSingle: { data: { title: 'Μάθημα' }, error: null } },
      users: { maybeSingle: { data: { name: 'Πέτρος', email: 'p@x.gr' }, error: null } },
      admin_notifications: { insert: { error: null } },
    })
    await notifyCommentCreated(supabase.client, 'c1')
    assert.equal(supabase.inserts[0].payload.excerpt, `${'α'.repeat(200)}…`)
    assert.equal(supabase.inserts[0].kind, 'comment')
    assert.equal(supabase.inserts[0].source_id, 'c1')

    const short = notificationClient({
      lesson_comments: {
        single: { data: { id: 'c2', user_id: 'u1', lesson_id: 'l1', body: 'Σύντομο' }, error: null },
      },
      lessons: { maybeSingle: { data: { title: 'Μάθημα' }, error: null } },
      users: { maybeSingle: { data: { name: null, email: 'p@x.gr' }, error: null } },
      admin_notifications: { insert: { error: null } },
    })
    await notifyCommentCreated(short.client, 'c2')
    assert.equal(short.inserts[0].payload.excerpt, 'Σύντομο')
  })
})

describe('notifyContactMessage', () => {
  it('inserts a contact notification with sanitized fields', async () => {
    const supabase = notificationClient({
      admin_notifications: { insert: { error: null } },
    })
    await notifyContactMessage(supabase.client, {
      email: 'a\r\n@x.gr',
      message: 'μ'.repeat(5000),
      name: 'ν'.repeat(200),
      phone: '',
      gradeName: '',
    })
    assert.deepEqual(supabase.inserts[0], {
      kind: 'contact',
      source_id: null,
      payload: {
        email: 'a@x.gr',
        message: 'μ'.repeat(4000),
        name: 'ν'.repeat(120),
        phone: undefined,
        gradeName: undefined,
      },
    })
  })
})

describe('notifyArticleLikeCreated', () => {
  it('returns without inserting when the like row is missing', async () => {
    const supabase = notificationClient({
      article_likes: { single: { data: null, error: null } },
    })
    await notifyArticleLikeCreated(supabase.client, 'like-missing')
    assert.equal(supabase.inserts.length, 0)
  })

  it('inserts an article like notification', async () => {
    const supabase = notificationClient({
      article_likes: {
        single: { data: { id: 'like1', user_id: 'u1', article_id: 'a1' }, error: null },
      },
      articles: { maybeSingle: { data: { title: 'Άρθρο' }, error: null } },
      users: { maybeSingle: { data: { name: 'Μαρία', email: 'm@x.gr' }, error: null } },
      admin_notifications: { insert: { error: null } },
    })
    await notifyArticleLikeCreated(supabase.client, 'like1')
    assert.deepEqual(supabase.inserts[0], {
      kind: 'article_like',
      source_id: 'like1',
      payload: {
        like_id: 'like1',
        article_id: 'a1',
        article_title: 'Άρθρο',
        user_id: 'u1',
        user_name: 'Μαρία',
        user_email: 'm@x.gr',
      },
    })
  })
})
