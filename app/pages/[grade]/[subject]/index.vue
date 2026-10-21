<script setup lang="ts">
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
  avg_rating?: number | null
  rating_count?: number | null
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
  avg_rating: lesson.avg_rating,
  rating_count: lesson.rating_count,
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
  ...describedHead(
    subject ? `${subject.name} - ${grade?.name}` : 'Μάθημα',
    subject && grade
      ? `${subject.name}, ${grade.name}. Υλικό και κεφάλαια για τα Αρχαία και τα υπόλοιπα μαθήματα της τάξης.`
      : null,
    [],
    route.path,
  ),
  script: subject && grade
    ? [jsonLdScript(jsonLdGraph([
        breadcrumbList([
          { name: 'Αρχική', path: '/' },
          { name: grade.name, path: gradeTo.value },
          { name: subject.name, path: route.path },
        ]),
      ]), 'ld-json')]
    : [],
}))
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-10 lg:py-12">
      <NuxtLink :to="gradeTo" class="inline-flex items-center gap-2 text-[15px] font-semibold text-foreground">
        <VIcon name="bi-arrow-left" class="size-4 shrink-0" aria-hidden="true" />
        {{ grade?.name ?? 'Τάξη' }}
      </NuxtLink>
      <h1 class="mt-5 font-heading text-5xl leading-none text-foreground sm:text-6xl">
        {{ subject?.name ?? 'Μάθημα' }}
      </h1>

      <section v-if="catalog.showChapters" class="mt-10">
        <h2 class="mb-4 font-heading text-2xl text-foreground">Κεφάλαια</h2>
        <div class="flex flex-col gap-3">
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
        <h2 class="mb-4 font-heading text-2xl text-foreground">{{ catalog.lessonHeading }}</h2>
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
