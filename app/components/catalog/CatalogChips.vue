<script setup lang="ts">
import type { LessonChip, LessonChipTone } from '~/lib/lessonContext'

defineProps<{
  chips: LessonChip[]
}>()

const chipClass: Record<LessonChipTone, string> = {
  grade: 'bg-laurel-fixed text-laurel-fixed-foreground',
  subject: 'bg-flame-fixed text-flame-fixed-foreground',
  chapter: 'bg-amethyst-fixed text-amethyst-fixed-foreground',
  category: 'bg-amethyst-fixed text-amethyst-fixed-foreground',
}
</script>

<template>
  <div v-if="chips.length" class="flex flex-wrap gap-2">
    <NuxtLink
      v-for="chip in chips"
      :key="`${chip.tone}-${chip.to}`"
      :to="chip.to"
      :class="['inline-flex items-center rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider transition-opacity hover:opacity-80', chipClass[chip.tone]]"
    >
      {{ chip.name }}
    </NuxtLink>
  </div>
</template>
