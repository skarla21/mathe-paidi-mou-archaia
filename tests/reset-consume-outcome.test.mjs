import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { resetConsumeOutcome } from '../server/utils/resetConsumeOutcome.ts'

const expired = 'Αυτός ο σύνδεσμος δεν είναι έγκυρος ή έχει λήξει.'

describe('resetConsumeOutcome', () => {
  it('returns a trimmed email when the reset stored one', () => {
    assert.deepEqual(resetConsumeOutcome('  student@example.com  '), {
      ok: true,
      email: 'student@example.com',
      log: null,
    })
  })

  it('keeps a stored password usable when the email is blank or the old function returned true', () => {
    assert.deepEqual(resetConsumeOutcome('   '), {
      ok: true,
      email: null,
      log: 'consume_password_reset returned an empty email',
    })
    assert.deepEqual(resetConsumeOutcome(true), {
      ok: true,
      email: null,
      log: null,
    })
  })

  it('rejects a dead link', () => {
    for (const consumed of [false, null]) {
      assert.deepEqual(resetConsumeOutcome(consumed), {
        ok: false,
        statusCode: 400,
        message: expired,
        log: null,
      })
    }
  })

  it('fails closed on an unexpected value', () => {
    assert.deepEqual(resetConsumeOutcome(1), {
      ok: false,
      statusCode: 500,
      message: 'Κάτι πήγε στραβά',
      log: 'consume_password_reset returned an unexpected value',
    })
  })
})
