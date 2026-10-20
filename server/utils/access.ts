import { serverSupabaseService } from './supabaseServer'

type AccessLesson = {
  id: string
  title: string
  content?: string | null
  tags?: string[]
  is_free: boolean
  price: number
  content_url?: string | null
  preview_url?: string | null
  page_count?: number | null
  file_bytes?: number | null
  avg_rating?: number
  rating_count?: number
}

export type LessonAccess = {
  allowed: boolean
  canAccessContent: boolean
  lesson?: AccessLesson
  content_url?: string | null
}

export function lessonAccessDecision(input: {
  lesson: AccessLesson | null
  hasPurchase: boolean
  userId: string | null
  emailVerified: boolean
}): LessonAccess {
  const { lesson, hasPurchase, userId, emailVerified } = input
  if (!lesson) return { allowed: false, canAccessContent: false }

  const allowed = lesson.is_free || hasPurchase
  const canAccessContent = allowed && !!userId && emailVerified
  const content_url = canAccessContent ? lesson.content_url : null

  return { allowed, canAccessContent, lesson, content_url }
}

export async function canAccessLesson(
  userId: string | null,
  lessonId: string,
  emailVerified = false,
): Promise<LessonAccess> {
  const supabase = serverSupabaseService()
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, title, content, tags, is_free, price, content_url, preview_url, page_count, file_bytes, avg_rating, rating_count')
    .eq('id', lessonId)
    .single()
  if (lessonError || !lesson) {
    return lessonAccessDecision({ lesson: null, hasPurchase: false, userId, emailVerified })
  }

  let hasPurchase = false
  if (userId) {
    const { data } = await supabase
      .from('purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .limit(1)
      .maybeSingle()
    hasPurchase = !!data
  }

  return lessonAccessDecision({ lesson, hasPurchase, userId, emailVerified })
}
