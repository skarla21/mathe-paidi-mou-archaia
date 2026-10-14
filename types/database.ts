/** Shared domain types matching the Supabase schema (supabase/schema.sql). */

export interface Grade {
  id: string
  name: string
  slug: string
  order: number
}

export interface Subject {
  id: string
  name: string
  slug: string
  grade_id: string
  image_url?: string | null
  /** Joined relation — only present when select includes `grades(…)` */
  grades?: { name: string } | null
}

export interface Category {
  id: string
  name: string
  slug: string
  description: string | null
  image_url?: string | null
  order: number
  created_at: string
}

export interface Chapter {
  id: string
  title: string
  slug: string
  description: string | null
  grade_id: string
  subject_id: string
  image_url: string | null
  order: number
  created_at: string
  /** Joined relation — only present when select includes `subjects(…)` */
  subjects?: { name: string } | null
}

export interface LessonPlacement {
  id: string
  lesson_id: string
  subject_id: string | null
  chapter_id: string | null
  category_id: string | null
  order: number
  /** Joined relations — present when select includes these */
  subjects?: { name: string; grade_id?: string; grades?: { name: string } } | null
  chapters?: { title: string; grade_id?: string; subject_id?: string; subjects?: { name: string; grades?: { name: string } } } | null
  categories?: { name: string } | null
}

export interface Lesson {
  id: string
  title: string
  slug: string
  content: string | null
  is_free: boolean
  price: number
  content_url: string | null
  created_at: string
  /** Many-to-many placements — present when fetched with joins */
  placements?: LessonPlacement[]
  /** Aggregated rating/comment data — present on admin listing */
  avgRating?: number
  ratingCount?: number
  commentCount?: number
}

export interface User {
  id: string
  email: string | null
  name: string | null
  avatar_url: string | null
  isAdmin: boolean
  email_verified: boolean
  password_hash: string | null
  provider: string
  created_at: string
  /** Aggregated counts — present on admin user listing */
  downloadCount?: number
  purchaseCount?: number
  ratingCount?: number
  commentCount?: number
  articleLikeCount?: number
  articleCommentCount?: number
}

export interface Article {
  id: string
  title: string
  body: string
  tags: string[]
  reading_time_minutes: number
  published: boolean
  image_url?: string | null
  created_at: string
  updated_at: string
  likeCount?: number
  commentCount?: number
}

export interface ArticleLike {
  id: string
  user_id: string
  article_id: string
  created_at: string
  users?: { name: string | null; avatar_url: string | null; email?: string | null } | null
  articles?: { title: string } | null
}

export interface ArticleComment {
  id: string
  user_id: string
  article_id: string
  body: string
  created_at: string
  updated_at: string
  users?: { name: string | null; avatar_url: string | null; email?: string | null } | null
  articles?: { title: string } | null
}

export interface Purchase {
  id: string
  user_id: string
  lesson_id: string
  stripe_session_id: string | null
  created_at: string
  /** Joined relation */
  lessons?: { title: string } | null
}

export interface Download {
  id: string
  user_id: string
  lesson_id: string
  downloaded_at: string
  /** Joined relation */
  lessons?: { title: string } | null
}

export interface LessonRating {
  id: string
  user_id: string
  lesson_id: string
  rating: number
  created_at: string
  updated_at: string
  /** Joined relation */
  users?: { name: string | null; avatar_url: string | null; email?: string | null } | null
  /** Joined relation */
  lessons?: { title: string } | null
}

export interface LessonComment {
  id: string
  user_id: string
  lesson_id: string
  body: string
  created_at: string
  updated_at: string
  /** Joined relation */
  users?: { name: string | null; avatar_url: string | null; email?: string | null } | null
  /** Joined relation */
  lessons?: { title: string } | null
}

export interface VerificationToken {
  id: string
  user_id: string
  token_hash: string
  expires_at: string
  created_at: string
}

export interface PasswordResetToken {
  id: string
  user_id: string
  token_hash: string
  expires_at: string
  sent_at: string | null
  created_at: string
}

export type AdminNotificationKind =
  | 'purchase'
  | 'download'
  | 'rating'
  | 'comment'
  | 'contact'
  | 'article_like'
  | 'article_comment'

export interface AdminNotificationItem {
  id: string
  kind: AdminNotificationKind
  payload: Record<string, unknown>
  created_at: string
  read: boolean
}

export interface AdminStats {
  totalUsers: number
  totalLessons: number
  downloads: number
  revenue: number
  totalGrades?: number
  totalSubjects?: number
  totalChapters?: number
  totalCategories?: number
  totalPurchases?: number
  newLessonsThisMonth?: number
  newUsersThisMonth?: number
  newUsersThisYear?: number
  downloadsThisMonth?: number
  downloadsThisYear?: number
  revenueThisMonth?: number
  revenueThisYear?: number
  freeVsPaid?: { free: number; paid: number }
  lessonsByGrade?: { grade: string; count: number }[]
  recentDownloads: {
    id: string
    downloaded_at: string
    users?: { name: string | null } | null
    lessons?: { title: string } | null
  }[]
  recentPurchases?: unknown[]
  recentUsers?: unknown[]
  topLessons: {
    lesson_id: string
    title: string
    count: number
  }[]
  /** Rating & comment KPIs */
  totalRatings?: number
  averageRating?: number
  totalComments?: number
  ratingsThisMonth?: number
  commentsThisMonth?: number
}
