<script setup lang="ts">
const props = defineProps<{
  imageUrl?: string | null
  alt: string
}>()

const storedImageSrc = useStoredImageSrc()
const src = computed(() => storedImageSrc(props.imageUrl))
</script>

<template>
  <div v-if="src" class="overflow-hidden rounded-3xl border border-border bg-muted">
    <img
      :src="src"
      :alt="alt"
      class="h-56 w-full object-cover sm:h-72"
    >
  </div>
</template>
