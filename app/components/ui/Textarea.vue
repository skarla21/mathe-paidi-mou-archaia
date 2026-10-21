<script setup lang="ts">
import { type HTMLAttributes, computed } from 'vue'
import { cn } from '~/lib/utils'

interface Props {
  class?: HTMLAttributes['class']
  modelValue?: string
  rows?: number
}

const props = withDefaults(defineProps<Props>(), {
  rows: 4,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const delegated = computed(() => {
  const { class: _, modelValue: __, ...rest } = props
  return rest
})
</script>

<template>
  <textarea
    v-bind="delegated"
    :value="modelValue"
    :rows="rows"
    :class="cn(
      'flex min-h-20 w-full rounded-[10px] border border-border bg-card px-3 py-2 text-base text-foreground caret-foreground placeholder:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:cursor-not-allowed disabled:opacity-50',
      props.class
    )"
    @input="emit('update:modelValue', ($event.target as HTMLTextAreaElement).value)"
  />
</template>
