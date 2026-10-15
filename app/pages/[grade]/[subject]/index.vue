<script setup lang="ts">
import type { LessonChip } from '~/lib/lessonContext'
import type { Chapter, Grade, Subject } from '~/types/database'
import { catalogChapterCountLabel, subjectCatalogView } from '~/utils/catalogLists'

interface SubjectLesson {
  id: string
  slug: string
  title: string
  is_free: boolean
  excerpt?: string | null
  tags?: string[]
  preview_url?: string | null
  page_count?: number | null
  file_bytes?: number | null
  bookmarked?: boolean
}

type LessonsPage = {
  items: SubjectLesson[]
  total: number
  page: number
  pageSize: number
}

interface ChapterWithCounts extends Chapter {
  lesson_count?: number
}

const route = useRoute()
const gradeSlug = route.params.grade as string
const subjectSlug = route.params.subject as string

const page = computed(() => {
  const raw = route.query.page
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!Number.isFinite(value) || value < 1) return 1
  return Math.floor(value)
})

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
const { data: chaptersData, error: chaptersError } = await useFetch<ChapterWithCounts[]>('/api/chapters', {
  query: { subject_id: subject!.id, counts: '1' },
})
const { data: lessonsPage, error: lessonsError, status: lessonsStatus } = await useFetch<LessonsPage>('/api/lessons', {
  query: computed(() => ({
    subject_id: subject!.id,
    page: page.value,
  })),
  credentials: 'include',
  watch: [page],
  default: () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
})

const chapters = computed(() => chaptersData.value ?? [])
const subjectLessons = computed(() => lessonsPage.value?.items ?? [])
const lessonsTotal = computed(() => lessonsPage.value?.total ?? 0)
const pageSize = computed(() => lessonsPage.value?.pageSize ?? 20)
const catalog = computed(() => subjectCatalogView({
  chaptersFailed: Boolean(chaptersError.value),
  chapterCount: chapters.value.length,
  lessonsFailed: Boolean(lessonsError.value),
  lessonCount: lessonsTotal.value,
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
  tags: lesson.tags,
  is_free: lesson.is_free,
  preview_url: lesson.preview_url,
  page_count: lesson.page_count,
  file_bytes: lesson.file_bytes,
  bookmarked: lesson.bookmarked,
})))

async function onPageChange(next: number) {
  await navigateTo({
    path: route.path,
    query: {
      ...(next > 1 ? { page: String(next) } : {}),
    },
  })
}

useHead(() => ({
  title: subject ? `${subject.name} - ${grade?.name}` : 'Μάθημα',
}))
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-12">
    <header>
      <CatalogBackLink :to="gradeTo" :name="grade?.name ?? 'Τάξη'" />
      <div class="mt-5 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
        <div class="min-w-0 max-w-3xl flex-1">
          <h1 class="font-heading text-4xl font-extrabold leading-tight tracking-tight text-balance text-foreground sm:text-5xl">
            {{ subject?.name ?? 'Μάθημα' }}
          </h1>
          <CatalogChips class="mt-4" :chips="chips" />
        </div>
        <CatalogCover
          class="w-full max-w-52 shrink-0 sm:max-w-60"
          :image-url="subject?.image_url"
          :alt="subject?.name ?? 'Μάθημα'"
          show-full
        />
      </div>
    </header>

    <section v-if="catalog.showChapters" class="mt-10">
      <CatalogSectionHeading title="Κεφάλαια" icon="bi-journal-bookmark" tone="amethyst" />
      <div class="flex flex-col gap-4">
        <CatalogThumbCard
          v-for="chapter in chapters"
          :key="chapter.id"
          :to="`${gradeTo}/${subject?.slug}/${chapter.slug}`"
          :title="chapter.title"
          :text="chapter.description"
          :image-url="chapter.image_url"
          :count-label="catalogChapterCountLabel(chapter.lesson_count ?? 0)"
        />
      </div>
    </section>
    <p v-else-if="catalog.chaptersMessage" class="mt-10 text-muted-foreground">
      {{ catalog.chaptersMessage }}
    </p>

    <section v-if="catalog.showLessons" class="mt-10">
      <CatalogSectionHeading
        :title="catalog.lessonHeading"
        icon="bi-folder"
        tone="laurel"
      />
      <CatalogLessonList :lessons="lessonRows" />
      <CatalogPager
        :page="page"
        :total="lessonsTotal"
        :page-size="pageSize"
        :disabled="lessonsStatus === 'pending'"
        @update:page="onPageChange"
      />
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
