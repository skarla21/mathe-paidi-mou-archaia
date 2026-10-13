export const LESSON_TYPE_HEADING = 'Τύπος υλικού'

export function downloadsEmptyMessage(filtered) {
  return filtered ? 'Δεν βρέθηκαν λήψεις.' : 'Δεν υπάρχουν λήψεις ακόμη.'
}

export function lessonTypeLabel(row) {
  if (!row.lessons) return '—'
  return row.lessons.is_free ? 'Δωρεάν' : 'Επί πληρωμή'
}
