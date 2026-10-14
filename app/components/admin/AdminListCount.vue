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
  <span class="ml-2 text-xl font-normal text-muted-foreground" aria-live="polite">({{ label }})</span>
</template>
