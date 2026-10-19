<script setup lang="ts">
import ContentCard from '~/components/content/ContentCard.vue'
import CatalogPager from '~/components/catalog/CatalogPager.vue'
import UiSkeleton from '~/components/ui/Skeleton.vue'

definePageMeta({ middleware: 'auth' })

useHead(() => describedHead('Πίνακας', 'Τα μαθήματα που έχεις αποθηκεύσει.'))

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
  <div class="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-12">
    <div id="dashboard-title" class="max-w-3xl">
      <LayoutPageIntro title="Πίνακας" lead="Τα αποθηκευμένα μαθήματά σου." />
    </div>

    <section>
      <h2 class="mb-4 font-heading text-xl font-semibold">Το Υλικό Μου</h2>

      <div v-if="pending && !lessons.length" class="space-y-3">
        <UiSkeleton v-for="i in 3" :key="i" class="h-36 rounded-3xl" />
      </div>

      <div
        v-else-if="total === 0"
        class="max-w-md rounded-3xl border border-dashed border-border bg-card p-10 text-center shadow-sm"
      >
        <VIcon name="bi-bookmark" class="mx-auto size-10 text-muted-foreground/70" aria-hidden="true" />
        <p class="mt-3 font-heading font-medium">Δεν έχεις αποθηκευμένο υλικό ακόμα.</p>
        <p class="mt-1 text-sm text-muted-foreground">
          Αποθήκευσε μαθήματα από τον κατάλογο για να τα βρίσκεις εδώ.
        </p>
        <NuxtLink
          to="/"
          class="mt-4 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Εξερεύνηση υλικού
        </NuxtLink>
      </div>

      <div v-else class="flex w-full flex-col gap-3">
        <ContentCard
          v-for="lesson in lessons"
          :key="lesson.id"
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
