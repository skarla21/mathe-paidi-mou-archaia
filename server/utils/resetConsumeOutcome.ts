const EXPIRED = 'Αυτός ο σύνδεσμος δεν είναι έγκυρος ή έχει λήξει.'
const GENERIC = 'Κάτι πήγε στραβά'

export type ResetConsumeOutcome =
  | { ok: true; email: string | null; log: string | null }
  | { ok: false; statusCode: 400 | 500; message: string; log: string | null }

export function resetConsumeOutcome(consumed: unknown): ResetConsumeOutcome {
  if (typeof consumed === 'string') {
    const email = consumed.trim()
    if (email.length > 0) return { ok: true, email, log: null }
    return {
      ok: true,
      email: null,
      log: 'consume_password_reset returned an empty email',
    }
  }

  if (consumed === true) return { ok: true, email: null, log: null }

  if (consumed === false || consumed === null) {
    return { ok: false, statusCode: 400, message: EXPIRED, log: null }
  }

  return {
    ok: false,
    statusCode: 500,
    message: GENERIC,
    log: 'consume_password_reset returned an unexpected value',
  }
}
