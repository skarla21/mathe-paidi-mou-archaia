import type { SupabaseClient } from '@supabase/supabase-js'
import { buildSitemapEntries } from '#shared/utils/sitemap.mjs'
import { canonicalLessonPaths, chapterPublicPath } from './contentPath'

type SlugRow = { slug: string | null }
type GradeRel = { slug: string | null }
type SubjectRow = { slug: string | null; grades: GradeRel | GradeRel[] | null }
type ChapterRow = {
  slug: string | null
  subjects: { slug: string | null; grades: GradeRel | GradeRel[] | null } | { slug: string | null; grades: GradeRel | GradeRel[] | null }[] | null
}
type LessonIdRow = { id: string }
type ArticleRow = {
  slug: string | null
  title: string | null
  published: boolean
  updated_at: string | null
}

function one<T>(value: T | T[] | null | undefined): T | null {
  if (!value) return null
  return Array.isArray(value) ? value[0] ?? null : value
}

function fail(label: string, message: string): never {
  console.error(`[sitemap] ${label}`, message)
  throw createError({ statusCode: 500, message: 'Κάτι πήγε στραβά' })
}

async function fetchPaged<T>(
  label: string,
  load: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>,
) {
  const pageSize = 1000
  const rows: T[] = []
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await load(from, from + pageSize - 1)
    if (error) fail(label, error.message)
    const batch = data ?? []
    rows.push(...batch)
    if (batch.length < pageSize) break
  }
  return rows
}

function subjectPath(row: SubjectRow) {
  const grade = one(row.grades)
  if (!row.slug || !grade?.slug) return null
  return `/${grade.slug}/${row.slug}`
}

export async function publicSitemapEntries(supabase: SupabaseClient) {
  const [grades, subjects, chapters, categories, lessons, articles] = await Promise.all([
    fetchPaged<SlugRow>('grades', (from, to) => supabase.from('grades').select('slug').order('id', { ascending: true }).range(from, to)),
    fetchPaged<SubjectRow>('subjects', (from, to) => supabase.from('subjects').select('slug, grades(slug)').order('id', { ascending: true }).range(from, to)),
    fetchPaged<ChapterRow>('chapters', (from, to) => supabase.from('chapters').select('slug, subjects(slug, grades(slug))').order('id', { ascending: true }).range(from, to)),
    fetchPaged<SlugRow>('categories', (from, to) => supabase.from('categories').select('slug').order('id', { ascending: true }).range(from, to)),
    fetchPaged<LessonIdRow>('lessons', (from, to) => supabase.from('lessons').select('id').order('id', { ascending: true }).range(from, to)),
    fetchPaged<ArticleRow>('articles', (from, to) => (
      supabase.from('articles').select('slug, title, published, updated_at').eq('published', true).order('id', { ascending: true }).range(from, to)
    )),
  ])

  const paths = [
    ...grades.flatMap((row) => (row.slug ? [`/${row.slug}`] : [])),
    ...subjects.flatMap((row) => {
      const path = subjectPath(row)
      return path ? [path] : []
    }),
    ...chapters.flatMap((row) => {
      const path = chapterPublicPath(row)
      return path ? [path] : []
    }),
    ...categories.flatMap((row) => (row.slug ? [`/category/${row.slug}`] : [])),
  ]

  const lessonIds = lessons.map((row) => row.id).filter((id) => id.length > 0)
  const lessonPaths = new Map<string, string>()
  for (let index = 0; index < lessonIds.length; index += 200) {
    const batch = await canonicalLessonPaths(supabase, lessonIds.slice(index, index + 200))
    for (const [id, path] of batch) lessonPaths.set(id, path)
  }

  return buildSitemapEntries({
    paths,
    lessonPaths: [...lessonPaths.values()],
    articles,
  })
}
