<script setup lang="ts">
const props = defineProps<{
  myRating: number | null
  avgRating: number
  ratingCount: number
  disabled?: boolean
  label?: string
}>()

const emit = defineEmits<{
  rate: [value: number]
  clear: []
}>()

const hoverValue = ref(0)

const displayValue = computed(() => {
  if (hoverValue.value > 0) return hoverValue.value
  return props.myRating ?? 0
})

const avgLabel = computed(() => {
  if (props.ratingCount <= 0) return ''
  return Number(props.avgRating).toFixed(1)
})

function onEnter(star: number) {
  if (props.disabled) return
  hoverValue.value = star
}

function onLeave() {
  hoverValue.value = 0
}

function onClick(star: number) {
  if (props.disabled) return
  if (props.myRating === star) {
    emit('clear')
    return
  }
  emit('rate', star)
}
</script>

<template>
  <div class="flex flex-wrap items-center gap-3">
    <div
      class="flex items-center gap-0.5"
      role="group"
      :aria-label="label || 'Βαθμολογία'"
      @mouseleave="onLeave"
    >
      <button
        v-for="star in 5"
        :key="star"
        type="button"
        class="rounded-md p-0.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        :class="disabled ? 'cursor-default opacity-70' : 'cursor-pointer'"
        :disabled="disabled"
        :aria-label="`${star} από 5 αστέρια`"
        :aria-pressed="myRating === star"
        @mouseenter="onEnter(star)"
        @focus="onEnter(star)"
        @click="onClick(star)"
      >
        <VIcon
          :name="star <= displayValue ? 'bi-star-fill' : 'bi-star'"
          class="size-5 transition-colors"
          :class="
            star <= displayValue
              ? 'text-amber-500'
              : 'text-muted-foreground'
          "
          aria-hidden="true"
        />
      </button>
    </div>
    <span
      v-if="ratingCount > 0"
      class="text-sm tabular-nums text-muted-foreground"
    >
      {{ avgLabel }}
      <span class="text-muted-foreground/80">({{ ratingCount }})</span>
    </span>
  </div>
</template>
