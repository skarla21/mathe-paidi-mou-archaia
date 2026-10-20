import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { describe, it } from 'node:test'
import { hashPassword, verifyPassword } from '../server/utils/password.ts'
import { hashToken } from '../server/utils/tokenHash.ts'

describe('password', () => {
  it('accepts the plain text that was hashed', async () => {
    const hash = await hashPassword('σωστός-κωδικός')
    assert.equal(await verifyPassword('σωστός-κωδικός', hash), true)
    assert.equal(await verifyPassword('άλλος', hash), false)
  })

  it('rejects a missing hash', async () => {
    assert.equal(await verifyPassword('σωστός-κωδικός', null), false)
    assert.equal(await verifyPassword('σωστός-κωδικός', undefined), false)
  })
})

describe('hashToken', () => {
  it('returns a stable sha256 hex digest', () => {
    const token = 'reset-token'
    const expected = createHash('sha256').update(token).digest('hex')
    assert.equal(hashToken(token), expected)
    assert.equal(hashToken(token), hashToken(token))
    assert.notEqual(hashToken(token), hashToken('other-token'))
  })
})
