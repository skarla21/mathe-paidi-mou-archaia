import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { throwIfMissing } from '../app/utils/missingContent.ts'

globalThis.createError = (error) => Object.assign(new Error(error.statusMessage), error)

describe('throwIfMissing', () => {
  it('returns when the row is present and the query succeeded', () => {
    assert.equal(throwIfMissing(null, false), undefined)
    assert.equal(throwIfMissing(undefined, false), undefined)
  })

  it('reports a missing row as not found', () => {
    assert.throws(
      () => throwIfMissing(null, true),
      (error) => error.statusCode === 404 && error.statusMessage === 'Δεν βρέθηκε' && error.fatal === true,
    )
    assert.throws(
      () => throwIfMissing({ statusCode: 404 }, false),
      (error) => error.statusCode === 404,
    )
  })

  it('keeps a server failure as a server failure', () => {
    assert.throws(
      () => throwIfMissing({ statusCode: 503 }, true),
      (error) => error.statusCode === 503 && error.statusMessage === 'Κάτι πήγε στραβά' && error.fatal === true,
    )
  })
})
