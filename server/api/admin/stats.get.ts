import { serverSupabaseService } from '../../utils/supabaseServer'
import { requireAdmin } from '../../utils/requireAdmin'

function asNumber(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}

export default defineEventHandler(async (event) => {
  requireAdmin(event)
  const supabase = serverSupabaseService()

  const now = new Date()
  const startOfThisYear = new Date(now.getFullYear(), 0, 1).toISOString()
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()

  const [
    usersRes,
    lessonsRes,
    newLessonsThisMonthRes,
    downloadsRes,
    revenueRes,
    recentDownloadsRes,
    topLessonsRes,
    gradesRes,
    subjectsRes,
    chaptersRes,
    categoriesRes,
    purchasesCountRes,
    freeLessonsRes,
    paidLessonsRes,
    newUsersThisMonthRes,
    newUsersLastMonthRes,
    newUsersThisYearRes,
    downloadsThisMonthRes,
    downloadsLastMonthRes,
    downloadsThisYearRes,
    revenueThisMonthRes,
    revenueLastMonthRes,
    revenueThisYearRes,
    recentPurchasesRes,
    recentUsersRes,
    lessonsByGradeRes,
    ratingsCountRes,
    commentsCountRes,
    avgRatingRes,
    ratingsThisMonthRes,
    commentsThisMonthRes,
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }),
    supabase.from('lessons').select('*', { count: 'exact', head: true }),
    supabase
      .from('lessons')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfThisMonth),
    supabase.from('downloads').select('*', { count: 'exact', head: true }),
    supabase.rpc('admin_purchase_revenue'),
    supabase
      .from('downloads')
      .select('id, downloaded_at, users(name), lessons(title)')
      .order('downloaded_at', { ascending: false })
      .limit(2),
    supabase.rpc('get_top_downloaded_lessons', { lim: 10 }),

    supabase.from('grades').select('*', { count: 'exact', head: true }),
    supabase.from('subjects').select('*', { count: 'exact', head: true }),
    supabase.from('chapters').select('*', { count: 'exact', head: true }),
    supabase.from('categories').select('*', { count: 'exact', head: true }),
    supabase.from('purchases').select('*', { count: 'exact', head: true }),

    supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('is_free', true),
    supabase.from('lessons').select('*', { count: 'exact', head: true }).eq('is_free', false),

    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfThisMonth),
    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfLastMonth)
      .lt('created_at', startOfThisMonth),
    supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', startOfThisYear),

    supabase
      .from('downloads')
      .select('*', { count: 'exact', head: true })
      .gte('downloaded_at', startOfThisMonth),
    supabase
      .from('downloads')
      .select('*', { count: 'exact', head: true })
      .gte('downloaded_at', startOfLastMonth)
      .lt('downloaded_at', startOfThisMonth),
    supabase
      .from('downloads')
      .select('*', { count: 'exact', head: true })
      .gte('downloaded_at', startOfThisYear),

    supabase.rpc('admin_purchase_revenue', { p_from: startOfThisMonth }),
    supabase.rpc('admin_purchase_revenue', {
      p_from: startOfLastMonth,
      p_to: startOfThisMonth,
    }),
    supabase.rpc('admin_purchase_revenue', { p_from: startOfThisYear }),

    supabase
      .from('purchases')
      .select('id, created_at, users(name, email), lessons(title, price)')
      .order('created_at', { ascending: false })
      .limit(2),

    supabase
      .from('users')
      .select('id, name, email, avatar_url, created_at')
      .order('created_at', { ascending: false })
      .limit(2),

    supabase.rpc('admin_lessons_by_grade'),

    supabase.from('lesson_ratings').select('*', { count: 'exact', head: true }),
    supabase.from('lesson_comments').select('*', { count: 'exact', head: true }),
    supabase.rpc('admin_avg_lesson_rating'),
    supabase.from('lesson_ratings').select('*', { count: 'exact', head: true }).gte('created_at', startOfThisMonth),
    supabase.from('lesson_comments').select('*', { count: 'exact', head: true }).gte('created_at', startOfThisMonth),
  ])

  const allResults = [
    usersRes, lessonsRes, newLessonsThisMonthRes, downloadsRes, revenueRes, recentDownloadsRes, topLessonsRes,
    gradesRes, subjectsRes, chaptersRes, categoriesRes, purchasesCountRes, freeLessonsRes, paidLessonsRes,
    newUsersThisMonthRes, newUsersLastMonthRes, newUsersThisYearRes,
    downloadsThisMonthRes, downloadsLastMonthRes, downloadsThisYearRes,
    revenueThisMonthRes, revenueLastMonthRes, revenueThisYearRes,
    recentPurchasesRes, recentUsersRes, lessonsByGradeRes,
    ratingsCountRes, commentsCountRes, avgRatingRes, ratingsThisMonthRes, commentsThisMonthRes,
  ]
  for (const r of allResults) {
    if (r.error) console.error('[admin/stats]', r.error.message)
  }

  let topLessons: { lesson_id: string; title: string; count: number }[]
  if (topLessonsRes.error) {
    topLessons = []
  }
  else {
    topLessons = (topLessonsRes.data ?? []).map(
      (row: { lesson_id: string; title: string; count: number }) => ({
        lesson_id: row.lesson_id,
        title: row.title,
        count: Number(row.count),
      }),
    )
  }

  const lessonsByGrade = ((lessonsByGradeRes.data ?? []) as { grade: string; count: number }[])
    .map((row) => ({ grade: row.grade, count: Number(row.count) }))

  return {
    totalUsers: usersRes.count ?? 0,
    totalLessons: lessonsRes.count ?? 0,
    downloads: downloadsRes.count ?? 0,
    revenue: asNumber(revenueRes.data),
    recentDownloads: recentDownloadsRes.data ?? [],
    topLessons,

    totalGrades: gradesRes.count ?? 0,
    totalSubjects: subjectsRes.count ?? 0,
    totalChapters: chaptersRes.count ?? 0,
    totalCategories: categoriesRes.count ?? 0,
    totalPurchases: purchasesCountRes.count ?? 0,
    newLessonsThisMonth: newLessonsThisMonthRes.count ?? 0,
    freeVsPaid: {
      free: freeLessonsRes.count ?? 0,
      paid: paidLessonsRes.count ?? 0,
    },
    newUsersThisMonth: newUsersThisMonthRes.count ?? 0,
    newUsersLastMonth: newUsersLastMonthRes.count ?? 0,
    newUsersThisYear: newUsersThisYearRes.count ?? 0,
    downloadsThisMonth: downloadsThisMonthRes.count ?? 0,
    downloadsLastMonth: downloadsLastMonthRes.count ?? 0,
    downloadsThisYear: downloadsThisYearRes.count ?? 0,
    revenueThisMonth: asNumber(revenueThisMonthRes.data),
    revenueLastMonth: asNumber(revenueLastMonthRes.data),
    revenueThisYear: asNumber(revenueThisYearRes.data),
    recentPurchases: recentPurchasesRes.data ?? [],
    recentUsers: recentUsersRes.data ?? [],
    lessonsByGrade,

    totalRatings: ratingsCountRes.count ?? 0,
    averageRating: asNumber(avgRatingRes.data),
    totalComments: commentsCountRes.count ?? 0,
    ratingsThisMonth: ratingsThisMonthRes.count ?? 0,
    commentsThisMonth: commentsThisMonthRes.count ?? 0,
  }
})
