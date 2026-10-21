<script setup lang="ts">
import ContentCard from '~/components/content/ContentCard.vue'

defineProps<{
  lessons: {
    id: string
    title: string
    to: string
    excerpt?: string | null
    is_free?: boolean
    preview_url?: string | null
    page_count?: number | null
    file_bytes?: number | null
    bookmarked?: boolean
    avg_rating?: number | null
    rating_count?: number | null
    /** Same string[] tags pattern as articles; assigned later from admin. */
    tags?: string[]
  }[]
}>()
</script>

<template>
  <div class="flex w-full flex-col gap-3">
    <ContentCard
      v-for="lesson in lessons"
      :key="lesson.id"
      frame="quiet"
      :to="lesson.to"
      :title="lesson.title"
      :description="lesson.excerpt"
      :chips="lesson.tags ?? []"
      chip-search
      :preview-url="lesson.preview_url"
      thumb-layout="portrait"
      preview-mode="contain"
      placeholder-icon="bi-file-earmark-text"
      :page-count="lesson.page_count"
      :file-bytes="lesson.file_bytes"
      :lesson-id="lesson.id"
      :bookmarked="Boolean(lesson.bookmarked)"
      :is-free="lesson.is_free"
      :avg-rating="lesson.avg_rating"
      :rating-count="lesson.rating_count"
    />
  </div>
</template>
