<script setup lang="ts">
defineProps<{
  minutes: number
}>()
</script>

<template>
  <p class="text-sm text-muted-foreground">
    {{ `Διαβάζεται σε ${minutes}'` }}
  </p>
</template>
