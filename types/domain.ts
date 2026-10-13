// types/domain.ts
// Shared domain type definitions derived from supabase/schema.sql.
// Optional joined-data properties reflect actual API response shapes.

export interface AdminListPage<T> {
  items: T[]
  total: number
  page: number
  pageSize: number
}

// ---------------------------------------------------------------------------
// Core entities (match DB columns 1-to-1)
// ---------------------------------------------------------------------------

export interface Grade {
  id: string
  name: string
  order: number
}

export interface Subject {
  id: string
  name: string
  grade_id: string
}

export interface LessonCategory {
  id: string
  name: string
  order: number
}

export interface Chapter {
  id: string
  title: string
  description: string | null
  grade_id: string
  subject_id: string
  image_url: string | null
  order: number
  created_at: string
}

export interface LessonPlacement {
  id: string
  lesson_id: string
  subject_id: string | null
  chapter_id: string | null
  category_id: string | null
  order: number
  subjects?: { name: string; grade_id?: string } | null
  chapters?: { title: string; grade_id?: string; subject_id?: string } | null
  categories?: { name: string } | null
}

export interface Lesson {
  id: string
  title: string
  content: string | null
  is_free: boolean
  price: number
  content_url: string | null
  created_at: string
  placements?: LessonPlacement[]
}

/**
 * Shape returned by GET /api/lessons/[id].
 * Spreads the lesson row and adds access-control fields.
 */
export interface LessonDetail extends Lesson {
  /** Whether the current user may view the PDF */
  can_access: boolean
}

export interface Purchase {
  id: string
  user_id: string
  lesson_id: string
  stripe_session_id: string | null
  created_at: string
}

/**
 * One row inside GET /api/admin/purchases `items`.
 * Supabase join syntax: `select('*, users!inner(name, email), lessons!inner(title)')`.
 */
export interface PurchaseWithJoins extends Purchase {
  users: { name: string | null; email: string | null } | null
  lessons: { title: string | null } | null
}

export interface LessonDownload {
  id: string
  user_id: string
  lesson_id: string
  downloaded_at: string
}

/**
 * Shape returned by GET /api/admin/downloads.
 * Supabase join syntax: `select('*, users(name, email), lessons(title, is_free)')`.
 */
export interface DownloadWithJoins extends LessonDownload {
  users: { name: string | null; email: string | null } | null
  lessons: { title: string | null; is_free: boolean } | null
}

// ---------------------------------------------------------------------------
// User (DB row shape -- NOT the auth session user)
// ---------------------------------------------------------------------------

export interface LessonRating {
  id: string
  user_id: string
  lesson_id: string
  rating: number
  created_at: string
  updated_at: string
}

export interface LessonComment {
  id: string
  user_id: string
  lesson_id: string
  body: string
  created_at: string
  updated_at: string
}

export interface DbUser {
  id: string
  email: string | null
  name: string | null
  avatar_url: string | null
  isAdmin: boolean
  password_hash: string | null
  provider: string
  created_at: string
}
