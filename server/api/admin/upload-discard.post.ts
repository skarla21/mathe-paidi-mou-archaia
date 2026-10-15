import { serverSupabaseService } from '../../utils/supabaseServer'
import { requireAdmin } from '../../utils/requireAdmin'
import { isUploadPath, verifyUploadTicket } from '../../utils/adminUpload'
import {
  lessonContentPathFromUrl,
  lessonPreviewPathFromUrl,
  removeUnusedLessonContent,
  removeUnusedLessonPath,
  removeUnusedLessonPreview,
  removeUnusedLessonPreviewPath,
} from '../../utils/lessonStorage'
import { entityImagePathFromUrl, removeUnusedEntityImage, removeUnusedEntityImagePath } from '../../utils/entityImageStorage'

interface DiscardBody {
  url?: unknown
  path?: unknown
  exp?: unknown
  sig?: unknown
  mime?: unknown
}

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const body = await readBody<DiscardBody>(event).catch(() => null)
  const supabase = serverSupabaseService()
  if (typeof body?.url === 'string') {
    await removePublicUpload(supabase, body.url)
    return { ok: true }
  }

  const path = typeof body?.path === 'string' ? body.path : ''
  const exp = typeof body?.exp === 'number' ? body.exp : NaN
  const sig = typeof body?.sig === 'string' ? body.sig : ''
  const mime = typeof body?.mime === 'string' ? body.mime : ''
  const secret = String(useRuntimeConfig().authSecret || '')
  if (!verifyUploadTicket({ path, exp, sig, mime }, secret) || !isUploadPath(path)) {
    throw createError({ statusCode: 400, message: 'Invalid file' })
  }
  if (path.startsWith('lesson-content/')) await removeUnusedLessonPath(supabase, path)
  else if (path.startsWith('lesson-previews/')) await removeUnusedLessonPreviewPath(supabase, path)
  else await removeUnusedEntityImagePath(supabase, path)
  return { ok: true }
})

async function removePublicUpload(
  supabase: ReturnType<typeof serverSupabaseService>,
  url: string,
): Promise<void> {
  const supabaseUrl = String(useRuntimeConfig().public.supabaseUrl || '')
  if (lessonContentPathFromUrl(url, supabaseUrl)) {
    await removeUnusedLessonContent(supabase, url, supabaseUrl)
    return
  }
  if (lessonPreviewPathFromUrl(url, supabaseUrl)) {
    await removeUnusedLessonPreview(supabase, url, supabaseUrl)
    return
  }
  if (entityImagePathFromUrl(url, supabaseUrl)) {
    await removeUnusedEntityImage(supabase, url, supabaseUrl)
    return
  }
  console.warn('[admin/upload-discard] skip unrecognized upload url')
}
