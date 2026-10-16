import type { SupabaseClient } from '@supabase/supabase-js'
import { LESSON_FILES_BUCKET, lessonContentPathFromUrl } from './lessonStorage'

const SIGNED_URL_SECONDS = 60 * 60 * 2

/**
 * Returns a short-lived signed URL for a lesson file in the private bucket.
 * content_url is an object path. A leftover public uploads URL is accepted
 * and reduced to that same path. The stored value is never returned.
 */
export async function signedLessonContentUrl(
  supabase: SupabaseClient,
  contentUrl: string,
  supabaseUrl = String(useRuntimeConfig().public.supabaseUrl || ''),
): Promise<string> {
  const path = lessonContentPathFromUrl(contentUrl, supabaseUrl)
  if (!path) throw new Error('unrecognized lesson file')

  const { data, error } = await supabase.storage
    .from(LESSON_FILES_BUCKET)
    .createSignedUrl(path, SIGNED_URL_SECONDS)
  if (error || !data?.signedUrl) throw new Error(error?.message || 'lesson file sign')
  return data.signedUrl
}
