<script setup lang="ts">
defineProps<{
  lessons: {
    id: string
    title: string
    to: string
    excerpt?: string | null
    is_free?: boolean
  }[]
}>()
</script>

<template>
  <div class="flex flex-col gap-3">
    <NuxtLink
      v-for="lesson in lessons"
      :key="lesson.id"
      :to="lesson.to"
      class="group flex items-center gap-4 rounded-3xl border border-border bg-card px-5 py-4 shadow-sm transition-colors hover:bg-secondary"
    >
      <span class="min-w-0 flex-1">
        <span class="block font-heading text-base font-semibold text-foreground">{{ lesson.title }}</span>
        <span v-if="lesson.excerpt" class="mt-1 block line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {{ lesson.excerpt }}
        </span>
      </span>
      <VIcon
        v-if="lesson.is_free === false"
        name="bi-gem"
        class="size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <VIcon
        name="bi-chevron-right"
        class="size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        aria-hidden="true"
      />
    </NuxtLink>
  </div>
</template>
