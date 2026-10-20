<script setup lang="ts">
import { formatDocumentTitle } from "#shared/utils/siteMeta.mjs";

useHead({
  titleTemplate: (title) => formatDocumentTitle(typeof title === "string" ? title : ""),
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
