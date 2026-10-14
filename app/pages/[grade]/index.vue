<script setup lang="ts">
import type { Subject } from '~/types/database'
import { catalogListState } from '~/utils/catalogLists'

interface Grade {
  id: string
  slug: string
  name: string
  order?: number
}

const route = useRoute()
const gradeSlug = route.params.grade as string

const { data: gradeData, error: gradesError } = await useFetch<Grade[]>('/api/grades')
throwIfMissing(gradesError.value, false)
const grade = gradeData.value?.find((item) => item.slug === gradeSlug)
throwIfMissing(null, !grade)

const { data: subjectsData, error: subjectsError } = await useFetch<Subject[]>('/api/subjects', {
  query: { grade_id: grade!.id },
})
const subjects = computed(() => subjectsData.value ?? [])
const subjectsState = computed(() => catalogListState(Boolean(subjectsError.value), subjects.value.length))

useHead(() => ({
  title: grade ? `${grade.name} - Τάξεις` : 'Τάξη',
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
  <div class="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-12">
    <div id="grade-title">
      <LayoutPageIntro
        eyebrow="Τάξεις"
        :title="grade?.name ?? 'Τάξη'"
        lead="Μαθήματα"
      />
    </div>
    <div v-if="subjectsState === 'ready'" id="grade-content" class="grid gap-4 lg:grid-cols-2">
      <CatalogThumbCard
        v-for="subject in subjects"
        :key="subject.id"
        :to="`/${grade?.slug}/${subject.slug}`"
        :title="subject.name"
        :image-url="subject.image_url"
        icon="bi-book"
      />
    </div>
    <p v-else id="grade-content" class="text-muted-foreground">
      {{ subjectsState === 'error' ? 'Τα μαθήματα δεν φορτώθηκαν. Δοκίμασε ξανά σε λίγο.' : 'Δεν υπάρχουν ακόμη μαθήματα για αυτή την τάξη.' }}
    </p>
  </div>
</template>
