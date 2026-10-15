export function catalogListState(failed: boolean, count: number): 'error' | 'empty' | 'ready' {
  if (failed && count === 0) return 'error'
  if (count === 0) return 'empty'
  return 'ready'
}

export function subjectCatalogView(input: {
  chaptersFailed: boolean
  chapterCount: number
  lessonsFailed: boolean
  lessonCount: number
}) {
  const showChapters = input.chapterCount > 0
  const showLessons = input.lessonCount > 0
  const chaptersMissing = input.chaptersFailed && !showChapters
  const lessonsMissing = input.lessonsFailed && !showLessons
  const blocked = chaptersMissing && lessonsMissing
  return {
    showChapters,
    showLessons,
    lessonHeading: showChapters ? 'Άλλο υλικό' : 'Υλικό',
    chaptersMessage: !blocked && chaptersMissing ? 'Τα κεφάλαια δεν φορτώθηκαν. Δοκίμασε ξανά σε λίγο.' : '',
    lessonsMessage: !blocked && lessonsMissing ? 'Το υλικό δεν φορτώθηκε. Δοκίμασε ξανά σε λίγο.' : '',
    blockedMessage: blocked ? 'Το υλικό δεν φορτώθηκε. Δοκίμασε ξανά σε λίγο.' : '',
    emptyMessage: !showChapters && !showLessons && !input.chaptersFailed && !input.lessonsFailed
      ? 'Δεν υπάρχει ακόμη υλικό σε αυτό το μάθημα.'
      : '',
  }
}

function greekCount(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

/** Label for a subject card: chapters and/or total lesson placements (direct + via chapters). */
export function catalogSubjectCountLabel(chapterCount: number, lessonCount: number): string {
  const chapters = chapterCount > 0 ? greekCount(chapterCount, 'κεφάλαιο', 'κεφάλαια') : ''
  const lessons = lessonCount > 0 ? greekCount(lessonCount, 'αρχείο', 'αρχεία') : ''
  if (chapters && lessons) return `${chapters} · ${lessons}`
  if (chapters) return chapters
  if (lessons) return lessons
  return 'Χωρίς υλικό'
}

/** Label for a chapter card: lessons placed on that chapter. */
export function catalogChapterCountLabel(lessonCount: number): string {
  if (lessonCount <= 0) return 'Χωρίς υλικό'
  return greekCount(lessonCount, 'αρχείο', 'αρχεία')
}
