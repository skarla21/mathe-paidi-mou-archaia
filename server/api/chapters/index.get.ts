import { sortChapters } from '#shared/utils/catalogOrder.mjs'
import { serverSupabaseAnon } from '../../utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const gradeId = query.grade_id as string | undefined
  const subjectId = query.subject_id as string | undefined
  const supabase = serverSupabaseAnon()
  let q = supabase.from('chapters').select('*')
  if (gradeId) q = q.eq('grade_id', gradeId)
  if (subjectId) q = q.eq('subject_id', subjectId)
  const { data, error } = await q.order('order', { ascending: true }).order('title', { ascending: true })
  if (error) {
    console.error('[chapters/index.get]', error.message)
    throw createError({ statusCode: 500, message: 'Database operation failed' })
  }
  return sortChapters(data ?? [])
})
