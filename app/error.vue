<script setup lang="ts">
import { clearError, type NuxtError } from '#app'

const props = defineProps<{
  error: NuxtError
}>()

const missing = computed(() => props.error.statusCode === 404)
const title = computed(() => (missing.value ? 'Δεν βρέθηκε' : 'Κάτι πήγε στραβά'))

useHead(() => ({
  title: title.value,
  meta: [{ name: 'robots', content: 'noindex, nofollow' }],
}))

function goHome() {
  clearError({ redirect: '/' })
}
</script>

<template>
  <div class="flex min-h-screen flex-col items-center justify-center bg-background px-6 text-center text-foreground">
    <h1 class="font-heading text-3xl font-bold">{{ title }}</h1>
    <p class="mt-3 max-w-md text-muted-foreground">
      {{ missing ? 'Η σελίδα που ζήτησες δεν υπάρχει.' : 'Κάτι πήγε στραβά. Δοκίμασε ξανά σε λίγο.' }}
    </p>
    <button type="button" class="mt-6 cursor-pointer font-semibold text-primary" @click="goHome">
      Επιστροφή στην αρχική
    </button>
  </div>
</template>
