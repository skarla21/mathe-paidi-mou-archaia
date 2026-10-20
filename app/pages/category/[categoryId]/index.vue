<script setup lang="ts">
import type { LessonChip } from '~/lib/lessonContext'
import { catalogListState } from '~/utils/catalogLists'

interface Category {
  id: string
  name: string
  description?: string | null
  image_url?: string | null
}

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

const route = useRoute()
const categorySlug = route.params.categoryId as string

const page = computed(() => {
  const raw = route.query.page
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!Number.isFinite(value) || value < 1) return 1
  return Math.floor(value)
})

const { data: category, error } = await useFetch<Category>(`/api/categories/${categorySlug}`)
throwIfMissing(error.value, !category.value)

const { data: lessonsPage, error: lessonsError, status: lessonsStatus } = await useFetch<LessonsPage>('/api/lessons', {
  query: computed(() => ({
    category_id: category.value!.id,
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
const chips = computed<LessonChip[]>(() => [
  { name: 'Κατηγορίες', to: '/#categories', tone: 'category' },
])
const lessonRows = computed(() => lessons.value.map((lesson) => ({
  id: lesson.id,
  title: lesson.title,
  to: `/category/${categorySlug}/${lesson.slug}`,
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
    category.value?.name ?? 'Κατηγορία',
    category.value?.description,
    [],
    route.path,
  ),
  script: category.value
    ? [jsonLdScript(jsonLdGraph([
        breadcrumbList([
          { name: 'Αρχική', path: '/' },
          { name: category.value.name, path: route.path },
        ]),
      ]), 'ld-json')]
    : [],
}))

onMounted(() => {
  if (import.meta.client) {
    const { revealSection } = useGsapReveal()
    nextTick(() => {
      revealSection('#category-title')
      revealSection('#category-lessons')
    })
  }
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-12">
    <header id="category-title" class="max-w-3xl">
      <CatalogBackLink to="/#categories" name="Κατηγορίες" />
      <h1 class="mt-5 font-heading text-4xl font-extrabold leading-tight tracking-tight text-balance text-foreground sm:text-5xl">
        {{ category?.name ?? 'Κατηγορία' }}
      </h1>
      <CatalogChips class="mt-4" :chips="chips" />
      <CatalogCover class="mt-6" :image-url="category?.image_url" :alt="category?.name ?? 'Κατηγορία'" />
      <p v-if="category?.description" class="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
        {{ category.description }}
      </p>
    </header>

    <section v-if="lessonState === 'ready'" id="category-lessons" class="mt-10">
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
    <p v-else id="category-lessons" class="mt-10 text-muted-foreground">
      {{ lessonState === 'error' ? 'Το υλικό δεν φορτώθηκε. Δοκίμασε ξανά σε λίγο.' : 'Δεν υπάρχει ακόμη υλικό.' }}
    </p>
  </div>
</template>
