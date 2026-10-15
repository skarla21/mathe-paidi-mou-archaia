<script setup lang="ts">
import ContentCard from '~/components/content/ContentCard.vue'
import CatalogPager from '~/components/catalog/CatalogPager.vue'
import UiSkeleton from '~/components/ui/Skeleton.vue'
import { catalogListState } from '~/utils/catalogLists'

definePageMeta({ layout: 'default' })
useHead(() => ({ title: 'Άρθρα' }))

type Row = {
  id: string
  title: string
  slug: string
  tags: string[]
  reading_time_minutes: number
  image_url?: string | null
  created_at: string
  excerpt?: string
}

type ArticlesPage = {
  items: Row[]
  total: number
  page: number
  pageSize: number
}

const route = useRoute()

const searchInput = ref('')
const searchQuery = computed(() => {
  const raw = route.query.q
  return (Array.isArray(raw) ? raw[0] : raw)?.trim() ?? ''
})

watch(searchQuery, (value) => {
  if (value !== searchInput.value) searchInput.value = value
})

const page = computed(() => {
  const raw = route.query.page
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!Number.isFinite(value) || value < 1) return 1
  return Math.floor(value)
})

const { data, error, status } = await useFetch<ArticlesPage>('/api/articles', {
  query: computed(() => ({
    page: page.value,
    ...(searchQuery.value ? { q: searchQuery.value } : {}),
  })),
  credentials: 'include',
  watch: [page, searchQuery],
  immediate: true,
  default: () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
})

const listState = computed(() => {
  if (status.value === 'pending' && !data.value?.items.length) return 'loading' as const
  if (error.value) return 'error' as const
  return catalogListState(Boolean(error.value), data.value?.items.length ?? 0)
})

const rows = computed(() => data.value?.items ?? [])
const total = computed(() => data.value?.total ?? 0)
const pageSize = computed(() => data.value?.pageSize ?? 20)

let searchTimer: ReturnType<typeof setTimeout> | undefined

async function applySearch(q: string) {
  await navigateTo({
    path: '/articles',
    query: {
      ...(q ? { q } : {}),
    },
  })
}

function onSearchInput() {
  if (searchTimer !== undefined) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    searchTimer = undefined
    void applySearch(searchInput.value.trim())
  }, 300)
}

async function onPageChange(next: number) {
  await navigateTo({
    path: '/articles',
    query: {
      ...(searchQuery.value ? { q: searchQuery.value } : {}),
      ...(next > 1 ? { page: String(next) } : {}),
    },
  })
}

onBeforeUnmount(() => {
  if (searchTimer !== undefined) clearTimeout(searchTimer)
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-12">
    <div class="max-w-3xl">
      <LayoutPageIntro title="Άρθρα" />
    </div>

    <div class="mt-2 mb-6 max-w-md">
      <div
        class="flex w-full items-center gap-2 rounded-full border border-border bg-secondary px-3.5 shadow-sm transition-all hover:bg-muted focus-within:bg-card focus-within:ring-2 focus-within:ring-primary/30"
      >
        <VIcon
          name="bi-search"
          aria-hidden="true"
          class="size-4 shrink-0 text-muted-foreground pointer-events-none"
        />
        <input
          v-model="searchInput"
          type="search"
          placeholder="Αναζήτηση άρθρων..."
          aria-label="Αναζήτηση άρθρων..."
          class="h-9 w-full border-none bg-transparent text-[13.5px] text-foreground placeholder:text-muted-foreground focus:outline-none"
          @input="onSearchInput"
        />
      </div>
    </div>

    <div v-if="listState === 'loading'" class="mt-2 space-y-4">
      <div
        v-for="i in 4"
        :key="i"
        class="flex gap-4 rounded-3xl border border-border bg-card p-4"
      >
        <UiSkeleton class="aspect-4/3 w-44 shrink-0 rounded-2xl" />
        <div class="min-w-0 flex-1 space-y-3">
          <UiSkeleton class="h-6 w-3/4 rounded-lg" />
          <UiSkeleton class="h-4 w-full rounded-lg" />
          <UiSkeleton class="h-4 w-32 rounded-lg" />
        </div>
      </div>
    </div>

    <p v-else-if="listState === 'error'" class="mt-2 text-muted-foreground">
      Κάτι πήγε στραβά. Δοκίμασε ξανά σε λίγο.
    </p>

    <p v-else-if="listState === 'empty' && searchQuery" class="mt-2 text-muted-foreground">
      Δεν βρέθηκαν άρθρα.
    </p>

    <p v-else-if="listState === 'empty'" class="mt-2 text-muted-foreground">
      Δεν υπάρχουν άρθρα ακόμα.
    </p>

    <template v-else>
      <ul class="mt-2 flex w-full flex-col gap-3">
        <li v-for="a in rows" :key="a.id" class="w-full">
          <ContentCard
            :to="`/articles/${a.slug}`"
            :title="a.title"
            :description="a.excerpt"
            :chips="a.tags ?? []"
            chip-search
            chip-search-path="/articles"
            :preview-url="a.image_url"
            thumb-layout="landscape"
            preview-mode="cover"
            placeholder-icon="bi-newspaper"
            :reading-minutes="a.reading_time_minutes"
          />
        </li>
      </ul>
      <CatalogPager
        :page="page"
        :total="total"
        :page-size="pageSize"
        :disabled="status === 'pending'"
        @update:page="onPageChange"
      />
    </template>
  </div>
</template>
