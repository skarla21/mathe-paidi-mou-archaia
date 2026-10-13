<script setup lang="ts">
import LessonView from '~/components/lesson/LessonView.vue'
import { categoryLessonContext } from '~/lib/lessonContext'

interface Tree {
  category: { name: string; slug: string }
  lesson: { id: string }
}

const route = useRoute()
const { data: tree, error } = await useFetch<Tree>('/api/tree', {
  query: {
    category: route.params.categoryId,
    lesson: route.params.lesson,
  },
})
throwIfMissing(error.value, !tree.value?.lesson)

const context = categoryLessonContext(tree.value!.category)
</script>

<template>
  <LessonView
    :lesson-id="tree!.lesson.id"
    :parent="context.parent"
    :chips="context.chips"
  />
</template>
