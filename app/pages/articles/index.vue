<script setup lang="ts">
import { toast } from 'vue-sonner'
import ContentCard from '~/components/content/ContentCard.vue'
import UiSkeleton from '~/components/ui/Skeleton.vue'

definePageMeta({ layout: 'default' })
useHead(() => ({ title: 'Άρθρα' }))

type Row = {
  id: string
  title: string
  tags: string[]
  reading_time_minutes: number
  image_url?: string | null
  created_at: string
  excerpt?: string
}

const list = ref<Row[] | null>(null)

onMounted(async () => {
  try {
    list.value = await $fetch<Row[]>('/api/articles', {
      credentials: 'include',
    })
  } catch {
    list.value = []
    toast.error('Κάτι πήγε στραβά')
  }
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-12">
    <div class="max-w-3xl">
      <LayoutPageIntro title="Άρθρα" />
    </div>

    <div v-if="list === null" class="mt-2 space-y-4">
      <div
        v-for="i in 4"
        :key="i"
        class="flex gap-4 rounded-3xl border border-border bg-card p-4"
      >
        <UiSkeleton class="aspect-[4/3] w-44 shrink-0 rounded-2xl" />
        <div class="min-w-0 flex-1 space-y-3">
          <UiSkeleton class="h-6 w-3/4 rounded-lg" />
          <UiSkeleton class="h-4 w-full rounded-lg" />
          <UiSkeleton class="h-4 w-32 rounded-lg" />
        </div>
      </div>
    </div>

    <p v-else-if="!list.length" class="mt-2 text-muted-foreground">
      Δεν υπάρχουν άρθρα ακόμα.
    </p>

    <ul v-else class="mt-2 flex w-full flex-col gap-3">
      <li v-for="a in list" :key="a.id" class="w-full">
        <ContentCard
          :to="`/articles/${a.id}`"
          :title="a.title"
          :description="a.excerpt"
          :chips="a.tags ?? []"
          :preview-url="a.image_url"
          thumb-layout="landscape"
          preview-mode="cover"
          placeholder-icon="bi-newspaper"
          :reading-minutes="a.reading_time_minutes"
        />
      </li>
    </ul>
  </div>
</template>
