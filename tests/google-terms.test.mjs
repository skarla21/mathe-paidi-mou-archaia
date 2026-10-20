import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { describe, it } from 'node:test'
import { googleAccountLinkUpdate } from '../server/utils/googleAccountLink.ts'
import {
  googleTermsAcceptedAt,
  googleTermsClearCookie,
  googleTermsCsrfOk,
  googleTermsUseSecureCookie,
  signGoogleTerms,
} from '../server/utils/googleTerms.ts'
import { googleAuthErrorMessage, takeGoogleAuthError } from '../shared/utils/googleAuthError.mjs'

const now = Date.parse('2026-10-20T12:00:00.000Z')
const secret = 'test-secret'

function csrfCookie(token, csrfSecret = secret) {
  const hash = createHash('sha256').update(`${token}${csrfSecret}`).digest('hex')
  return `${token}|${hash}`
}

describe('googleTermsUseSecureCookie', () => {
  it('marks the cookie secure only on https', () => {
    assert.equal(googleTermsUseSecureCookie('https:'), true)
    assert.equal(googleTermsUseSecureCookie('http:'), false)
  })
})

describe('google terms cookie', () => {
  it('accepts a signed timestamp from the last 15 minutes', () => {
    const acceptedAt = new Date(now - 60_000).toISOString()
    assert.equal(googleTermsAcceptedAt(signGoogleTerms(acceptedAt, secret), secret, now), acceptedAt)
  })

  it('rejects a missing, unsigned, tampered, future, or expired timestamp', () => {
    const acceptedAt = new Date(now - 60_000).toISOString()
    assert.equal(googleTermsAcceptedAt(null, secret, now), null)
    assert.equal(googleTermsAcceptedAt(acceptedAt, secret, now), null)
    assert.equal(googleTermsAcceptedAt(signGoogleTerms(acceptedAt, secret), '', now), null)
    assert.equal(googleTermsAcceptedAt(signGoogleTerms(acceptedAt, 'other'), secret, now), null)
    const signed = signGoogleTerms(acceptedAt, secret)
    assert.equal(googleTermsAcceptedAt(`${signed}x`, secret, now), null)
    assert.equal(googleTermsAcceptedAt(signGoogleTerms(new Date(now + 1_000).toISOString(), secret), secret, now), null)
    assert.equal(
      googleTermsAcceptedAt(signGoogleTerms(new Date(now - 15 * 60 * 1000 - 1).toISOString(), secret), secret, now),
      null,
    )
  })

  it('accepts the Auth.js csrf cookie only with the matching body token', () => {
    const token = 'a'.repeat(64)
    const cookie = csrfCookie(token)
    assert.equal(googleTermsCsrfOk(cookie, token, secret), true)
    assert.equal(googleTermsCsrfOk(cookie, 'b'.repeat(64), secret), false)
    assert.equal(googleTermsCsrfOk(csrfCookie(token, 'other'), token, secret), false)
    assert.equal(googleTermsCsrfOk(cookie, token, ''), false)
    assert.equal(googleTermsCsrfOk(undefined, token, secret), false)
  })

  it('clears the terms cookie on the callback', () => {
    assert.match(googleTermsClearCookie(true), /^google_terms_accepted=; Path=\/; Max-Age=0; HttpOnly; SameSite=Lax; Secure$/)
    assert.doesNotMatch(googleTermsClearCookie(false), /Secure/)
  })
})

describe('google account link', () => {
  it('keeps the password on a verified address and clears it on an unverified one', () => {
    assert.deepEqual(googleAccountLinkUpdate(true), { email_verified: true })
    assert.deepEqual(googleAccountLinkUpdate(false), { email_verified: true, password_hash: null })
  })
})

describe('google auth errors', () => {
  it('uses a specific sentence for cancel and an unverified address', () => {
    assert.equal(googleAuthErrorMessage('OAuthCallbackError'), 'Η σύνδεση με Google ακυρώθηκε')
    assert.equal(googleAuthErrorMessage('UnverifiedEmail'), 'Το email της Google δεν είναι επαληθευμένο')
    assert.equal(googleAuthErrorMessage('AccessDenied'), 'Η σύνδεση με Google δεν ήταν δυνατή')
    assert.equal(googleAuthErrorMessage('Configuration'), 'Η σύνδεση με Google δεν ήταν δυνατή')
    assert.equal(
      googleAuthErrorMessage('TermsRequired'),
      'Αποδέξου τους όρους χρήσης για να εγγραφείς με Google',
    )
  })

  it('toasts again when the same error happens on a later attempt', () => {
    const first = takeGoogleAuthError(null, 'OAuthCallbackError')
    assert.equal(first.toast, true)
    const repeat = takeGoogleAuthError(first.handled, 'OAuthCallbackError')
    assert.equal(repeat.toast, false)
    const cleared = takeGoogleAuthError(repeat.handled, undefined)
    assert.equal(cleared.handled, null)
    const again = takeGoogleAuthError(cleared.handled, 'OAuthCallbackError')
    assert.equal(again.toast, true)
  })
})
