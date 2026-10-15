<script setup lang="ts">
import UiButton from '~/components/ui/Button.vue'

const props = withDefaults(defineProps<{
  page: number
  total: number
  pageSize: number
  disabled?: boolean
}>(), {
  disabled: false,
})

const emit = defineEmits<{ 'update:page': [page: number] }>()

const pageCount = computed(() => {
  if (props.pageSize <= 0) return 1
  return Math.max(1, Math.ceil(props.total / props.pageSize))
})

const rangeStart = computed(() => (
  props.total === 0 ? 0 : (props.page - 1) * props.pageSize + 1
))

const rangeEnd = computed(() => Math.min(props.total, props.page * props.pageSize))

function go(next: number) {
  if (props.disabled || next === props.page || next < 1 || next > pageCount.value) return
  emit('update:page', next)
}
</script>

<template>
  <nav
    v-if="pageCount > 1"
    class="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"
    aria-label="Σελιδοποίηση"
  >
    <p class="text-sm text-muted-foreground">{{ rangeStart }}–{{ rangeEnd }} από {{ total }}</p>
    <div class="flex items-center gap-2">
      <UiButton
        type="button"
        size="sm"
        variant="outline"
        class="shrink-0 rounded-full"
        :disabled="disabled || page <= 1"
        @click="go(page - 1)"
      >
        Προηγούμενα
      </UiButton>
      <p class="text-sm text-muted-foreground whitespace-nowrap">Σελίδα {{ page }} από {{ pageCount }}</p>
      <UiButton
        type="button"
        size="sm"
        variant="outline"
        class="shrink-0 rounded-full"
        :disabled="disabled || page >= pageCount"
        @click="go(page + 1)"
      >
        Επόμενα
      </UiButton>
    </div>
  </nav>
</template>
