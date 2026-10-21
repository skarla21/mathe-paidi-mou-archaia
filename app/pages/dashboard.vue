<script setup lang="ts">
import ContentCard from '~/components/content/ContentCard.vue'
import CatalogPager from '~/components/catalog/CatalogPager.vue'
import UiSkeleton from '~/components/ui/Skeleton.vue'

definePageMeta({ middleware: 'auth' })

useHead(() => describedHead(
  'Πίνακας',
  'Τα μαθήματα που έχεις αποθηκεύσει.',
  [ROBOTS_NOINDEX_NOFOLLOW],
))

type BookmarkRow = {
  id: string
  title: string
  is_free: boolean
  price: number
  preview_url: string | null
  page_count: number | null
  file_bytes: number | null
  excerpt: string
  url: string | null
  bookmarked: boolean
  tags?: string[]
  avg_rating?: number
  rating_count?: number
}

type BookmarksPage = {
  items: BookmarkRow[]
  total: number
  page: number
  pageSize: number
}

const route = useRoute()
const page = computed(() => {
  const raw = route.query.page
  const value = Number(Array.isArray(raw) ? raw[0] : raw)
  if (!Number.isFinite(value) || value < 1) return 1
  return Math.floor(value)
})

const { data: bookmarksPage, pending, refresh, status } = await useFetch<BookmarksPage>(
  '/api/user/bookmarks',
  {
    query: computed(() => ({ page: page.value })),
    watch: [page],
    default: () => ({ items: [], total: 0, page: 1, pageSize: 20 }),
  },
)

const lessons = computed(() =>
  (bookmarksPage.value?.items ?? []).filter((lesson) => Boolean(lesson.url)),
)
const total = computed(() => bookmarksPage.value?.total ?? 0)
const pageSize = computed(() => bookmarksPage.value?.pageSize ?? 20)

function onBookmarked(id: string, saved: boolean) {
  if (saved || !bookmarksPage.value) return
  bookmarksPage.value = {
    ...bookmarksPage.value,
    items: bookmarksPage.value.items.filter((lesson) => lesson.id !== id),
    total: Math.max(0, bookmarksPage.value.total - 1),
  }
  void refresh()
}

async function onPageChange(next: number) {
  await navigateTo({
    path: '/dashboard',
    query: {
      ...(next > 1 ? { page: String(next) } : {}),
    },
  })
}

onMounted(() => {
  if (import.meta.client) {
    const { revealSection } = useGsapReveal()
    nextTick(() => {
      revealSection('#dashboard-title')
    })
  }
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-10 lg:py-12">
    <div id="dashboard-title">
      <h1 class="font-heading text-5xl leading-none text-foreground sm:text-6xl">
        Πίνακας
      </h1>
      <p class="mt-4 max-w-xl text-lg text-foreground">
        Τα αποθηκευμένα μαθήματά σου.
      </p>
    </div>

    <section class="mt-8">
      <h2 class="mb-4 font-heading text-2xl text-foreground">Το Υλικό Μου</h2>

      <div v-if="pending && !lessons.length" class="space-y-3">
        <UiSkeleton v-for="i in 3" :key="i" class="h-28 rounded-[10px]" />
      </div>

      <div v-else-if="total === 0" class="max-w-xl">
        <p class="font-heading text-lg text-foreground">Δεν έχεις αποθηκευμένο υλικό ακόμα.</p>
        <p class="mt-2 text-foreground">
          Αποθήκευσε μαθήματα από τον κατάλογο για να τα βρίσκεις εδώ.
        </p>
        <NuxtLink
          to="/"
          class="mt-5 inline-flex h-10 items-center justify-center rounded-[10px] bg-primary px-4 text-[15px] font-semibold text-primary-foreground active:scale-[0.97]"
        >
          Εξερεύνηση υλικού
        </NuxtLink>
      </div>

      <div v-else class="flex w-full flex-col gap-3">
        <ContentCard
          v-for="lesson in lessons"
          :key="lesson.id"
          frame="quiet"
          :to="lesson.url!"
          :title="lesson.title"
          :description="lesson.excerpt"
          :chips="lesson.tags ?? []"
          chip-search
          :preview-url="lesson.preview_url"
          thumb-layout="portrait"
          preview-mode="contain"
          :page-count="lesson.page_count"
          :file-bytes="lesson.file_bytes"
          :lesson-id="lesson.id"
          :bookmarked="true"
          :is-free="lesson.is_free"
          :avg-rating="lesson.avg_rating"
          :rating-count="lesson.rating_count"
          @update:bookmarked="(saved) => onBookmarked(lesson.id, saved)"
        />
        <CatalogPager
          :page="page"
          :total="total"
          :page-size="pageSize"
          :disabled="status === 'pending'"
          @update:page="onPageChange"
        />
      </div>
    </section>
  </div>
</template>
