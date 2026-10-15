import { randomUUID } from 'node:crypto'
import { serverSupabaseService } from '../../utils/supabaseServer'
import { requireAdmin } from '../../utils/requireAdmin'
import {
  UPLOAD_BUCKET,
  isAllowedUploadMime,
  isImageEntity,
  isStorageNameTaken,
  isUploadPath,
  maxUploadBytes,
  signUploadTicket,
  uploadObjectPath,
  type UploadTarget,
} from '../../utils/adminUpload'

interface SignBody {
  filename?: unknown
  mimeType?: unknown
  size?: unknown
  target?: unknown
  entity?: unknown
}

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody<SignBody>(event).catch(() => null)
  const filename = typeof body?.filename === 'string' ? body.filename.trim() : ''
  const mimeType = typeof body?.mimeType === 'string' ? body.mimeType : ''
  const size = typeof body?.size === 'number' ? body.size : NaN
  const target: UploadTarget = body?.target === 'image'
    ? 'image'
    : body?.target === 'preview'
      ? 'preview'
      : 'lesson'
  const entity = typeof body?.entity === 'string' ? body.entity : ''

  if (!filename || filename.length > 240 || filename.includes('\0')) {
    throw createError({ statusCode: 400, message: 'Invalid file' })
  }
  if (!isAllowedUploadMime(target, mimeType)) {
    throw createError({
      statusCode: 400,
      message: target === 'lesson' ? 'Only PDF, JPG, and PNG allowed' : 'Images: only JPG and PNG allowed',
    })
  }
  if (target === 'image' && !isImageEntity(entity)) {
    throw createError({ statusCode: 400, message: 'Invalid file' })
  }
  if (!Number.isSafeInteger(size) || size <= 0 || size > maxUploadBytes(mimeType)) {
    const limit = mimeType === 'application/pdf' ? '50MB' : '20MB'
    throw createError({ statusCode: 400, message: `File too large (max ${limit})` })
  }

  const secret = String(useRuntimeConfig().authSecret || '')
  if (!secret) {
    console.error('[admin/upload-sign] missing auth secret')
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }

  const supabase = serverSupabaseService()
  let path = ''
  let signedUrl = ''
  let lastMessage = 'Upload failed'
  for (let attempt = 0; attempt < 3; attempt += 1) {
    path = uploadObjectPath(target, filename, mimeType, entity, randomUUID().slice(0, 8))
    const { data, error } = await supabase.storage.from(UPLOAD_BUCKET).createSignedUploadUrl(path, { upsert: false })
    if (!error && data?.signedUrl) {
      signedUrl = data.signedUrl
      break
    }
    lastMessage = error?.message || lastMessage
    if (!error || !isStorageNameTaken(error)) {
      console.error('[admin/upload-sign] storage', lastMessage)
      throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
    }
  }
  if (!signedUrl || !isUploadPath(path)) {
    console.error('[admin/upload-sign] storage', lastMessage)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }

  const ticket = signUploadTicket(path, secret, mimeType)
  return { signedUrl, path: ticket.path, exp: ticket.exp, sig: ticket.sig, mime: ticket.mime }
})
