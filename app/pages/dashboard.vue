<script setup lang="ts">
import ContentCard from '~/components/content/ContentCard.vue'
import UiSkeleton from '~/components/ui/Skeleton.vue'

definePageMeta({ middleware: 'auth' })

useHead(() => ({ title: 'Πίνακας' }))

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
}

const { data: bookmarksData, pending, refresh } = await useFetch<BookmarkRow[]>(
  '/api/user/bookmarks',
)

const lessons = computed(() =>
  (bookmarksData.value ?? []).filter((lesson) => Boolean(lesson.url)),
)

function onBookmarked(id: string, saved: boolean) {
  if (saved || !bookmarksData.value) return
  bookmarksData.value = bookmarksData.value.filter((lesson) => lesson.id !== id)
  void refresh()
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

      <div v-if="pending" class="space-y-3">
        <UiSkeleton v-for="i in 3" :key="i" class="h-36 rounded-3xl" />
      </div>

      <div
        v-else-if="lessons.length === 0"
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
          :preview-url="lesson.preview_url"
          thumb-layout="portrait"
          preview-mode="contain"
          :page-count="lesson.page_count"
          :file-bytes="lesson.file_bytes"
          :lesson-id="lesson.id"
          :bookmarked="true"
          :is-free="lesson.is_free"
          @update:bookmarked="(saved) => onBookmarked(lesson.id, saved)"
        />
      </div>
    </section>
  </div>
</template>
