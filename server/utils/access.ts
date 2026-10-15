import { serverSupabaseService } from './supabaseServer'

export async function canAccessLesson(
  userId: string | null,
  lessonId: string,
  emailVerified = false,
): Promise<{
  allowed: boolean
  canAccessContent: boolean
  lesson?: {
    id: string
    title: string
    content?: string | null
    is_free: boolean
    price: number
    content_url?: string | null
    preview_url?: string | null
    page_count?: number | null
    file_bytes?: number | null
  }
  content_url?: string | null
}> {
  const supabase = serverSupabaseService()
  const { data: lesson, error: lessonError } = await supabase
    .from('lessons')
    .select('id, title, content, is_free, price, content_url, preview_url, page_count, file_bytes')
    .eq('id', lessonId)
    .single()
  if (lessonError || !lesson) return { allowed: false, canAccessContent: false }

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

  const allowed = lesson.is_free || hasPurchase
  const canAccessContent = allowed && !!userId && emailVerified
  const content_url = canAccessContent ? lesson.content_url : null

  return { allowed, canAccessContent, lesson, content_url }
}
