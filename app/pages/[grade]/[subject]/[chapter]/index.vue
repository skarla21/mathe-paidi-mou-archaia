<script setup lang="ts">
import type { LessonChip } from '~/lib/lessonContext'
import { catalogListState } from '~/utils/catalogLists'

interface Lesson {
  id: string
  slug: string
  title: string
  is_free: boolean
  excerpt?: string | null
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
const { data: tree, error } = await useFetch<Tree>('/api/tree', {
  query: {
    grade: route.params.grade,
    subject: route.params.subject,
    chapter: route.params.chapter,
  },
})
throwIfMissing(error.value, !tree.value?.chapter)

const chapter = computed(() => tree.value!.chapter)
const { data: lessonsData, error: lessonsError } = await useFetch<Lesson[]>('/api/lessons', {
  query: { chapter_id: chapter.value.id },
})
const lessons = computed(() => lessonsData.value ?? [])
const lessonState = computed(() => catalogListState(Boolean(lessonsError.value), lessons.value.length))

const gradeTo = computed(() => `/${tree.value?.grade.slug ?? ''}`)
const subjectTo = computed(() => `${gradeTo.value}/${tree.value?.subject.slug ?? ''}`)
const chips = computed<LessonChip[]>(() => {
  const current = tree.value
  if (!current) return []
  return [
    { name: current.grade.name, to: gradeTo.value, tone: 'grade' },
    { name: current.subject.name, to: subjectTo.value, tone: 'subject' },
  ]
})
const lessonRows = computed(() => lessons.value.map((lesson) => ({
  id: lesson.id,
  title: lesson.title,
  to: `${subjectTo.value}/${chapter.value.slug}/${lesson.slug}`,
  excerpt: lesson.excerpt,
  is_free: lesson.is_free,
})))

useHead(() => ({ title: chapter.value ? chapter.value.title : 'Κεφάλαιο' }))

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
  <div class="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-12">
    <header id="chapter-title" class="max-w-3xl">
      <CatalogBackLink :to="subjectTo" :name="tree?.subject.name ?? 'Μάθημα'" />
      <h1 class="mt-5 font-heading text-4xl font-extrabold leading-tight tracking-tight text-balance text-foreground sm:text-5xl">
        {{ chapter.title }}
      </h1>
      <CatalogChips class="mt-4" :chips="chips" />
      <CatalogCover class="mt-6" :image-url="chapter.image_url" :alt="chapter.title" />
      <p v-if="chapter.description" class="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
        {{ chapter.description }}
      </p>
    </header>

    <section v-if="lessonState === 'ready'" id="chapter-lessons" class="mt-10">
      <h2 class="mb-4 font-heading text-xl font-semibold">
        Υλικό
      </h2>
      <CatalogLessonList :lessons="lessonRows" />
    </section>
    <p v-else id="chapter-lessons" class="mt-10 text-muted-foreground">
      {{ lessonState === 'error' ? 'Το υλικό δεν φορτώθηκε. Δοκίμασε ξανά σε λίγο.' : 'Δεν υπάρχει ακόμη υλικό.' }}
    </p>
  </div>
</template>
