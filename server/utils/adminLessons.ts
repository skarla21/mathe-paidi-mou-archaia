import { createError, getQuery, type H3Event } from 'h3'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  adminListPage,
  adminPage,
  firstQuery,
  foldedTextOr,
  pageRange,
} from './adminList'
import { requireAdmin } from './requireAdmin'

function embedCount(value: { count: number }[] | null | undefined): number {
  return value?.[0]?.count ?? 0
}

async function matchingLessonIds(
  supabase: SupabaseClient,
  filters: {
    gradeId: string
    subjectId: string
    chapterId: string
    categoryId: string
  },
): Promise<string[] | null> {
  const { gradeId, subjectId, chapterId, categoryId } = filters
  if (chapterId) {
    const { data, error } = await supabase
      .from('lesson_placements')
      .select('lesson_id')
      .eq('chapter_id', chapterId)
    if (error) throw error
    return [...new Set((data ?? []).map((row) => row.lesson_id as string))]
  }
  if (subjectId) {
    const [direct, viaChapter] = await Promise.all([
      supabase.from('lesson_placements').select('lesson_id').eq('subject_id', subjectId),
      supabase
        .from('lesson_placements')
        .select('lesson_id, chapters!inner(subject_id)')
        .eq('chapters.subject_id', subjectId),
    ])
    if (direct.error) throw direct.error
    if (viaChapter.error) throw viaChapter.error
    return [
      ...new Set([
        ...(direct.data ?? []).map((row) => row.lesson_id as string),
        ...(viaChapter.data ?? []).map((row) => row.lesson_id as string),
      ]),
    ]
  }
  if (categoryId) {
    const { data, error } = await supabase
      .from('lesson_placements')
      .select('lesson_id')
      .eq('category_id', categoryId)
    if (error) throw error
    return [...new Set((data ?? []).map((row) => row.lesson_id as string))]
  }
  if (gradeId) {
    const [viaChapter, viaSubject] = await Promise.all([
      supabase
        .from('lesson_placements')
        .select('lesson_id, chapters!inner(grade_id)')
        .eq('chapters.grade_id', gradeId),
      supabase
        .from('lesson_placements')
        .select('lesson_id, subjects!inner(grade_id)')
        .eq('subjects.grade_id', gradeId),
    ])
    if (viaChapter.error) throw viaChapter.error
    if (viaSubject.error) throw viaSubject.error
    return [
      ...new Set([
        ...(viaChapter.data ?? []).map((row) => row.lesson_id as string),
        ...(viaSubject.data ?? []).map((row) => row.lesson_id as string),
      ]),
    ]
  }
  return null
}

export async function loadAdminLessons(event: H3Event, supabase: SupabaseClient) {
  requireAdmin(event)
  const query = getQuery(event)
  const page = adminPage(query.page)
  const q = firstQuery(query.q).trim()
  const gradeId = firstQuery(query.grade_id)
  const subjectId = firstQuery(query.subject_id)
  const chapterId = firstQuery(query.chapter_id)
  const categoryId = firstQuery(query.category_id)
  const { from, to } = pageRange(page)

  let filterIds: string[] | null = null
  try {
    filterIds = await matchingLessonIds(supabase, {
      gradeId,
      subjectId,
      chapterId,
      categoryId,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[admin/lessons.get] filter', message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }

  if (filterIds && filterIds.length === 0) {
    return adminListPage([], 0, page)
  }

  let filtered = supabase
    .from('lessons')
    .select('*, lesson_comments(count)', { count: 'exact' })

  if (filterIds) filtered = filtered.in('id', filterIds)
  const title = q ? foldedTextOr('title_folded', q) : null
  if (title) filtered = filtered.or(title)

  const { data: lessons, error, count } = await filtered
    .order('created_at', { ascending: false })
    .order('id', { ascending: true })
    .range(from, to)

  if (error) {
    console.error('[admin/lessons.get]', error.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }

  const rows = lessons ?? []
  const lessonIds = rows.map((row) => row.id as string)
  if (!lessonIds.length) {
    return adminListPage([], count ?? 0, page)
  }

  const [placementsRes, ratingsRes] = await Promise.all([
    supabase
      .from('lesson_placements')
      .select(
        'id, lesson_id, subject_id, chapter_id, category_id, order, subjects(name, grade_id), chapters(title, grade_id, subject_id), categories(name)',
      )
      .in('lesson_id', lessonIds)
      .order('order', { ascending: true }),
    supabase
      .from('lesson_ratings')
      .select('lesson_id, rating')
      .in('lesson_id', lessonIds),
  ])

  if (placementsRes.error) {
    console.error('[admin/lessons.get] placements', placementsRes.error.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }
  if (ratingsRes.error) {
    console.error('[admin/lessons.get] ratings', ratingsRes.error.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }

  const placementMap = new Map<string, NonNullable<typeof placementsRes.data>>()
  for (const p of placementsRes.data ?? []) {
    const list = placementMap.get(p.lesson_id) ?? []
    list.push(p)
    placementMap.set(p.lesson_id, list)
  }

  const ratingMap = new Map<string, number[]>()
  for (const r of (ratingsRes.data ?? []) as { lesson_id: string; rating: number }[]) {
    const list = ratingMap.get(r.lesson_id) ?? []
    list.push(r.rating)
    ratingMap.set(r.lesson_id, list)
  }

  const items = rows.map((lesson) => {
    const {
      lesson_comments: commentEmbed,
      ...rest
    } = lesson as Record<string, unknown> & {
      lesson_comments?: { count: number }[] | null
    }
    const ratings = ratingMap.get(lesson.id as string) ?? []
    const avgRating = ratings.length > 0
      ? Math.round((ratings.reduce((s, r) => s + r, 0) / ratings.length) * 100) / 100
      : 0
    return {
      ...rest,
      placements: placementMap.get(lesson.id as string) ?? [],
      avgRating,
      ratingCount: ratings.length,
      commentCount: embedCount(commentEmbed),
    }
  })

  return adminListPage(items, count ?? 0, page)
}
