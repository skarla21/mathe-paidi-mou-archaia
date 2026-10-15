import type { SupabaseClient } from '@supabase/supabase-js'
import { chapterSlug, gradeSlug, slugifyGreek, stableSlug, uniqueSlug } from '#shared/utils/slugify.mjs'

type PlacementRef = {
  subject_id?: string | null
  chapter_id?: string | null
  category_id?: string | null
}

function takenSlugs(
  rows: Array<{ id?: string; slug?: string | null }> | null,
  exceptId?: string,
): string[] {
  return (rows ?? [])
    .filter((row) => row.id !== exceptId && row.slug)
    .map((row) => row.slug as string)
}

export async function nextGradeSlug(
  supabase: SupabaseClient,
  name: string,
  exceptId?: string,
): Promise<string> {
  const { data, error } = await supabase.from('grades').select('id, slug')
  if (error) throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  return gradeSlug(slugifyGreek(name) || 'grade', takenSlugs(data, exceptId))
}

export async function nextSubjectSlug(
  supabase: SupabaseClient,
  name: string,
  gradeId: string,
  exceptId?: string,
): Promise<string> {
  const { data, error } = await supabase.from('subjects').select('id, slug').eq('grade_id', gradeId)
  if (error) throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  return uniqueSlug(slugifyGreek(name) || 'subject', takenSlugs(data, exceptId))
}

export async function nextChapterSlug(
  supabase: SupabaseClient,
  title: string,
  subjectId: string,
  exceptId?: string,
): Promise<string> {
  const { data, error } = await supabase.from('chapters').select('id, slug').eq('subject_id', subjectId)
  if (error) throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  return chapterSlug(slugifyGreek(title) || 'chapter', takenSlugs(data, exceptId))
}

export async function keepSubjectSlug(
  supabase: SupabaseClient,
  currentSlug: string,
  gradeId: string,
  exceptId?: string,
): Promise<string> {
  const { data, error } = await supabase.from('subjects').select('id, slug').eq('grade_id', gradeId)
  if (error) throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  return stableSlug(currentSlug, takenSlugs(data, exceptId))
}

export async function keepChapterSlug(
  supabase: SupabaseClient,
  currentSlug: string,
  subjectId: string,
  exceptId?: string,
): Promise<string> {
  const { data, error } = await supabase.from('chapters').select('id, slug').eq('subject_id', subjectId)
  if (error) throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  return chapterSlug(currentSlug, takenSlugs(data, exceptId))
}

export async function nextCategorySlug(
  supabase: SupabaseClient,
  name: string,
  exceptId?: string,
): Promise<string> {
  const { data, error } = await supabase.from('categories').select('id, slug')
  if (error) throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  return uniqueSlug(slugifyGreek(name) || 'category', takenSlugs(data, exceptId))
}

export async function nextArticleSlug(
  supabase: SupabaseClient,
  title: string,
  exceptId?: string,
): Promise<string> {
  const { data, error } = await supabase.from('articles').select('id, slug')
  if (error) throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
  return uniqueSlug(slugifyGreek(title) || 'article', takenSlugs(data, exceptId))
}

function embeddedSlug(value: unknown): string | null {
  if (!value) return null
  if (Array.isArray(value)) return embeddedSlug(value[0])
  if (typeof value === 'object' && 'slug' in value) {
    const slug = (value as { slug?: string | null }).slug
    return slug || null
  }
  return null
}

async function takenLessonSlugs(
  supabase: SupabaseClient,
  placements: PlacementRef[],
  exceptLessonId?: string,
): Promise<Set<string>> {
  const taken = new Set<string>()
  for (const placement of placements) {
    let query = supabase.from('lesson_placements').select('lesson_id, lessons(slug)')
    if (placement.chapter_id) query = query.eq('chapter_id', placement.chapter_id)
    else if (placement.subject_id) query = query.eq('subject_id', placement.subject_id)
    else if (placement.category_id) query = query.eq('category_id', placement.category_id)
    else continue
    const { data, error } = await query
    if (error) throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
    for (const row of data ?? []) {
      if (row.lesson_id === exceptLessonId) continue
      const slug = embeddedSlug(row.lessons)
      if (slug) taken.add(slug)
    }
  }
  return taken
}

export async function nextLessonSlug(
  supabase: SupabaseClient,
  title: string,
  placements: PlacementRef[],
  exceptLessonId?: string,
): Promise<string> {
  const taken = await takenLessonSlugs(supabase, placements, exceptLessonId)
  return uniqueSlug(slugifyGreek(title) || 'lesson', taken)
}

export async function stableLessonSlug(
  supabase: SupabaseClient,
  currentSlug: string,
  placements: PlacementRef[],
  exceptLessonId?: string,
): Promise<string> {
  const taken = await takenLessonSlugs(supabase, placements, exceptLessonId)
  return stableSlug(currentSlug || 'lesson', taken)
}
