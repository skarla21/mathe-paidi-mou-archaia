<script setup lang="ts">
import { describedHead, ROBOTS_NOINDEX_NOFOLLOW } from "~/utils/socialHead"

useHead(() => describedHead(
  "Σύνδεση με Google",
  "Η σύνδεση με Google δεν ολοκληρώθηκε.",
  [ROBOTS_NOINDEX_NOFOLLOW],
))

const route = useRoute()

onMounted(async () => {
  const value = route.query.error
  const code = (Array.isArray(value) ? value[0] : value) || "error"
  await navigateTo({ path: "/", query: { googleAuth: code } }, { replace: true })
})
</script>

<template>
  <p class="sr-only">Η σύνδεση με Google δεν ολοκληρώθηκε.</p>
</template>
