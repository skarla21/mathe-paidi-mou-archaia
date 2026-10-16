import { lessonFileBlock } from '#shared/utils/lessonFileBlock.mjs'
import { canAccessLesson } from '../../utils/access'
import { serverSupabaseService } from '../../utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing lesson id' })
  const userId = event.context.auth?.userId ?? null

  const supabase = serverSupabaseService()

  let emailVerified = false
  if (userId) {
    const { data } = await supabase
      .from('users')
      .select('email_verified')
      .eq('id', userId)
      .single()
    emailVerified = !!data?.email_verified
  }

  const { allowed, canAccessContent, lesson, content_url } = await canAccessLesson(
    userId,
    id,
    emailVerified,
  )
  if (!lesson) throw createError({ statusCode: 404, message: 'Lesson not found' })
  const hasContent = Boolean(lesson.content_url)

  const [{ count: commentCount }, myRatingRes] = await Promise.all([
    supabase
      .from('lesson_comments')
      .select('*', { count: 'exact', head: true })
      .eq('lesson_id', id),
    userId
      ? supabase
          .from('lesson_ratings')
          .select('rating')
          .eq('lesson_id', id)
          .eq('user_id', userId)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ])

  return {
    ...lesson,
    content_url: canAccessContent ? content_url : null,
    has_content: hasContent,
    can_access: allowed,
    can_access_content: canAccessContent,
    file_block: lessonFileBlock({
      canAccess: allowed,
      canAccessContent,
      hasContent,
      isLoggedIn: !!userId,
    }),
    avgRating: Number(lesson.avg_rating ?? 0),
    ratingCount: Number(lesson.rating_count ?? 0),
    commentCount: commentCount ?? 0,
    myRating: myRatingRes.data?.rating ?? null,
  }
})
