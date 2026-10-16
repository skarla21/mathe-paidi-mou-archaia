import { notifyCommentCreated } from '../../../../utils/adminNotifications'
import { canAccessLesson } from '../../../../utils/access'
import { requireVerifiedEmail } from '../../../../utils/requireVerifiedEmail'
import { serverSupabaseService } from '../../../../utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const userId = await requireVerifiedEmail(event)
  const lessonId = getRouterParam(event, 'id')
  if (!lessonId) {
    throw createError({ statusCode: 400, message: 'Λείπει το id μαθήματος' })
  }

  const { allowed } = await canAccessLesson(userId, lessonId, true)
  if (!allowed) {
    throw createError({ statusCode: 403, message: 'Απαγορεύεται' })
  }

  const body = await readBody<{ body?: string; parent_id?: string | null }>(
    event,
  )
  const trimmed = typeof body?.body === 'string' ? body.body.trim() : ''
  if (trimmed.length < 1 || trimmed.length > 2000) {
    throw createError({
      statusCode: 400,
      message: 'Το σχόλιο πρέπει να είναι από 1 έως 2000 χαρακτήρες',
    })
  }

  const supabase = serverSupabaseService()

  let parentId: string | null = null
  if (body?.parent_id) {
    if (typeof body.parent_id !== 'string') {
      throw createError({ statusCode: 400, message: 'Μη έγκυρο parent_id' })
    }
    const { data: parent } = await supabase
      .from('lesson_comments')
      .select('id, lesson_id, parent_id')
      .eq('id', body.parent_id)
      .maybeSingle()
    if (!parent || parent.lesson_id !== lessonId) {
      throw createError({
        statusCode: 400,
        message: 'Μη έγκυρο σχόλιο απάντησης',
      })
    }
    if (parent.parent_id) {
      throw createError({
        statusCode: 400,
        message: 'Δεν μπορείτε να απαντήσετε σε απάντηση',
      })
    }
    parentId = parent.id
  }

  const { data, error } = await supabase
    .from('lesson_comments')
    .insert({
      user_id: userId,
      lesson_id: lessonId,
      parent_id: parentId,
      body: trimmed,
    })
    .select()
    .single()

  if (error) {
    console.error('[lessons/[id]/comments.post]', error.message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }

  if (data?.id) {
    try {
      await notifyCommentCreated(supabase, data.id)
    } catch (e) {
      console.error('[lessons/[id]/comments.post] notify', e)
    }
  }

  return data
})
