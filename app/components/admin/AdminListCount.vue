<script setup lang="ts">
const props = defineProps<{
  shown: number
  total: number
}>()

const label = computed(() => (
  props.shown === props.total ? String(props.total) : `${props.shown} από ${props.total}`
))
</script>

<template>
  <p class="mt-1 text-sm text-muted-foreground" aria-live="polite">{{ label }}</p>
</template>
