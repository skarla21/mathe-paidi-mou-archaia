import { serverSupabaseService } from '../../utils/supabaseServer'
import { hashToken } from '../../utils/tokenHash'
import { hashPassword } from '../../utils/password'
import { checkRateLimit } from '../../utils/rateLimit'
import { PASSWORD_MIN_LENGTH } from '../../utils/validation'
import { resetConsumeOutcome } from '../../utils/resetConsumeOutcome'

export default defineEventHandler(async (event) => {
  checkRateLimit(event, {
    name: 'reset-password',
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
    message: 'Πάρα πολλές αιτήσεις. Παρακαλώ δοκίμασε ξανά αργότερα.',
  })

  const body = await readBody<{ token?: string; newPassword?: string }>(event)
  const token = body.token
  const newPassword = body.newPassword

  if (!token || !newPassword || newPassword.length < PASSWORD_MIN_LENGTH) {
    throw createError({
      statusCode: 400,
      message: 'Απαιτούνται σύνδεσμος και κωδικός (τουλάχιστον 8 χαρακτήρες).',
    })
  }

  const tokenHash = hashToken(token)
  const supabase = serverSupabaseService()

  const { data: active, error: lookupError } = await supabase.rpc('password_reset_token_active', {
    p_token_hash: tokenHash,
  })

  if (lookupError) {
    console.error('[reset-password]', lookupError.message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }

  if (active === false) {
    throw createError({ statusCode: 400, message: 'Αυτός ο σύνδεσμος δεν είναι έγκυρος ή έχει λήξει.' })
  }

  if (active !== true) {
    console.error('[reset-password]', 'password_reset_token_active returned no boolean')
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }

  const passwordHash = await hashPassword(newPassword)

  const { data: consumed, error } = await supabase.rpc('consume_password_reset', {
    p_token_hash: tokenHash,
    p_password_hash: passwordHash,
  })

  if (error) {
    console.error('[reset-password]', error.message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }

  const outcome = resetConsumeOutcome(consumed)
  if (outcome.log) console.error('[reset-password]', outcome.log)
  if (!outcome.ok) {
    throw createError({ statusCode: outcome.statusCode, message: outcome.message })
  }

  return { ok: true as const, email: outcome.email }
})
