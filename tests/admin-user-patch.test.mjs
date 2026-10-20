import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

const source = readFileSync(new URL('../server/api/admin/users/[id].patch.ts', import.meta.url), 'utf8')

describe('PATCH /api/admin/users/:id', () => {
  it('returns the updated user without password_hash', () => {
    assert.match(source, /\.select\('id, email, name, avatar_url, "isAdmin", email_verified, provider, terms_accepted_at, created_at'\)/)
    assert.doesNotMatch(source, /password_hash/)
    assert.doesNotMatch(source, /\.select\(\)/)
  })
})
