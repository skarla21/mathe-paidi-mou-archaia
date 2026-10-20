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

const { data, status } = await useFetch<LessonSearchPage>('/api/search/lessons', {
  query: computed(() => ({
    q: queryText.value,
    page: page.value,
  })),
  credentials: 'include',
  watch: [queryText, page],
  immediate: true,
  default: () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
})

const settledQuery = ref(status.value === 'success' ? queryText.value : '')
watch(status, (value) => {
  if (value === 'success') settledQuery.value = queryText.value
}, { flush: 'sync' })

const queryMatchesResults = computed(() => settledQuery.value === queryText.value)

const listState = computed(() => {
  if (!queryReady.value) return 'short' as const
  if (status.value === 'error') return 'error' as const
  if (!queryMatchesResults.value || (status.value === 'pending' && !data.value?.items.length)) {
    return 'loading' as const
  }
  return catalogListState(false, data.value?.items.length ?? 0)
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
  if (!queryReady.value) {
    return 'Πληκτρολόγησε τουλάχιστον 2 χαρακτήρες για να δεις αποτελέσματα.'
  }
  const quoted = `για «${queryText.value}»`
  if (listState.value === 'loading') return `Γίνεται αναζήτηση ${quoted}`
  if (listState.value === 'error') {
    return `Η αναζήτηση ${quoted} δεν ολοκληρώθηκε. Δοκίμασε ξανά σε λίγο.`
  }
  if (listState.value === 'empty') return `Κανένα αποτέλεσμα ${quoted}`
  if (total.value === 1) return `1 αποτέλεσμα ${quoted}`
  return `${total.value} αποτελέσματα ${quoted}`
})

useHead(() => describedHead(
  queryText.value ? `Αναζήτηση: ${queryText.value}` : 'Αναζήτηση',
  queryText.value
    ? `Αναζήτηση για «${queryText.value}».`
    : 'Αναζήτηση στο διδακτικό υλικό.',
  [ROBOTS_NOINDEX_FOLLOW],
))

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
      <SearchGlobalSearch
        v-model="searchInput"
        size="lg"
        submit-button
        class="mt-5 max-w-xl"
      />
      <h1 class="mt-6 text-lg font-normal leading-relaxed text-muted-foreground">
        {{ resultsLabel }}
      </h1>
    </header>

    <section v-if="listState === 'ready'" id="search-results" class="mt-10">
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
    </section>
  </div>
</template>
