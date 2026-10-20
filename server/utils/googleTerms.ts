import { createHash, createHmac, timingSafeEqual } from 'node:crypto'

export const GOOGLE_TERMS_COOKIE = 'google_terms_accepted'
export const GOOGLE_TERMS_MAX_AGE_SECONDS = 15 * 60
export const AUTH_CSRF_COOKIE_NAMES = ['__Host-authjs.csrf-token', 'authjs.csrf-token'] as const

function sameText(left: string, right: string): boolean {
  const a = Buffer.from(left)
  const b = Buffer.from(right)
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}

export function googleTermsUseSecureCookie(protocol: string): boolean {
  return protocol === 'https:'
}

export function signGoogleTerms(acceptedAt: string, secret: string): string {
  const sig = createHmac('sha256', secret).update(acceptedAt).digest('base64url')
  return `${acceptedAt}|${sig}`
}

export function googleTermsAcceptedAt(
  value: string | undefined | null,
  secret: string,
  now = Date.now(),
): string | null {
  if (!value || !secret) return null
  const splitAt = value.lastIndexOf('|')
  if (splitAt <= 0) return null
  const acceptedAt = value.slice(0, splitAt)
  const sig = value.slice(splitAt + 1)
  const expected = createHmac('sha256', secret).update(acceptedAt).digest('base64url')
  if (!sameText(sig, expected)) return null
  const time = Date.parse(acceptedAt)
  if (!Number.isFinite(time)) return null
  const age = now - time
  if (age < 0 || age > GOOGLE_TERMS_MAX_AGE_SECONDS * 1000) return null
  return new Date(time).toISOString()
}

export function googleTermsCsrfOk(
  cookieValue: string | undefined | null,
  bodyToken: unknown,
  secret: string,
): boolean {
  if (!secret || typeof cookieValue !== 'string' || typeof bodyToken !== 'string') return false
  if (!/^[a-f0-9]{64}$/.test(bodyToken)) return false
  const splitAt = cookieValue.indexOf('|')
  if (splitAt <= 0 || cookieValue.indexOf('|', splitAt + 1) !== -1) return false
  const token = cookieValue.slice(0, splitAt)
  const hash = cookieValue.slice(splitAt + 1)
  if (token !== bodyToken || !/^[a-f0-9]{64}$/.test(hash)) return false
  const expected = createHash('sha256').update(`${token}${secret}`).digest('hex')
  return sameText(hash, expected)
}

export function googleTermsClearCookie(secure: boolean): string {
  const parts = [
    `${GOOGLE_TERMS_COOKIE}=`,
    'Path=/',
    'Max-Age=0',
    'HttpOnly',
    'SameSite=Lax',
  ]
  if (secure) parts.push('Secure')
  return parts.join('; ')
}
