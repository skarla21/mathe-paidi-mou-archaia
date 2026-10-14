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
