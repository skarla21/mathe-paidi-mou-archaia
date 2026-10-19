<script setup lang="ts">
const route = useRoute();

useSeoMeta({
  ogUrl: () => new URL(route.path, "https://mathearchaia.gr").href,
});
</script>

<template>
  <div>
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <NuxtRouteAnnouncer />
  </div>
</template>
