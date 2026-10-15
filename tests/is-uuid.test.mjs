import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { isUuid } from '../shared/utils/isUuid.mjs'

describe('isUuid', () => {
  it('accepts a postgres-style uuid', () => {
    assert.equal(isUuid('550e8400-e29b-41d4-a716-446655440000'), true)
  })

  it('rejects slugs and empty values', () => {
    assert.equal(isUuid('dimiourgiki-mathisi'), false)
    assert.equal(isUuid(''), false)
    assert.equal(isUuid(null), false)
  })
})
