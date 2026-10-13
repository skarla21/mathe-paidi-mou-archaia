<script setup lang="ts">
import LessonView from '~/components/lesson/LessonView.vue'
import { subjectLessonContext } from '~/lib/lessonContext'

interface Tree {
  grade: { name: string; slug: string }
  subject: { name: string; slug: string }
  lesson: { id: string }
}

const route = useRoute()
const { data: tree, error } = await useFetch<Tree>('/api/tree', {
  query: {
    grade: route.params.grade,
    subject: route.params.subject,
    lesson: route.params.lesson,
    placement: 'subject',
  },
})
throwIfMissing(error.value, !tree.value?.lesson)

const context = subjectLessonContext(tree.value!)
</script>

<template>
  <LessonView
    :lesson-id="tree!.lesson.id"
    :parent="context.parent"
    :chips="context.chips"
  />
</template>
