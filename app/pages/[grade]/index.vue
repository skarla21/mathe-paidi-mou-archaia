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

useHead(() => describedHead(
  grade ? `${grade.name} - Τάξεις` : 'Τάξη',
  grade ? `${grade.name}. Μαθήματα και κεφάλαια.` : null,
))

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
  <div class="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-12">
    <div id="grade-title">
      <LayoutPageIntro
        eyebrow="Τάξεις"
        :title="grade?.name ?? 'Τάξη'"
      />
    </div>
    <div v-if="subjectsState === 'ready'" id="grade-content">
      <CatalogSectionHeading title="Μαθήματα" icon="bi-journal-text" tone="flame" />
      <div class="flex flex-col gap-4">
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
    <p v-else id="grade-content" class="text-muted-foreground">
      {{ subjectsState === 'error' ? 'Τα μαθήματα δεν φορτώθηκαν. Δοκίμασε ξανά σε λίγο.' : 'Δεν υπάρχουν ακόμη μαθήματα για αυτή την τάξη.' }}
    </p>
  </div>
</template>
