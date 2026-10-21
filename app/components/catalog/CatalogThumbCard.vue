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
    class="group flex flex-col gap-4 rounded-[10px] border border-border bg-card p-3 text-foreground transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] sm:flex-row sm:items-center [@media(hover:hover)]:hover:bg-muted"
  >
    <div
      class="aspect-4/3 w-full shrink-0 overflow-hidden rounded-[10px] bg-secondary sm:aspect-auto sm:h-32 sm:w-44"
      aria-hidden="true"
    >
      <img
        v-if="src"
        :src="src"
        alt=""
        class="size-full object-cover"
      >
      <div v-else class="flex size-full items-center justify-center">
        <VIcon :name="icon" class="size-8" />
      </div>
    </div>

    <div class="flex min-w-0 flex-1 flex-col gap-2 sm:px-2 sm:py-2">
      <span class="font-heading text-2xl leading-snug">
        {{ title }}
      </span>
      <p
        v-if="text"
        class="line-clamp-2 max-w-2xl text-sm leading-relaxed text-muted-foreground"
      >
        {{ text }}
      </p>
      <p v-if="countLabel" class="text-sm text-muted-foreground">
        {{ countLabel }}
      </p>
    </div>
    <span class="inline-flex h-10 w-fit shrink-0 items-center gap-2 rounded-[10px] bg-primary px-4 text-[15px] font-semibold text-primary-foreground sm:mr-2">
      Άνοιγμα
      <VIcon name="bi-arrow-right" class="size-4" aria-hidden="true" />
    </span>
  </NuxtLink>
</template>
