import { embedCount, type CountEmbed } from './embedCount'

export function mapSubjectWithCounts(row: Record<string, unknown> & {
  chapters?: Array<{ lesson_placements?: CountEmbed }> | null
  lesson_placements?: CountEmbed
}) {
  const { chapters, lesson_placements, ...subject } = row
  const chapterRows = chapters ?? []
  const inChapters = chapterRows.reduce(
    (sum, chapter) => sum + embedCount(chapter.lesson_placements),
    0,
  )
  return {
    ...subject,
    chapter_count: chapterRows.length,
    lesson_count: embedCount(lesson_placements) + inChapters,
  }
}

export function mapChapterWithCounts(row: Record<string, unknown> & {
  lesson_placements?: CountEmbed
}) {
  const { lesson_placements, ...chapter } = row
  return {
    ...chapter,
    lesson_count: embedCount(lesson_placements),
  }
}
