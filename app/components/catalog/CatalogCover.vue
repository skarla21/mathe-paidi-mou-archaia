<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    imageUrl?: string | null
    alt: string
    /** Show the full image without cropping (e.g. article hero). */
    showFull?: boolean
  }>(),
  { showFull: false },
)

const storedImageSrc = useStoredImageSrc()
const src = computed(() => storedImageSrc(props.imageUrl))
</script>

<template>
  <div v-if="src" class="overflow-hidden rounded-3xl border border-border bg-muted">
    <img
      :src="src"
      :alt="alt"
      :class="
        showFull
          ? 'w-full h-auto object-contain'
          : 'h-56 w-full object-cover sm:h-72'
      "
    >
  </div>
</template>
