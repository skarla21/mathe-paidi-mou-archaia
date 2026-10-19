import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { authDialogQuery } from '../shared/utils/authDialogQuery.mjs'

describe('authDialogQuery', () => {
  it('opens the login or register dialog from the redirect query', () => {
    assert.equal(authDialogQuery('login'), 'login')
    assert.equal(authDialogQuery('register'), 'register')
  })

  it('ignores any other query value', () => {
    assert.equal(authDialogQuery('forgot'), null)
    assert.equal(authDialogQuery(['login']), null)
    assert.equal(authDialogQuery(undefined), null)
  })
})
