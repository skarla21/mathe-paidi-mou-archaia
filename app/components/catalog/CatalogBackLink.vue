<script setup lang="ts">
defineProps<{
  to: string
  name: string
}>()
</script>

<template>
  <NuxtLink
    :to="to"
    class="inline-flex max-w-full items-center gap-2 rounded-full bg-muted px-4 py-2 font-ui text-sm font-semibold text-primary ring-offset-background transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
  >
    <VIcon name="bi-arrow-left" class="size-4 shrink-0" aria-hidden="true" />
    <span class="truncate">{{ name }}</span>
  </NuxtLink>
</template>
