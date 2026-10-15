import type { SupabaseClient } from '@supabase/supabase-js'

/** Insert a saved-lesson row if missing. Safe to call after purchase. */
export async function ensureLessonBookmark(
  supabase: SupabaseClient,
  userId: string,
  lessonId: string,
): Promise<void> {
  const { data: existing, error: lookupError } = await supabase
    .from('lesson_bookmarks')
    .select('id')
    .eq('user_id', userId)
    .eq('lesson_id', lessonId)
    .maybeSingle()
  if (lookupError) {
    console.error('[lessonBookmarks] lookup', lookupError.message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }
  if (existing) return

  const { error } = await supabase
    .from('lesson_bookmarks')
    .insert({ user_id: userId, lesson_id: lessonId })
  if (error) {
    if (error.code === '23505') return
    console.error('[lessonBookmarks] ensure', error.message)
    throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  }
}

/** Best-effort bookmark after a purchase is already durable. Never throws. */
export async function ensureLessonBookmarkQuiet(
  supabase: SupabaseClient,
  userId: string,
  lessonId: string,
): Promise<void> {
  try {
    await ensureLessonBookmark(supabase, userId, lessonId)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'bookmark failed'
    console.error('[lessonBookmarks] quiet', message)
  }
}
