<script setup lang="ts">
import UiCard from '~/components/ui/Card.vue'
import UiSkeleton from '~/components/ui/Skeleton.vue'

interface Category {
  id: string
  slug: string
  name: string
  description?: string | null
  order: number
}


const { data: categoriesData, pending } = await useFetch<Category[]>('/api/categories')
const categories = computed(() => categoriesData.value ?? [])

useHead(() => ({ title: 'Σημειώσεις' }))

onMounted(() => {
  if (import.meta.client) {
    const { revealSection } = useGsapReveal()
    nextTick(() => {
      revealSection('#notes-title')
      revealSection('#notes-grid')
    })
  }
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-12">
    <div id="notes-title">
      <LayoutPageIntro eyebrow="Άλλο υλικό" title="Όλες οι κατηγορίες" lead="Κατηγορίες με επιπλέον υλικό και άρθρα που έχει δημοσιεύσει η διδάσκουσα." />
    </div>

    <div v-if="pending" class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <UiSkeleton v-for="i in 6" :key="i" class="h-28 rounded-xl" />
    </div>

    <p
      v-else-if="categories.length === 0"
      class="mt-8 text-muted-foreground"
    >
      Δεν υπάρχουν ακόμη διαθέσιμες κατηγορίες.
    </p>

    <div v-else id="notes-grid" class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="cat in categories"
        :key="cat.id"
        :to="`/category/${cat.slug}`"
        class="block group"
      >
        <UiCard class="bobble-card rounded-3xl border-border/80 p-5 shadow-sm transition-shadow hover:shadow-md">
          <div class="flex items-start gap-3">
            <span
              class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary"
              aria-hidden="true"
            >
              <VIcon name="bi-journal-bookmark-fill" class="size-4" />
            </span>
            <div class="min-w-0">
              <p class="font-heading font-semibold text-base leading-snug truncate">{{ cat.name }}</p>
              <p v-if="cat.description" class="mt-1 text-sm text-muted-foreground line-clamp-2">{{ cat.description }}</p>
            </div>
          </div>
        </UiCard>
      </NuxtLink>
    </div>
  </div>
</template>
