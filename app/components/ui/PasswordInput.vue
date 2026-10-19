<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '~/lib/utils'
import UiInput from '~/components/ui/Input.vue'

interface Props {
  id?: string
  modelValue?: string
  placeholder?: string
  autocomplete?: string
  disabled?: boolean
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  id: undefined,
  modelValue: '',
  placeholder: undefined,
  autocomplete: undefined,
  disabled: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const showPassword = ref(false)
</script>

<template>
  <div class="relative">
    <UiInput
      :id="id"
      :model-value="modelValue"
      :type="showPassword ? 'text' : 'password'"
      :placeholder="placeholder"
      :autocomplete="autocomplete"
      :disabled="disabled"
      :class="cn(modelValue ? 'pr-10' : '', props.class)"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <button
      v-if="modelValue"
      type="button"
      class="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer p-0.5 rounded disabled:cursor-not-allowed disabled:opacity-50"
      :aria-label="showPassword ? 'Απόκρυψη κωδικού' : 'Εμφάνιση κωδικού'"
      :disabled="disabled"
      tabindex="-1"
      @click="showPassword = !showPassword"
    >
      <VIcon :name="showPassword ? 'bi-eye-slash' : 'bi-eye'" class="size-4" aria-hidden="true" />
    </button>
  </div>
</template>
