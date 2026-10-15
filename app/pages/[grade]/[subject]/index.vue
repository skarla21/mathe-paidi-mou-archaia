<script setup lang="ts">
import type { LessonChip } from '~/lib/lessonContext'
import type { Chapter, Grade, Subject } from '~/types/database'
import { subjectCatalogView } from '~/utils/catalogLists'

interface SubjectLesson {
  id: string
  slug: string
  title: string
  is_free: boolean
  excerpt?: string | null
  preview_url?: string | null
  page_count?: number | null
  file_bytes?: number | null
  bookmarked?: boolean
  tags?: string[]
}

const route = useRoute()
const gradeSlug = route.params.grade as string
const subjectSlug = route.params.subject as string

const { data: gradesData, error: gradesError } = await useFetch<Grade[]>('/api/grades')
throwIfMissing(gradesError.value, false)
const grade = gradesData.value?.find((item) => item.slug === gradeSlug)
throwIfMissing(null, !grade)
const { data: subjectsData, error: subjectsError } = await useFetch<Subject[]>('/api/subjects', {
  query: { grade_id: grade!.id },
})
throwIfMissing(subjectsError.value, false)
const subject = subjectsData.value?.find((item) => item.slug === subjectSlug)
throwIfMissing(null, !subject)
const { data: chaptersData, error: chaptersError } = await useFetch<Chapter[]>('/api/chapters', {
  query: { subject_id: subject!.id },
})
const { data: subjectLessonsData, error: lessonsError } = await useFetch<SubjectLesson[]>('/api/lessons', {
  query: { subject_id: subject!.id },
})

const chapters = computed(() => chaptersData.value ?? [])
const subjectLessons = computed(() => subjectLessonsData.value ?? [])
const catalog = computed(() => subjectCatalogView({
  chaptersFailed: Boolean(chaptersError.value),
  chapterCount: chapters.value.length,
  lessonsFailed: Boolean(lessonsError.value),
  lessonCount: subjectLessons.value.length,
}))
const gradeTo = computed(() => `/${grade?.slug ?? ''}`)
const chips = computed<LessonChip[]>(() => (
  grade
    ? [{ name: grade.name, to: gradeTo.value, tone: 'grade' }]
    : []
))
const lessonRows = computed(() => subjectLessons.value.map((lesson) => ({
  id: lesson.id,
  title: lesson.title,
  to: `${gradeTo.value}/${subject?.slug}/lesson/${lesson.slug}`,
  excerpt: lesson.excerpt,
  is_free: lesson.is_free,
  preview_url: lesson.preview_url,
  page_count: lesson.page_count,
  file_bytes: lesson.file_bytes,
  bookmarked: lesson.bookmarked,
  tags: lesson.tags,
})))

useHead(() => ({
  title: subject ? `${subject.name} - ${grade?.name}` : 'Μάθημα',
}))
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-12">
    <header class="max-w-3xl">
      <CatalogBackLink :to="gradeTo" :name="grade?.name ?? 'Τάξη'" />
      <h1 class="mt-5 font-heading text-4xl font-extrabold leading-tight tracking-tight text-balance text-foreground sm:text-5xl">
        {{ subject?.name ?? 'Μάθημα' }}
      </h1>
      <CatalogChips class="mt-4" :chips="chips" />
    </header>

    <section v-if="catalog.showChapters" class="mt-10">
      <h2 class="mb-4 font-heading text-xl font-semibold">
        Κεφάλαια
      </h2>
      <div class="grid gap-4 lg:grid-cols-2">
        <CatalogThumbCard
          v-for="chapter in chapters"
          :key="chapter.id"
          :to="`${gradeTo}/${subject?.slug}/${chapter.slug}`"
          :title="chapter.title"
          :text="chapter.description"
          :image-url="chapter.image_url"
        />
      </div>
    </section>
    <p v-else-if="catalog.chaptersMessage" class="mt-10 text-muted-foreground">
      {{ catalog.chaptersMessage }}
    </p>

    <section v-if="catalog.showLessons" class="mt-10">
      <h2 class="mb-4 font-heading text-xl font-semibold">
        {{ catalog.lessonHeading }}
      </h2>
      <CatalogLessonList :lessons="lessonRows" />
    </section>
    <p v-else-if="catalog.lessonsMessage" class="mt-10 text-muted-foreground">
      {{ catalog.lessonsMessage }}
    </p>

    <p v-if="catalog.blockedMessage" class="mt-10 text-muted-foreground">
      {{ catalog.blockedMessage }}
    </p>
    <p v-else-if="catalog.emptyMessage" class="mt-10 text-muted-foreground">
      {{ catalog.emptyMessage }}
    </p>
  </div>
</template>
