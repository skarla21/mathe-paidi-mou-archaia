<script setup lang="ts">
defineProps<{
  to: string
  name: string
}>()
</script>

<template>
  <NuxtLink
    :to="to"
    class="inline-flex max-w-full items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-2 font-ui text-sm font-semibold text-foreground shadow-sm transition-all hover:border-primary/40 hover:bg-secondary"
  >
    <VIcon name="bi-arrow-left" class="size-4 shrink-0" aria-hidden="true" />
    <span class="truncate">{{ name }}</span>
  </NuxtLink>
</template>
