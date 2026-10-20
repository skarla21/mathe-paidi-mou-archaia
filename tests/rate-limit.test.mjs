import assert from 'node:assert/strict'
import { afterEach, describe, it, mock } from 'node:test'
import { checkRateLimit } from '../server/utils/rateLimit.ts'

const LIMITED = 'Πάρα πολλές αιτήσεις. Παρακαλώ δοκίμασε ξανά αργότερα.'

function eventWith(headers) {
  return { node: { req: { headers } } }
}

afterEach(() => {
  mock.timers.reset()
})

describe('checkRateLimit', () => {
  it('allows the window and then rejects with the Greek message', () => {
    const event = eventWith({ 'x-real-ip': '203.0.113.5' })
    const options = { name: 'greek-default', maxRequests: 2, windowMs: 1_000 }
    checkRateLimit(event, options)
    checkRateLimit(event, options)
    assert.throws(
      () => checkRateLimit(event, options),
      (error) => error.statusCode === 429 && error.message === LIMITED,
    )
  })

  it('uses a custom message', () => {
    const event = eventWith({ 'x-real-ip': '203.0.113.6' })
    const options = { name: 'custom-message', maxRequests: 1, windowMs: 1_000, message: 'Περίμενε' }
    checkRateLimit(event, options)
    assert.throws(
      () => checkRateLimit(event, options),
      (error) => error.statusCode === 429 && error.message === 'Περίμενε',
    )
  })

  it('prefers x-real-ip over the forwarded list', () => {
    const options = { name: 'real-ip', maxRequests: 1, windowMs: 1_000 }
    checkRateLimit(eventWith({
      'x-real-ip': '203.0.113.7',
      'x-forwarded-for': '1.1.1.1, 9.9.9.9',
    }), options)
    assert.throws(
      () => checkRateLimit(eventWith({
        'x-real-ip': '203.0.113.7',
        'x-forwarded-for': '8.8.8.8',
      }), options),
      (error) => error.statusCode === 429,
    )
    checkRateLimit(eventWith({ 'x-forwarded-for': '1.1.1.1, 9.9.9.9' }), options)
  })

  it('keys the last forwarded hop so a spoofed first hop stays separate', () => {
    const options = { name: 'forwarded-last', maxRequests: 1, windowMs: 1_000 }
    checkRateLimit(eventWith({ 'x-forwarded-for': '1.1.1.1, 2.2.2.2' }), options)
    checkRateLimit(eventWith({ 'x-forwarded-for': '9.9.9.9, 3.3.3.3' }), options)
    assert.throws(
      () => checkRateLimit(eventWith({ 'x-forwarded-for': '8.8.8.8, 2.2.2.2' }), options),
      (error) => error.statusCode === 429,
    )
  })

  it('shares one bucket when no address is present', () => {
    const options = { name: 'unknown-ip', maxRequests: 1, windowMs: 1_000 }
    checkRateLimit(eventWith({}), options)
    assert.throws(
      () => checkRateLimit(eventWith({}), options),
      (error) => error.statusCode === 429,
    )
  })

  it('allows the same address again after the window', () => {
    mock.timers.enable({ apis: ['Date'], now: 1_000 })
    const event = eventWith({ 'x-real-ip': '203.0.113.8' })
    const options = { name: 'window-reset', maxRequests: 1, windowMs: 1_000 }
    checkRateLimit(event, options)
    assert.throws(() => checkRateLimit(event, options), (error) => error.statusCode === 429)
    mock.timers.tick(1_001)
    checkRateLimit(event, options)
  })
})
