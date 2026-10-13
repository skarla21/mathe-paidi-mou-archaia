<script setup lang="ts">
import LessonView from '~/components/lesson/LessonView.vue'
import { chapterLessonContext } from '~/lib/lessonContext'

interface Tree {
  grade: { name: string; slug: string }
  subject: { name: string; slug: string }
  chapter: { title: string; slug: string }
  lesson: { id: string }
}

const route = useRoute()
const { data: tree, error } = await useFetch<Tree>('/api/tree', {
  query: {
    grade: route.params.grade,
    subject: route.params.subject,
    chapter: route.params.chapter,
    lesson: route.params.lesson,
  },
})
throwIfMissing(error.value, !tree.value?.lesson)

const context = chapterLessonContext(tree.value!)
</script>

<template>
  <LessonView
    :lesson-id="tree!.lesson.id"
    :parent="context.parent"
    :chips="context.chips"
  />
</template>
