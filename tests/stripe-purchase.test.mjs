import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'
import { applyCompletedCheckout, metadataTime } from '../server/utils/stripePurchase.ts'

function checkoutClient(handlers) {
  const calls = []
  return {
    calls,
    client: {
      from(table) {
        const state = { table, filters: [] }
        const query = {
          select() {
            return query
          },
          eq(column, value) {
            state.filters.push([column, value])
            return query
          },
          insert(row) {
            calls.push(['insert', table, row])
            return query
          },
          maybeSingle() {
            calls.push(['maybe', table, state.filters])
            return Promise.resolve(handlers.maybe(table, state.filters))
          },
          single() {
            calls.push(['single', table])
            return Promise.resolve(handlers.single(table))
          },
        }
        return query
      },
    },
  }
}

const session = {
  id: 'cs_1',
  mode: 'payment',
  client_reference_id: null,
  metadata: {
    userId: 'user-1',
    lessonId: 'lesson-1',
    termsAcceptedAt: '2026-10-20T12:00:00.000Z',
    immediateAccessAcceptedAt: 'not-a-date',
  },
}

describe('metadataTime', () => {
  it('keeps a real timestamp and drops a blank or broken one', () => {
    assert.equal(metadataTime(undefined), null)
    assert.equal(metadataTime(''), null)
    assert.equal(metadataTime('not-a-date'), null)
    assert.equal(metadataTime('2026-10-20T12:00:00.000Z'), '2026-10-20T12:00:00.000Z')
  })
})

describe('applyCompletedCheckout', () => {
  it('ignores a session that is not a payment', async () => {
    let called = false
    const supabase = { from() { called = true } }
    const result = await applyCompletedCheckout(supabase, { id: 'cs_2', mode: 'subscription' })
    assert.deepEqual(result, { received: true })
    assert.equal(called, false)
  })

  it('rejects a session without a user or a lesson', async () => {
    const supabase = { from() { throw new Error('queried') } }
    await assert.rejects(
      () => applyCompletedCheckout(supabase, { id: 'cs_3', mode: 'payment', metadata: { lessonId: 'lesson-1' } }),
      (error) => error.statusCode === 400 && error.message === 'Missing metadata',
    )
    await assert.rejects(
      () => applyCompletedCheckout(supabase, {
        id: 'cs_4',
        mode: 'payment',
        client_reference_id: 'user-9',
        metadata: {},
      }),
      (error) => error.statusCode === 400 && error.message === 'Missing metadata',
    )
  })

  it('uses the client reference when metadata has no user id', async () => {
    const supabase = checkoutClient({
      maybe: () => ({ data: { id: 'purchase-1' }, error: null }),
      single: () => ({ data: null, error: null }),
    })
    const result = await applyCompletedCheckout(supabase.client, {
      id: 'cs_5',
      mode: 'payment',
      client_reference_id: 'user-9',
      metadata: { lessonId: 'lesson-1' },
    })
    assert.deepEqual(result, { received: true })
    assert.equal(supabase.calls.some((call) => call[0] === 'insert'), false)
  })

  it('bookmarks an existing purchase and does not insert again', async () => {
    const supabase = checkoutClient({
      maybe: (table) => (table === 'purchases'
        ? { data: { id: 'purchase-1' }, error: null }
        : { data: null, error: null }),
      single: () => ({ data: null, error: null }),
    })
    const result = await applyCompletedCheckout(supabase.client, session)
    assert.deepEqual(result, { received: true })
    assert.equal(supabase.calls.some((call) => call[0] === 'insert' && call[1] === 'purchases'), false)
    assert.equal(supabase.calls.some((call) => call[1] === 'lesson_bookmarks'), true)
  })

  it('rejects an unknown lesson', async () => {
    const original = console.error
    console.error = () => {}
    const supabase = checkoutClient({
      maybe: (table) => ({ data: table === 'lessons' ? null : null, error: null }),
      single: () => ({ data: null, error: null }),
    })
    await assert.rejects(
      () => applyCompletedCheckout(supabase.client, session),
      (error) => error.statusCode === 400 && error.message === 'Lesson not found',
    )
    assert.equal(supabase.calls.some((call) => call[0] === 'insert'), false)
    console.error = original
  })

  it('records the purchase, notifies, and bookmarks', async () => {
    const supabase = checkoutClient({
      maybe: (table) => {
        if (table === 'purchases') return { data: null, error: null }
        if (table === 'lessons') return { data: { id: 'lesson-1' }, error: null }
        if (table === 'lesson_bookmarks') return { data: { id: 'b1' }, error: null }
        return { data: null, error: null }
      },
      single: (table) => {
        if (table === 'purchases') return { data: { id: 'purchase-9' }, error: null }
        if (table === 'admin_notifications') return { error: null }
        return { data: { id: 'row', title: 'Μάθημα' }, error: null }
      },
    })
    const result = await applyCompletedCheckout(supabase.client, session)
    assert.deepEqual(result, { received: true })
    const inserted = supabase.calls.find((call) => call[0] === 'insert' && call[1] === 'purchases')
    assert.equal(inserted[2].user_id, 'user-1')
    assert.equal(inserted[2].lesson_id, 'lesson-1')
    assert.equal(inserted[2].stripe_session_id, 'cs_1')
    assert.equal(inserted[2].terms_accepted_at, '2026-10-20T12:00:00.000Z')
    assert.equal(inserted[2].immediate_access_accepted_at, null)
    assert.equal(
      supabase.calls.some((call) => call[0] === 'insert' && call[1] === 'admin_notifications'),
      true,
    )
  })

  it('does not notify when the purchase insert fails', async () => {
    const original = console.error
    console.error = () => {}
    const supabase = checkoutClient({
      maybe: (table) => (table === 'lessons'
        ? { data: { id: 'lesson-1' }, error: null }
        : { data: null, error: null }),
      single: () => ({ data: null, error: { message: 'down' } }),
    })
    await assert.rejects(
      () => applyCompletedCheckout(supabase.client, session),
      (error) => error.statusCode === 500 && error.message === 'Failed to record purchase',
    )
    assert.equal(
      supabase.calls.some((call) => call[1] === 'admin_notifications'),
      false,
    )
    console.error = original
  })
})

describe('stripe webhook wiring', () => {
  it('verifies the signature and then records the checkout', () => {
    const source = readFileSync(new URL('../server/api/stripe/webhook.post.ts', import.meta.url), 'utf8')
    assert.match(source, /constructEvent/)
    assert.match(source, /applyCompletedCheckout/)
  })
})
