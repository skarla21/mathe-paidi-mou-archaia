import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { requireAdmin } from '../server/utils/requireAdmin.ts'

globalThis.createError = (error) => Object.assign(new Error(error.message), error)
const { requireAuth } = await import('../server/utils/requireAuth.ts')

function event(auth) {
  return { context: { auth } }
}

describe('requireAuth', () => {
  it('throws when the session has no user id', () => {
    assert.throws(
      () => requireAuth(event({ userId: null, isAdmin: false })),
      (error) => error.statusCode === 401 && error.message === 'Authentication required',
    )
    assert.throws(
      () => requireAuth(event(undefined)),
      (error) => error.statusCode === 401 && error.message === 'Authentication required',
    )
  })

  it('returns the authenticated user id', () => {
    assert.equal(requireAuth(event({ userId: 'user-1', isAdmin: false })), 'user-1')
  })
})

describe('requireAdmin', () => {
  it('throws when the caller is not an admin', () => {
    assert.throws(
      () => requireAdmin(event({ userId: null, isAdmin: false })),
      (error) => error.statusCode === 403 && error.message === 'Admin access required',
    )
    assert.throws(
      () => requireAdmin(event({ userId: 'user-1', isAdmin: false })),
      (error) => error.statusCode === 403 && error.message === 'Admin access required',
    )
  })

  it('allows the owner admin through', () => {
    assert.equal(requireAdmin(event({ userId: 'admin-1', isAdmin: true })), undefined)
  })
})
