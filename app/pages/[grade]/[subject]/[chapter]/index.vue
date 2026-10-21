<script setup lang="ts">
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

useHead(() => ({
  ...describedHead(
    chapter.value ? chapter.value.title : 'Κεφάλαιο',
    chapter.value?.description,
    [],
    route.path,
  ),
  script: tree.value
    ? [jsonLdScript(jsonLdGraph([
        breadcrumbList([
          { name: 'Αρχική', path: '/' },
          { name: tree.value.grade.name, path: gradeTo.value },
          { name: tree.value.subject.name, path: subjectTo.value },
          { name: chapter.value.title, path: route.path },
        ]),
      ]), 'ld-json')]
    : [],
}))

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
  <div class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-10 lg:py-12">
      <header id="chapter-title">
        <NuxtLink :to="subjectTo" class="inline-flex items-center gap-2 text-[15px] font-semibold text-foreground">
          <VIcon name="bi-arrow-left" class="size-4 shrink-0" aria-hidden="true" />
          {{ tree?.subject.name ?? 'Μάθημα' }}
        </NuxtLink>
        <h1 class="mt-5 font-heading text-5xl leading-none text-foreground sm:text-6xl">
          {{ chapter.title }}
        </h1>
        <p v-if="chapter.description" class="mt-5 max-w-2xl text-lg leading-relaxed text-foreground">
          {{ chapter.description }}
        </p>
      </header>

      <section v-if="lessonState === 'ready'" id="chapter-lessons" class="mt-10">
        <h2 class="mb-4 font-heading text-2xl text-foreground">Υλικό</h2>
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
