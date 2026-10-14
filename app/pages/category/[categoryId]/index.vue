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
}

const route = useRoute()
const categorySlug = route.params.categoryId as string

const { data: category, error } = await useFetch<Category>(`/api/categories/${categorySlug}`)
throwIfMissing(error.value, !category.value)

const { data: lessonsData, error: lessonsError } = await useFetch<Lesson[]>('/api/lessons', {
  query: { category_id: category.value!.id },
})
const lessons = computed(() => lessonsData.value ?? [])
const lessonState = computed(() => catalogListState(Boolean(lessonsError.value), lessons.value.length))
const chips = computed<LessonChip[]>(() => [
  { name: 'Κατηγορίες', to: '/#categories', tone: 'category' },
])
const lessonRows = computed(() => lessons.value.map((lesson) => ({
  id: lesson.id,
  title: lesson.title,
  to: `/category/${categorySlug}/${lesson.slug}`,
  excerpt: lesson.excerpt,
  is_free: lesson.is_free,
})))

useHead(() => ({ title: category.value?.name ?? 'Κατηγορία' }))

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
      <h2 class="mb-4 font-heading text-xl font-semibold">
        Υλικό
      </h2>
      <CatalogLessonList :lessons="lessonRows" />
    </section>
    <p v-else id="category-lessons" class="mt-10 text-muted-foreground">
      {{ lessonState === 'error' ? 'Το υλικό δεν φορτώθηκε. Δοκίμασε ξανά σε λίγο.' : 'Δεν υπάρχει ακόμη υλικό.' }}
    </p>
  </div>
</template>
