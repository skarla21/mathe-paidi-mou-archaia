import { serverSupabaseAnon } from '../../utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing chapter id' })
  const supabase = serverSupabaseAnon()

  const { data: chapter, error: chErr } = await supabase.from('chapters').select('*').eq('id', id).single()
  if (chErr || !chapter) throw createError({ statusCode: 404, message: 'Chapter not found' })

  // Lessons are listed via GET /api/lessons?chapter_id= (paginated).
  return chapter
})
