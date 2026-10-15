<script setup lang="ts">
const props = withDefaults(defineProps<{
  to: string
  title: string
  text?: string | null
  imageUrl?: string | null
  icon?: string
  countLabel?: string | null
}>(), {
  text: '',
  imageUrl: '',
  icon: 'bi-journal-bookmark',
  countLabel: '',
})

const storedImageSrc = useStoredImageSrc()
const src = computed(() => storedImageSrc(props.imageUrl))
</script>

<template>
  <NuxtLink
    :to="to"
    class="group flex flex-col gap-4 rounded-3xl border border-border/70 bg-secondary p-4 shadow-sm transition-[background-color,box-shadow] duration-300 hover:bg-muted hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:flex-row sm:items-stretch sm:gap-5 sm:p-5"
  >
    <div class="flex min-w-0 flex-1 flex-col justify-center gap-2">
      <div class="min-w-0 space-y-1">
        <span
          class="inline-block max-w-full font-heading text-lg font-semibold leading-snug text-foreground transition-colors group-hover:text-primary"
        >
          {{ title }}
        </span>
        <p
          v-if="text"
          class="line-clamp-2 max-w-2xl font-reading text-sm leading-relaxed text-muted-foreground"
        >
          {{ text }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <span
          class="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors group-hover:bg-primary/90"
        >
          Άνοιγμα
          <VIcon
            name="bi-arrow-right"
            class="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden="true"
          />
        </span>
        <span
          v-if="countLabel"
          class="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-card px-3 py-1 text-xs font-semibold text-muted-foreground"
        >
          <VIcon name="bi-collection" class="size-3.5 shrink-0 text-primary" aria-hidden="true" />
          {{ countLabel }}
        </span>
      </div>
    </div>

    <div
      class="aspect-4/3 w-full shrink-0 overflow-hidden rounded-2xl border border-border/60 bg-muted sm:aspect-auto sm:h-36 sm:w-44"
      aria-hidden="true"
    >
      <img
        v-if="src"
        :src="src"
        alt=""
        class="size-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
      >
      <div v-else class="flex size-full items-center justify-center text-primary">
        <VIcon :name="icon" class="size-8 opacity-70" />
      </div>
    </div>
  </NuxtLink>
</template>
