<script setup lang="ts">
import { toast } from 'vue-sonner'
import UiCard from '~/components/ui/Card.vue'
import UiCardContent from '~/components/ui/CardContent.vue'
import UiSkeleton from '~/components/ui/Skeleton.vue'
import { NuxtLink } from '#components'

definePageMeta({ layout: 'default' })
useHead(() => ({ title: 'Άρθρα' }))

type Row = {
  id: string
  title: string
  tags: string[]
  reading_time_minutes: number
  image_url?: string | null
  created_at: string
}

const list = ref<Row[] | null>(null)
const storedImageSrc = useStoredImageSrc()

onMounted(async () => {
  try {
    list.value = await $fetch<Row[]>('/api/articles', { credentials: 'include' })
  } catch {
    list.value = []
    toast.error('Κάτι πήγε στραβά')
  }
})
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-12">
    <LayoutPageIntro title="Άρθρα" />

    <div v-if="list === null" class="space-y-4">
      <UiCard v-for="i in 4" :key="i" class="rounded-3xl border-border/80 shadow-sm">
        <UiCardContent class="p-6">
          <UiSkeleton class="h-6 w-2/3 rounded-lg" />
          <UiSkeleton class="mt-2 h-4 w-36 rounded-lg" />
        </UiCardContent>
      </UiCard>
    </div>

    <p v-else-if="!list.length" class="text-muted-foreground">Δεν υπάρχουν άρθρα ακόμα.</p>

    <ul v-else class="space-y-4">
      <li v-for="a in list" :key="a.id">
        <UiCard class="overflow-hidden rounded-3xl border-border/80 shadow-sm transition-shadow hover:shadow-md">
          <NuxtLink :to="`/articles/${a.id}`" class="group block">
            <img
              v-if="storedImageSrc(a.image_url)"
              :src="storedImageSrc(a.image_url)"
              alt=""
              class="h-40 w-full object-cover"
            >
            <UiCardContent class="p-6">
              <h2 class="text-xl font-heading font-semibold group-hover:text-primary transition-colors">
                {{ a.title }}
              </h2>
              <p class="text-sm text-muted-foreground mt-2">
                {{ `${a.reading_time_minutes} λεπτά ανάγνωσης` }}
              </p>
              <div v-if="a.tags?.length" class="flex flex-wrap gap-2 mt-3">
                <span
                  v-for="tag in a.tags"
                  :key="tag"
                  class="text-xs rounded-md bg-muted px-2 py-0.5 text-muted-foreground"
                >
                  {{ tag }}
                </span>
              </div>
            </UiCardContent>
          </NuxtLink>
        </UiCard>
      </li>
    </ul>
  </div>
</template>
