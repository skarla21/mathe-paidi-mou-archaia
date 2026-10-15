import { mapSubjectWithCounts } from '../utils/catalogCounts'
import { wantsCounts } from '../utils/embedCount'
import { serverSupabaseAnon } from '../utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const gradeId = query.grade_id as string | undefined
  const withCounts = wantsCounts(query.counts)
  const supabase = serverSupabaseAnon()
  const select = withCounts
    ? '*, lesson_placements(count), chapters(lesson_placements(count))'
    : '*'
  let q = supabase.from('subjects').select(select)
  if (gradeId) {
    q = q.eq('grade_id', gradeId)
  }
  const { data, error } = await q
    .order('order', { ascending: true })
    .order('name', { ascending: true })
  if (error) {
    console.error('[subjects.get]', error.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }
  if (!withCounts) return data ?? []

  return (data ?? []).map((row) =>
    mapSubjectWithCounts(
      row as unknown as Record<string, unknown> & {
        chapters?: Array<{ lesson_placements?: { count: number }[] | null }> | null
        lesson_placements?: { count: number }[] | null
      },
    ),
  )
})
