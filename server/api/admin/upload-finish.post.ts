import { serverSupabaseService } from '../../utils/supabaseServer'
import { requireAdmin } from '../../utils/requireAdmin'
import {
  UPLOAD_BUCKET,
  maxUploadBytes,
  mimeFromMagic,
  readPrefixBytes,
  storageObjectUrl,
  uploadBucketForPath,
  uploadByteLength,
  uploadBytesMatchTicket,
  verifyUploadTicket,
} from '../../utils/adminUpload'

interface FinishBody {
  path?: unknown
  exp?: unknown
  sig?: unknown
  mime?: unknown
}

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody<FinishBody>(event).catch(() => null)
  const path = typeof body?.path === 'string' ? body.path : ''
  const exp = typeof body?.exp === 'number' ? body.exp : NaN
  const sig = typeof body?.sig === 'string' ? body.sig : ''
  const mime = typeof body?.mime === 'string' ? body.mime : ''
  const config = useRuntimeConfig()
  const secret = String(config.authSecret || '')
  if (!verifyUploadTicket({ path, exp, sig, mime }, secret)) {
    throw createError({ statusCode: 400, message: 'Invalid file' })
  }

  const supabaseUrl = String(config.public.supabaseUrl || '')
  const serviceKey = String(config.supabaseServiceKey || '')
  const bucket = uploadBucketForPath(path)
  const objectUrl = storageObjectUrl(supabaseUrl, path, bucket)
  if (!objectUrl || !serviceKey) {
    console.error('[admin/upload-finish] storage is not configured')
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }

  let inspected: { status: number; bytes: Uint8Array; size: number | null }
  try {
    inspected = await readUploadPrefix(objectUrl, serviceKey)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload check failed'
    console.error('[admin/upload-finish] read', message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }

  if (inspected.status === 404) {
    throw createError({ statusCode: 400, message: 'Invalid file' })
  }
  if (inspected.status !== 200 && inspected.status !== 206) {
    console.error('[admin/upload-finish] read status', inspected.status)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }
  const detected = mimeFromMagic(inspected.bytes)
  const tooLarge = inspected.size == null || inspected.size <= 0 || inspected.size > maxUploadBytes(mime)
  if (!uploadBytesMatchTicket(mime, detected) || tooLarge) {
    await removeUpload(path, bucket)
    throw createError({ statusCode: 400, message: 'Invalid file format' })
  }

  if (path.startsWith('lesson-content/')) return { path, url: path }

  const { data } = serverSupabaseService().storage.from(UPLOAD_BUCKET).getPublicUrl(path)
  return { path, url: data.publicUrl }
})

async function readUploadPrefix(url: string, serviceKey: string): Promise<{ status: number; bytes: Uint8Array; size: number | null }> {
  const headers = {
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
  }
  const res = await fetch(url, { headers: { ...headers, Range: 'bytes=0-15' } })
  let size = uploadByteLength(res.status, res.headers.get('content-range'), res.headers.get('content-length'))
  const announced = Number(res.headers.get('content-length') || '')
  const smallBody = Number.isFinite(announced) && announced > 0 && announced <= 32
  if (res.status === 200 && !smallBody) {
    const bytes = await readPrefixBytes(res.body, 16)
    return { status: res.status, bytes, size }
  }
  const raw = new Uint8Array(await res.arrayBuffer())
  if (size == null && (res.status === 200 || res.status === 206)) {
    const head = await fetch(url, { method: 'HEAD', headers })
    if (head.ok) size = uploadByteLength(200, null, head.headers.get('content-length'))
  }
  return { status: res.status, bytes: raw.subarray(0, 16), size }
}

async function removeUpload(path: string, bucket: string): Promise<void> {
  try {
    const { error } = await serverSupabaseService().storage.from(bucket).remove([path])
    if (error) console.error('[admin/upload-finish] remove', error.message)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'remove failed'
    console.error('[admin/upload-finish] remove', message)
  }
}
