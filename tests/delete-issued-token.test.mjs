import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { deleteIssuedToken } from '../server/utils/deleteIssuedToken.ts'

function fakeSupabase({ deleteError = null } = {}) {
  const calls = []
  const client = {
    from(table) {
      return {
        delete() {
          return {
            eq(column, value) {
              calls.push({ table, column, value })
              return Promise.resolve({ error: deleteError })
            },
          }
        },
      }
    },
  }
  return { client, calls }
}

describe('deleteIssuedToken', () => {
  it('deletes the row by token_hash on the given table', async () => {
    const { client, calls } = fakeSupabase()
    await deleteIssuedToken(client, 'password_reset_tokens', 'abc-hash', '[test]')
    assert.deepEqual(calls, [{
      table: 'password_reset_tokens',
      column: 'token_hash',
      value: 'abc-hash',
    }])

    const verification = fakeSupabase()
    await deleteIssuedToken(verification.client, 'verification_tokens', 'def-hash', '[verify]')
    assert.deepEqual(verification.calls, [{
      table: 'verification_tokens',
      column: 'token_hash',
      value: 'def-hash',
    }])
  })

  it('logs a delete error and resolves without throwing', async () => {
    const errors = []
    const original = console.error
    console.error = (...args) => { errors.push(args.map(String).join(' ')) }
    try {
      const { client } = fakeSupabase({ deleteError: { message: 'db down' } })
      await deleteIssuedToken(client, 'password_reset_tokens', 'hash', '[rollback]')
      assert.equal(errors.some((line) => line.includes('[rollback]') && line.includes('db down')), true)
    } finally {
      console.error = original
    }
  })
})
