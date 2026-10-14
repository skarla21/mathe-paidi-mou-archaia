<script setup lang="ts">
const props = withDefaults(defineProps<{
  to: string
  title: string
  text?: string | null
  imageUrl?: string | null
  icon?: string
}>(), {
  text: '',
  imageUrl: '',
  icon: 'bi-journal-bookmark',
})

const storedImageSrc = useStoredImageSrc()
const src = computed(() => storedImageSrc(props.imageUrl))
</script>

<template>
  <NuxtLink :to="to" class="group block">
    <article class="bobble-card flex items-center gap-4 rounded-3xl border border-border/80 bg-card p-3 shadow-sm transition-shadow hover:shadow-md">
      <div class="h-20 w-28 shrink-0 overflow-hidden rounded-2xl bg-muted" aria-hidden="true">
        <img
          v-if="src"
          :src="src"
          alt=""
          class="h-full w-full object-cover"
        >
        <div v-else class="flex h-full items-center justify-center text-primary">
          <VIcon :name="icon" class="size-6" />
        </div>
      </div>
      <div class="min-w-0 flex-1 py-1">
        <p class="font-heading text-base font-semibold leading-snug text-foreground">
          {{ title }}
        </p>
        <p v-if="text" class="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {{ text }}
        </p>
      </div>
      <VIcon name="bi-arrow-right" class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </article>
  </NuxtLink>
</template>
