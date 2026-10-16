<script setup lang="ts">
import type { LessonChip } from '~/lib/lessonContext'
import { catalogListState } from '~/utils/catalogLists'

interface Lesson {
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
  avg_rating?: number | null
  rating_count?: number | null
}

type LessonsPage = {
  items: Lesson[]
  total: number
  page: number
  pageSize: number
}

interface Tree {
  grade: { name: string; slug: string }
  subject: { name: string; slug: string }
  chapter: {
    id: string
    title: string
    description?: string | null
    slug: string
    image_url?: string | null
  }
}

const route = useRoute()
const page = computed(() => {
  const raw = route.query.page
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!Number.isFinite(value) || value < 1) return 1
  return Math.floor(value)
})

const { data: tree, error } = await useFetch<Tree>('/api/tree', {
  query: {
    grade: route.params.grade,
    subject: route.params.subject,
    chapter: route.params.chapter,
  },
})
throwIfMissing(error.value, !tree.value?.chapter)

const chapter = computed(() => tree.value!.chapter)
const { data: lessonsPage, error: lessonsError, status: lessonsStatus } = await useFetch<LessonsPage>('/api/lessons', {
  query: computed(() => ({
    chapter_id: chapter.value.id,
    page: page.value,
  })),
  credentials: 'include',
  watch: [page],
  default: () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
})
const lessons = computed(() => lessonsPage.value?.items ?? [])
const lessonsTotal = computed(() => lessonsPage.value?.total ?? 0)
const pageSize = computed(() => lessonsPage.value?.pageSize ?? 20)
const lessonState = computed(() => catalogListState(Boolean(lessonsError.value), lessonsTotal.value))

const gradeTo = computed(() => `/${tree.value?.grade.slug ?? ''}`)
const subjectTo = computed(() => `${gradeTo.value}/${tree.value?.subject.slug ?? ''}`)
const chips = computed<LessonChip[]>(() => {
  const current = tree.value
  if (!current) return []
  return [
    { name: current.grade.name, to: gradeTo.value, tone: 'grade' },
    { name: current.subject.name, to: subjectTo.value, tone: 'subject' },
  ]
})
const lessonRows = computed(() => lessons.value.map((lesson) => ({
  id: lesson.id,
  title: lesson.title,
  to: `${subjectTo.value}/${chapter.value.slug}/${lesson.slug}`,
  excerpt: lesson.excerpt,
  is_free: lesson.is_free,
  preview_url: lesson.preview_url,
  page_count: lesson.page_count,
  file_bytes: lesson.file_bytes,
  bookmarked: lesson.bookmarked,
  tags: lesson.tags,
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

useHead(() => ({ title: chapter.value ? chapter.value.title : 'Κεφάλαιο' }))

onMounted(() => {
  if (import.meta.client) {
    const { revealSection } = useGsapReveal()
    nextTick(() => {
      revealSection('#chapter-title')
      revealSection('#chapter-lessons')
    })
  }
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-12">
    <header id="chapter-title">
      <CatalogBackLink :to="subjectTo" :name="tree?.subject.name ?? 'Μάθημα'" />
      <div class="mt-5 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between sm:gap-10">
        <div class="min-w-0 max-w-3xl flex-1">
          <h1 class="font-heading text-4xl font-extrabold leading-tight tracking-tight text-balance text-foreground sm:text-5xl">
            {{ chapter.title }}
          </h1>
          <CatalogChips class="mt-4" :chips="chips" />
          <p v-if="chapter.description" class="mt-5 text-lg leading-relaxed text-muted-foreground">
            {{ chapter.description }}
          </p>
        </div>
        <CatalogCover
          class="w-full max-w-52 shrink-0 sm:max-w-60"
          :image-url="chapter.image_url"
          :alt="chapter.title"
          show-full
        />
      </div>
    </header>

    <section v-if="lessonState === 'ready'" id="chapter-lessons" class="mt-10">
      <CatalogSectionHeading title="Υλικό" icon="bi-folder" tone="laurel" />
      <CatalogLessonList :lessons="lessonRows" />
      <CatalogPager
        :page="page"
        :total="lessonsTotal"
        :page-size="pageSize"
        :disabled="lessonsStatus === 'pending'"
        @update:page="onPageChange"
      />
    </section>
    <p v-else id="chapter-lessons" class="mt-10 text-muted-foreground">
      {{ lessonState === 'error' ? 'Το υλικό δεν φορτώθηκε. Δοκίμασε ξανά σε λίγο.' : 'Δεν υπάρχει ακόμη υλικό.' }}
    </p>
  </div>
</template>
