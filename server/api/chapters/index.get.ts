import { sortChapters } from '#shared/utils/catalogOrder.mjs'
import { mapChapterWithCounts } from '../../utils/catalogCounts'
import { wantsCounts } from '../../utils/embedCount'
import { serverSupabaseAnon } from '../../utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const gradeId = query.grade_id as string | undefined
  const subjectId = query.subject_id as string | undefined
  const withCounts = wantsCounts(query.counts)
  const supabase = serverSupabaseAnon()
  const select = withCounts ? '*, lesson_placements(count)' : '*'
  let q = supabase.from('chapters').select(select)
  if (gradeId) q = q.eq('grade_id', gradeId)
  if (subjectId) q = q.eq('subject_id', subjectId)
  const { data, error } = await q
    .order('order', { ascending: true })
    .order('title', { ascending: true })
  if (error) {
    console.error('[chapters/index.get]', error.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }
  const rows = data ?? []
  if (!withCounts) return sortChapters(rows)

  return sortChapters(
    rows.map((row) =>
      mapChapterWithCounts(
        row as unknown as Record<string, unknown> & {
          lesson_placements?: { count: number }[] | null
        },
      ),
    ),
  )
})
