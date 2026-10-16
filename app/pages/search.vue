<script setup lang="ts">
import { foldGreekSearch } from '#shared/utils/foldGreekSearch.mjs'
import { catalogListState } from '~/utils/catalogLists'

type LessonSearchItem = {
  id: string
  title: string
  url: string
  excerpt: string
  tags: string[]
  is_free: boolean
  preview_url: string | null
  page_count: number | null
  file_bytes: number | null
  bookmarked: boolean
  avg_rating?: number
  rating_count?: number
}

type LessonSearchPage = {
  items: LessonSearchItem[]
  total: number
  page: number
  pageSize: number
}

const route = useRoute()

const queryText = computed(() => {
  const raw = route.query.q
  return (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? ''
})

const page = computed(() => {
  const raw = route.query.page
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!Number.isFinite(value) || value < 1) return 1
  return Math.floor(value)
})

const queryReady = computed(() => foldGreekSearch(queryText.value).length >= 2)

const searchInput = ref(queryText.value)

watch(queryText, (value) => {
  if (value !== searchInput.value) searchInput.value = value
})

const { data, error, status } = await useFetch<LessonSearchPage>('/api/search/lessons', {
  query: computed(() => ({
    q: queryText.value,
    page: page.value,
  })),
  credentials: 'include',
  watch: [queryText, page],
  immediate: true,
  default: () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
})

const listState = computed(() => {
  if (!queryReady.value) return 'short' as const
  if (status.value === 'pending' && !data.value?.items.length) return 'loading' as const
  if (error.value) return 'error' as const
  return catalogListState(Boolean(error.value), data.value?.items.length ?? 0)
})

const lessonRows = computed(() => (data.value?.items ?? []).map((lesson) => ({
  id: lesson.id,
  title: lesson.title,
  to: lesson.url,
  excerpt: lesson.excerpt,
  tags: lesson.tags ?? [],
  is_free: lesson.is_free,
  preview_url: lesson.preview_url,
  page_count: lesson.page_count,
  file_bytes: lesson.file_bytes,
  bookmarked: Boolean(lesson.bookmarked),
  avg_rating: lesson.avg_rating,
  rating_count: lesson.rating_count,
})))

const total = computed(() => data.value?.total ?? 0)
const pageSize = computed(() => data.value?.pageSize ?? 20)

const resultsLabel = computed(() => {
  if (total.value === 1) return '1 αποτέλεσμα'
  return `${total.value} αποτελέσματα`
})

useHead(() => ({
  title: queryText.value ? `Αναζήτηση: ${queryText.value}` : 'Αναζήτηση',
}))

async function onPageChange(next: number) {
  await navigateTo({
    path: '/search',
    query: {
      q: queryText.value,
      ...(next > 1 ? { page: String(next) } : {}),
    },
  })
}

onMounted(() => {
  if (!import.meta.client) return
  const { revealSection } = useGsapReveal()
  nextTick(() => {
    revealSection('#search-title')
    revealSection('#search-results')
  })
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-12">
    <header id="search-title" class="max-w-3xl">
      <CatalogBackLink to="/" name="Αρχική" />
      <h1 class="mt-5 font-heading text-4xl font-extrabold leading-tight tracking-tight text-balance text-foreground sm:text-5xl">
        Αποτελέσματα αναζήτησης
      </h1>
      <p
        v-if="queryText"
        class="mt-3 text-lg leading-relaxed text-muted-foreground"
      >
        Αποτελέσματα για «{{ queryText }}»
      </p>
      <p
        v-if="queryReady && listState === 'ready'"
        class="mt-2 text-sm font-medium text-muted-foreground"
      >
        {{ resultsLabel }}
      </p>

      <SearchGlobalSearch
        v-model="searchInput"
        size="lg"
        submit-button
        class="mt-6 max-w-xl"
      />
    </header>

    <section id="search-results" class="mt-10">
      <p v-if="listState === 'short'" class="text-muted-foreground">
        Πληκτρολόγησε τουλάχιστον 2 χαρακτήρες για να δεις αποτελέσματα.
      </p>
      <p v-else-if="listState === 'loading'" class="text-muted-foreground">
        Γίνεται αναζήτηση...
      </p>
      <p v-else-if="listState === 'error'" class="text-muted-foreground">
        Η αναζήτηση δεν ολοκληρώθηκε. Δοκίμασε ξανά σε λίγο.
      </p>
      <p v-else-if="listState === 'empty'" class="text-muted-foreground">
        Δεν βρέθηκαν αποτελέσματα για «{{ queryText }}».
      </p>
      <template v-else>
        <h2 class="mb-4 font-heading text-xl font-semibold">
          Υλικό
        </h2>
        <CatalogLessonList :lessons="lessonRows" />
        <CatalogPager
          :page="page"
          :total="total"
          :page-size="pageSize"
          :disabled="status === 'pending'"
          @update:page="onPageChange"
        />
      </template>
    </section>
  </div>
</template>
