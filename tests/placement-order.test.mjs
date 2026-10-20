import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  placementRowsForCreate,
  placementRowsForUpdate,
} from '../server/utils/placementOrder.ts'

function placementSupabase(responses) {
  const calls = []
  let callIndex = 0
  const client = {
    from(table) {
      assert.equal(table, 'lesson_placements')
      return {
        select(columns) {
          assert.equal(columns, 'order')
          return {
            eq(column, id) {
              calls.push({ column, id })
              const scripted = responses[callIndex]
              callIndex += 1
              if (scripted instanceof Error || (scripted && scripted.message && scripted === responses[callIndex - 1] && !('data' in scripted))) {
                // handled below via throw path
              }
              return {
                order(col, options) {
                  assert.equal(col, 'order')
                  assert.deepEqual(options, { ascending: false })
                  return {
                    limit(n) {
                      assert.equal(n, 1)
                      const result = responses[callIndex - 1]
                      if (result instanceof Error) {
                        return Promise.reject(result)
                      }
                      if (result && result.throw) {
                        return Promise.resolve({ data: null, error: result.throw })
                      }
                      return Promise.resolve(result)
                    },
                  }
                },
              }
            },
          }
        },
      }
    },
  }
  return { client, calls }
}

describe('placementRowsForCreate', () => {
  it('uses subject_id as the parent when all parent ids are set', async () => {
    const { client, calls } = placementSupabase([{ data: [], error: null }])
    const rows = await placementRowsForCreate(client, 'lesson-1', [{
      subject_id: 'sub-1',
      chapter_id: 'ch-1',
      category_id: 'cat-1',
    }])
    assert.deepEqual(calls, [{ column: 'subject_id', id: 'sub-1' }])
    assert.deepEqual(rows, [{
      lesson_id: 'lesson-1',
      subject_id: 'sub-1',
      chapter_id: 'ch-1',
      category_id: 'cat-1',
      order: 0,
    }])
  })

  it('starts at order 0 when the parent has no placements yet', async () => {
    const { client } = placementSupabase([{ data: [], error: null }])
    const rows = await placementRowsForCreate(client, 'lesson-1', [{ subject_id: 'sub-1' }])
    assert.equal(rows[0].order, 0)
  })

  it('assigns consecutive orders for the same parent without querying again', async () => {
    const { client, calls } = placementSupabase([{ data: [{ order: 2 }], error: null }])
    const rows = await placementRowsForCreate(client, 'lesson-1', [
      { subject_id: 'sub-1' },
      { subject_id: 'sub-1' },
    ])
    assert.equal(calls.length, 1)
    assert.deepEqual(rows.map((row) => row.order), [3, 4])
  })

  it('rethrows a query error without wrapping it', async () => {
    const dbError = { message: 'db down', code: 'XX000' }
    const { client } = placementSupabase([{ throw: dbError }])
    await assert.rejects(
      () => placementRowsForCreate(client, 'lesson-1', [{ subject_id: 'sub-1' }]),
      (error) => error === dbError,
    )
  })
})

describe('placementRowsForUpdate', () => {
  it('keeps the existing order for a matching parent and skips supabase', async () => {
    const client = {
      from() {
        throw new Error('should not query')
      },
    }
    const rows = await placementRowsForUpdate(
      client,
      'lesson-1',
      [{ subject_id: 'sub-1' }],
      [{ subject_id: 'sub-1', order: 7 }],
    )
    assert.deepEqual(rows, [{
      lesson_id: 'lesson-1',
      subject_id: 'sub-1',
      chapter_id: null,
      category_id: null,
      order: 7,
    }])
  })

  it('matches an existing parent by chapter_id or category_id', async () => {
    const client = { from() { throw new Error('should not query') } }
    const byChapter = await placementRowsForUpdate(
      client,
      'lesson-1',
      [{ chapter_id: 'ch-1' }],
      [{ chapter_id: 'ch-1', order: 4 }],
    )
    assert.equal(byChapter[0].order, 4)

    const byCategory = await placementRowsForUpdate(
      client,
      'lesson-1',
      [{ category_id: 'cat-1' }],
      [{ category_id: 'cat-1', order: 9 }],
    )
    assert.equal(byCategory[0].order, 9)
  })

  it('appends after the current max when the parent is new', async () => {
    const { client } = placementSupabase([{ data: [{ order: 5 }], error: null }])
    const rows = await placementRowsForUpdate(
      client,
      'lesson-1',
      [{ subject_id: 'sub-new' }],
      [{ subject_id: 'sub-old', order: 2 }],
    )
    assert.equal(rows[0].order, 6)
  })
})
