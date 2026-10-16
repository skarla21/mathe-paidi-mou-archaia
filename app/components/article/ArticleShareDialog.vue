<script setup lang="ts">
import ShareDialog from '~/components/ShareDialog.vue'

defineProps<{
  open: boolean
  title: string
}>()

defineEmits<{
  'update:open': [value: boolean]
}>()
</script>

<template>
  <ShareDialog
    :open="open"
    :title="title"
    @update:open="$emit('update:open', $event)"
  />
</template>
