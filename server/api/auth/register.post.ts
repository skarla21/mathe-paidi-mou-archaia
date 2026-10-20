import { randomBytes } from 'node:crypto'
import { serverSupabaseService } from '../../utils/supabaseServer'
import { hashPassword } from '../../utils/password'
import { hashToken } from '../../utils/tokenHash'
import { deleteIssuedToken } from '../../utils/deleteIssuedToken'
import { sendVerificationEmail } from '../../utils/email'
import { checkRateLimit } from '../../utils/rateLimit'
import { EMAIL_REGEX, PASSWORD_MIN_LENGTH } from '../../utils/validation'

export default defineEventHandler(async (event) => {
  checkRateLimit(event, {
    name: 'register',
    maxRequests: 5,
    windowMs: 60 * 1000,
    message: 'Πάρα πολλές αιτήσεις. Παρακαλώ δοκίμασε ξανά αργότερα.',
  })

  const body = await readBody<{ email?: string; password?: string; name?: string; acceptTerms?: boolean }>(event)

  if (body?.acceptTerms !== true) {
    throw createError({ statusCode: 400, message: 'Αποδέξου τους όρους χρήσης για να συνεχίσεις' })
  }

  const name = body.name?.trim() ?? ''
  if (!body.email || !EMAIL_REGEX.test(body.email)) {
    throw createError({ statusCode: 400, message: 'Παρακαλώ εισάγετε έγκυρο email' })
  }

  if (!body.password || body.password.length < PASSWORD_MIN_LENGTH) {
    throw createError({ statusCode: 400, message: 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες' })
  }

  if (name.length < 2) {
    throw createError({ statusCode: 400, message: 'Το όνομα πρέπει να έχει τουλάχιστον 2 χαρακτήρες' })
  }

  const email = body.email.toLowerCase().trim()

  const supabase = serverSupabaseService()

  const { data: existing, error: existingError } = await supabase.from('users').select('id').eq('email', email).maybeSingle()
  if (existingError) {
    console.error('[register]', existingError.message)
    throw createError({ statusCode: 500, message: 'Η εγγραφή δεν ήταν δυνατή' })
  }
  if (existing) {
    // Return generic success to prevent user enumeration — do NOT reveal email is taken
    return { ok: true }
  }

  const password = body.password
  const passwordHash = await hashPassword(password)

  const rawToken = randomBytes(32).toString('hex')
  const tokenHash = hashToken(rawToken)
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

  const { data: userId, error: registerError } = await supabase.rpc('register_credentials_user', {
    p_email: email,
    p_password_hash: passwordHash,
    p_name: name,
    p_token_hash: tokenHash,
    p_expires_at: expiresAt,
    p_terms_accepted_at: new Date().toISOString(),
  })

  if (registerError) {
    console.error('[register]', registerError.message)
    throw createError({ statusCode: 500, message: 'Η εγγραφή δεν ήταν δυνατή' })
  }

  if (!userId) {
    return { ok: true }
  }

  const baseUrl = getRequestURL(event).origin
  const verifyLink = `${baseUrl}/api/auth/verify-email?token=${rawToken}`

  try {
    await sendVerificationEmail(email, verifyLink)
  } catch (e) {
    console.error('[register] Failed to send verification email:', e)
    await deleteIssuedToken(supabase, 'verification_tokens', tokenHash, '[register]')
  }

  return { ok: true }
})
