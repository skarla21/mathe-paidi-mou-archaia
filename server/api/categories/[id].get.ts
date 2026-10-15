import { serverSupabaseAnon } from '../../utils/supabaseServer'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, message: 'Missing category id' })
  const supabase = serverSupabaseAnon()

  const { data: category, error: catErr } = await supabase
    .from('categories')
    .select('*')
    .eq('slug', id)
    .maybeSingle()
  if (catErr || !category) throw createError({ statusCode: 404, message: 'Category not found' })

  // Lessons are listed via GET /api/lessons?category_id= (paginated).
  return category
})
