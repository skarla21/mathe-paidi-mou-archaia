import { serverSupabaseService } from '../../utils/supabaseServer'
import { requireAdmin } from '../../utils/requireAdmin'
import { listReferencedEntityImages, type EntityImageKind } from '../../utils/entityImageStorage'

function queryValue(value: unknown): string {
  const raw = Array.isArray(value) ? value[0] : value
  return typeof raw === 'string' ? raw.trim() : ''
}

function imageKind(value: string): EntityImageKind | null {
  if (value === 'category' || value === 'chapter' || value === 'subject' || value === 'article') return value
  return null
}

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const query = getQuery(event)
  const exceptType = queryValue(query.exceptType)
  const exceptId = queryValue(query.exceptId)
  let except: { type: EntityImageKind; id: string } | null = null
  if (exceptType || exceptId) {
    const type = imageKind(exceptType)
    if (!type || !exceptId) throw createError({ statusCode: 400, message: 'Λείπει το αναγνωριστικό' })
    except = { type, id: exceptId }
  }
  const supabase = serverSupabaseService()
  const supabaseUrl = String(useRuntimeConfig().public.supabaseUrl || '')
  const images = await listReferencedEntityImages(supabase, supabaseUrl, except)
  if (!images) throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  return { images }
})
