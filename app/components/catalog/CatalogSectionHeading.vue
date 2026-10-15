<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  icon?: string
  tone?: 'flame' | 'laurel' | 'amethyst'
}>(), {
  icon: 'bi-journal-text',
  tone: 'flame',
})

const toneClass = {
  flame: 'bg-flame-fixed text-flame-fixed-foreground',
  laurel: 'bg-laurel-fixed text-laurel-fixed-foreground',
  amethyst: 'bg-amethyst-fixed text-amethyst-fixed-foreground',
} as const
</script>

<template>
  <div class="mb-5 flex items-center gap-3">
    <span
      :class="[
        'inline-flex size-10 shrink-0 items-center justify-center rounded-2xl shadow-sm',
        toneClass[tone],
      ]"
      aria-hidden="true"
    >
      <VIcon :name="icon" class="size-5" />
    </span>
    <h2 class="font-heading text-2xl font-extrabold tracking-tight text-foreground sm:text-[1.65rem]">
      {{ title }}
    </h2>
  </div>
</template>
