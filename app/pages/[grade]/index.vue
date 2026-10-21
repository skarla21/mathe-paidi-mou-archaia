<script setup lang="ts">
import type { Subject } from '~/types/database'
import { catalogListState, catalogSubjectCountLabel } from '~/utils/catalogLists'

interface Grade {
  id: string
  slug: string
  name: string
  order?: number
}

interface SubjectWithCounts extends Subject {
  chapter_count?: number
  lesson_count?: number
}

const route = useRoute()
const gradeSlug = route.params.grade as string

const { data: gradeData, error: gradesError } = await useFetch<Grade[]>('/api/grades')
throwIfMissing(gradesError.value, false)
const grade = gradeData.value?.find((item) => item.slug === gradeSlug)
throwIfMissing(null, !grade)

const { data: subjectsData, error: subjectsError } = await useFetch<SubjectWithCounts[]>('/api/subjects', {
  query: { grade_id: grade!.id, counts: '1' },
})
const subjects = computed(() => subjectsData.value ?? [])
const subjectsState = computed(() => catalogListState(Boolean(subjectsError.value), subjects.value.length))

useHead(() => ({
  ...describedHead(
    grade ? `${grade.name} - Τάξεις` : 'Τάξη',
    grade ? `${grade.name}: σημειώσεις και διδακτικό υλικό για αυτή τη σχολική τάξη.` : null,
    [],
    route.path,
  ),
  script: grade
    ? [jsonLdScript(jsonLdGraph([
        breadcrumbList([
          { name: 'Αρχική', path: '/' },
          { name: grade.name, path: route.path },
        ]),
      ]), 'ld-json')]
    : [],
}))

onMounted(() => {
  if (import.meta.client) {
    const { revealSection } = useGsapReveal()
    nextTick(() => {
      revealSection('#grade-title')
      revealSection('#grade-content')
    })
  }
})
</script>

<template>
    <div class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-10 lg:py-12">
        <div id="grade-title">
          <p class="text-sm font-semibold text-muted-foreground">Τάξεις</p>
          <h1 class="mt-2 font-heading text-5xl leading-none text-foreground sm:text-6xl">
            {{ grade?.name ?? 'Τάξη' }}
          </h1>
        </div>
        <div v-if="subjectsState === 'ready'" id="grade-content" class="mt-8">
          <h2 class="mb-4 font-heading text-2xl text-foreground">Μαθήματα</h2>
          <div class="flex flex-col gap-3">
            <CatalogThumbCard
              v-for="subject in subjects"
              :key="subject.id"
              :to="`/${grade?.slug}/${subject.slug}`"
              :title="subject.name"
              :image-url="subject.image_url"
              :count-label="catalogSubjectCountLabel(subject.chapter_count ?? 0, subject.lesson_count ?? 0)"
              icon="bi-book"
            />
          </div>
        </div>
        <p v-else id="grade-content" class="mt-8 text-muted-foreground">
          {{ subjectsState === 'error' ? 'Τα μαθήματα δεν φορτώθηκαν. Δοκίμασε ξανά σε λίγο.' : 'Δεν υπάρχουν ακόμη μαθήματα για αυτή την τάξη.' }}
        </p>
    </div>
</template>
