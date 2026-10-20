import {
  AUTH_CSRF_COOKIE_NAMES,
  GOOGLE_TERMS_COOKIE,
  GOOGLE_TERMS_MAX_AGE_SECONDS,
  googleTermsCsrfOk,
  googleTermsUseSecureCookie,
  signGoogleTerms,
} from "../utils/googleTerms"

export default defineEventHandler(async (event) => {
  const secret = String(useRuntimeConfig().authSecret || "")
  const body = await readBody<{ csrfToken?: unknown }>(event).catch(() => null)
  const csrfCookie = AUTH_CSRF_COOKIE_NAMES.map((name) => getCookie(event, name)).find((value) => value)
  if (!googleTermsCsrfOk(csrfCookie, body?.csrfToken, secret)) {
    throw createError({ statusCode: 403, message: "Η εγγραφή με Google δεν ήταν δυνατή" })
  }

  const acceptedAt = new Date().toISOString()
  setCookie(event, GOOGLE_TERMS_COOKIE, signGoogleTerms(acceptedAt, secret), {
    httpOnly: true,
    sameSite: "lax",
    secure: googleTermsUseSecureCookie(getRequestURL(event).protocol),
    path: "/",
    maxAge: GOOGLE_TERMS_MAX_AGE_SECONDS,
  })
  return { ok: true }
})
