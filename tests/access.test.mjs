import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { lessonAccessDecision } from '../server/utils/access.ts'
import { verifiedEmailDecision } from '../server/utils/requireVerifiedEmail.ts'

globalThis.createError = (error) => Object.assign(new Error(error.message), error)

const lesson = {
  id: 'lesson-1',
  title: 'Οδύσσεια',
  is_free: false,
  price: 1200,
  content_url: 'lesson-content/notes.pdf',
}

describe('lessonAccessDecision', () => {
  it('hides a missing lesson', () => {
    assert.deepEqual(
      lessonAccessDecision({
        lesson: null,
        hasPurchase: true,
        userId: 'user-1',
        emailVerified: true,
      }),
      { allowed: false, canAccessContent: false },
    )
  })

  it('lets a guest see a free lesson without the file', () => {
    const result = lessonAccessDecision({
      lesson: { ...lesson, is_free: true },
      hasPurchase: false,
      userId: null,
      emailVerified: false,
    })
    assert.equal(result.allowed, true)
    assert.equal(result.canAccessContent, false)
    assert.equal(result.content_url, null)
    assert.equal(result.lesson?.id, 'lesson-1')
  })

  it('keeps the file hidden until the email is verified', () => {
    const result = lessonAccessDecision({
      lesson: { ...lesson, is_free: true },
      hasPurchase: false,
      userId: 'user-1',
      emailVerified: false,
    })
    assert.equal(result.allowed, true)
    assert.equal(result.canAccessContent, false)
    assert.equal(result.content_url, null)
  })

  it('opens a free lesson for a verified user', () => {
    const result = lessonAccessDecision({
      lesson: { ...lesson, is_free: true },
      hasPurchase: false,
      userId: 'user-1',
      emailVerified: true,
    })
    assert.equal(result.canAccessContent, true)
    assert.equal(result.content_url, 'lesson-content/notes.pdf')
  })

  it('returns a paid lesson without access when there is no purchase', () => {
    const result = lessonAccessDecision({
      lesson,
      hasPurchase: false,
      userId: 'user-1',
      emailVerified: true,
    })
    assert.equal(result.allowed, false)
    assert.equal(result.canAccessContent, false)
    assert.equal(result.content_url, null)
    assert.equal(result.lesson?.title, 'Οδύσσεια')
  })

  it('opens a purchased lesson for a verified user', () => {
    const result = lessonAccessDecision({
      lesson,
      hasPurchase: true,
      userId: 'user-1',
      emailVerified: true,
    })
    assert.equal(result.allowed, true)
    assert.equal(result.canAccessContent, true)
    assert.equal(result.content_url, 'lesson-content/notes.pdf')
  })

  it('does not open content for a guest even when a purchase flag is set', () => {
    const result = lessonAccessDecision({
      lesson,
      hasPurchase: true,
      userId: null,
      emailVerified: true,
    })
    assert.equal(result.canAccessContent, false)
    assert.equal(result.content_url, null)
  })
})

describe('verifiedEmailDecision', () => {
  it('returns the user id when the address is verified', () => {
    assert.equal(verifiedEmailDecision('user-1', { email_verified: true }, null), 'user-1')
  })

  it('refuses a missing or unverified row', () => {
    assert.throws(
      () => verifiedEmailDecision('user-1', null, null),
      (error) => error.statusCode === 403 && error.message === 'Email μη επαληθευμένο',
    )
    assert.throws(
      () => verifiedEmailDecision('user-1', { email_verified: false }, null),
      (error) => error.statusCode === 403,
    )
  })

  it('reports a lookup failure', () => {
    const original = console.error
    console.error = () => {}
    try {
      assert.throws(
        () => verifiedEmailDecision('user-1', null, { message: 'down' }),
        (error) => error.statusCode === 500 && error.message === 'Database operation failed',
      )
    } finally {
      console.error = original
    }
  })
})
