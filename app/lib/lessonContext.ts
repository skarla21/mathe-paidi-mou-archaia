export type LessonChipTone = 'grade' | 'subject' | 'chapter' | 'category'

export interface LessonChip {
  name: string
  to: string
  tone: LessonChipTone
}

export interface LessonParent {
  name: string
  to: string
}

export interface LessonPageContext {
  parent: LessonParent
  chips: LessonChip[]
}

interface NamedSlug {
  name: string
  slug: string
}

interface TitledSlug {
  title: string
  slug: string
}

export function chapterLessonContext(tree: {
  grade: NamedSlug
  subject: NamedSlug
  chapter: TitledSlug
}): LessonPageContext {
  const gradeTo = `/${tree.grade.slug}`
  const subjectTo = `${gradeTo}/${tree.subject.slug}`
  const chapterTo = `${subjectTo}/${tree.chapter.slug}`
  return {
    parent: { name: tree.chapter.title, to: chapterTo },
    chips: [
      { name: tree.grade.name, to: gradeTo, tone: 'grade' },
      { name: tree.subject.name, to: subjectTo, tone: 'subject' },
      { name: tree.chapter.title, to: chapterTo, tone: 'chapter' },
    ],
  }
}

export function subjectLessonContext(tree: {
  grade: NamedSlug
  subject: NamedSlug
}): LessonPageContext {
  const gradeTo = `/${tree.grade.slug}`
  const subjectTo = `${gradeTo}/${tree.subject.slug}`
  return {
    parent: { name: tree.subject.name, to: subjectTo },
    chips: [
      { name: tree.grade.name, to: gradeTo, tone: 'grade' },
      { name: tree.subject.name, to: subjectTo, tone: 'subject' },
    ],
  }
}

export function categoryLessonContext(category: NamedSlug): LessonPageContext {
  const to = `/category/${category.slug}`
  return {
    parent: { name: category.name, to },
    chips: [{ name: category.name, to, tone: 'category' }],
  }
}
