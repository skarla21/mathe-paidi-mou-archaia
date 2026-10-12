import { acceptedEntityImageUrl } from '#shared/utils/entityImageUrl.mjs'

const MESSAGE = 'Η εικόνα πρέπει να προέρχεται από μεταφόρτωση'

export function storedEntityImageUrl(url: unknown): string | null {
  if (url == null) return null
  if (typeof url !== 'string') throw createError({ statusCode: 400, message: MESSAGE })
  const supabaseUrl = String(useRuntimeConfig().public.supabaseUrl || '')
  const accepted = acceptedEntityImageUrl(url, supabaseUrl)
  if (accepted === false) throw createError({ statusCode: 400, message: MESSAGE })
  return accepted
}
