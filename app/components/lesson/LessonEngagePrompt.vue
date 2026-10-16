<script setup lang="ts">
import LessonStarRating from '~/components/lesson/LessonStarRating.vue'
import UiButton from '~/components/ui/Button.vue'

defineProps<{
  myRating: number | null
  avgRating: number
  ratingCount: number
  ratingDisabled?: boolean
}>()

const emit = defineEmits<{
  rate: [value: number]
  clear: []
  comment: []
  share: []
  dismiss: []
}>()

const root = ref<HTMLElement | null>(null)

onMounted(() => {
  if (!import.meta.client || !root.value) return
  const { revealNow } = useGsapReveal()
  nextTick(() => {
    if (root.value) void revealNow(root.value, { y: 16, duration: 0.45 })
  })
})
</script>

<template>
  <aside
    ref="root"
    class="mt-8 max-w-3xl rounded-2xl border border-border/80 bg-muted/40 px-4 py-4 sm:px-5"
    aria-label="Πρόσκληση αξιολόγησης"
  >
    <div class="flex items-start gap-3">
      <div class="min-w-0 flex-1 space-y-3">
        <p class="font-reading text-sm leading-relaxed text-muted-foreground sm:text-base">
          Αν σε βοήθησε το υλικό, άφησε μια βαθμολογία, ένα σχόλιο, ή κοινοποίησέ το.
        </p>
        <div class="flex flex-wrap items-center gap-3">
          <LessonStarRating
            label="Βαθμολογία πρόσκλησης"
            :my-rating="myRating"
            :avg-rating="avgRating"
            :rating-count="ratingCount"
            :disabled="ratingDisabled"
            @rate="emit('rate', $event)"
            @clear="emit('clear')"
          />
          <UiButton
            variant="outline"
            size="sm"
            aria-label="Σχόλιο"
            @click="emit('comment')"
          >
            <VIcon name="bi-chat-text" class="size-4" aria-hidden="true" />
            Σχόλιο
          </UiButton>
          <UiButton
            variant="outline"
            size="sm"
            aria-label="Κοινοποίηση"
            @click="emit('share')"
          >
            <VIcon name="bi-share" class="size-4" aria-hidden="true" />
            Κοινοποίηση
          </UiButton>
        </div>
      </div>
      <button
        type="button"
        class="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Κλείσιμο"
        @click="emit('dismiss')"
      >
        <VIcon name="bi-x" class="size-4" aria-hidden="true" />
      </button>
    </div>
  </aside>
</template>
