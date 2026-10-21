<script setup lang="ts">
import { ref, watch, computed, onMounted, onUnmounted } from 'vue'
import { toast } from 'vue-sonner'
import { foldGreekSearch } from '#shared/utils/foldGreekSearch.mjs'
import { registerSearchInput, topmostSearchInput, unregisterSearchInput } from '~/composables/useSearchHotkey'
import UiPopover from '~/components/ui/popover/Popover.vue'
import UiPopoverAnchor from '~/components/ui/popover/PopoverAnchor.vue'
import UiPopoverContent from '~/components/ui/popover/PopoverContent.vue'

interface SearchResult {
  type: 'chapter' | 'lesson'
  id: string
  title: string
  url: string
}

const props = withDefaults(defineProps<{
  class?: string
  hotkey?: boolean
  size?: 'md' | 'lg'
  submitButton?: boolean
  modelValue?: string
}>(), {
  size: 'md',
  hotkey: false,
  submitButton: false,
  modelValue: undefined,
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const rootRef = ref<HTMLElement | null>(null)
const query = ref(props.modelValue ?? '')
const results = ref<SearchResult[]>([])
const loading = ref(false)
const open = ref(false)
const debounceMs = 300
let debounceTimer: ReturnType<typeof setTimeout> | null = null

const canSubmit = computed(() => foldGreekSearch(query.value.trim()).length >= 2)

watch(() => props.modelValue, (value) => {
  if (value === undefined) return
  if (value !== query.value) query.value = value
})

watch(query, (value) => {
  emit('update:modelValue', value)
  if (debounceTimer) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(search, debounceMs)
})

async function search() {
  const q = query.value.trim()
  if (!q) {
    results.value = []
    open.value = false
    return
  }
  loading.value = true
  try {
    const data = await $fetch<SearchResult[]>('/api/search', { params: { q } })
    results.value = data ?? []
    open.value = true
  } catch {
    results.value = []
    toast.error('Αποτυχία αναζήτησης')
  } finally {
    loading.value = false
  }
}

function close() {
  open.value = false
}

function onFocus() {
  if (query.value.trim()) {
    open.value = true
  }
}

async function goToResults() {
  const q = query.value.trim()
  if (foldGreekSearch(q).length < 2) return
  close()
  await navigateTo({ path: '/search', query: { q } })
}

function onKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter') return
  if (!canSubmit.value) return
  event.preventDefault()
  void goToResults()
}

const placeholder = computed(() => 'Αναζήτηση υλικού...')

let registeredInput: HTMLInputElement | null = null

function onHotkey(event: KeyboardEvent) {
  if (event.repeat) return
  if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== 'k') return
  const target = topmostSearchInput()
  if (!target) return
  event.preventDefault()
  target.focus()
  target.select()
}

onMounted(() => {
  registeredInput = rootRef.value?.querySelector('input') ?? null
  if (registeredInput) registerSearchInput(registeredInput)
  if (!props.hotkey || !import.meta.client) return
  window.addEventListener('keydown', onHotkey)
})

onUnmounted(() => {
  if (debounceTimer) clearTimeout(debounceTimer)
  if (registeredInput) unregisterSearchInput(registeredInput)
  if (props.hotkey && import.meta.client) window.removeEventListener('keydown', onHotkey)
})
</script>

<template>
  <UiPopover v-model:open="open">
    <UiPopoverAnchor as-child>
      <div ref="rootRef" :class="props.class">
        <div
          class="flex w-full items-center gap-2 rounded-[10px] border border-border bg-card px-3 transition-[background-color,border-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-ring"
          :class="props.submitButton ? 'pr-1.5' : ''"
        >
          <VIcon
            name="bi-search"
            aria-hidden="true"
            class="size-4 shrink-0 text-muted-foreground pointer-events-none"
          />
          <input
            v-model="query"
            type="search"
            :placeholder="placeholder"
            aria-label="Αναζήτηση υλικού..."
            class="w-full min-w-0 bg-transparent text-foreground placeholder:text-muted-foreground focus:outline-none border-none"
            :class="props.size === 'lg' ? 'h-12 text-base' : 'h-11 text-base'"
            @focus="onFocus"
            @keydown="onKeydown"
          >
          <button
            v-if="props.submitButton"
            type="button"
            class="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-[10px] bg-primary px-4 font-semibold text-primary-foreground transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-primary/90 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50"
            :class="props.size === 'lg' ? 'h-9 text-sm' : 'h-7 text-xs'"
            :disabled="!canSubmit"
            aria-label="Αναζήτηση"
            @click="goToResults"
          >
            <span>Αναζήτηση</span>
            <VIcon name="bi-arrow-right" class="size-3.5" aria-hidden="true" />
          </button>
          <kbd
            v-else-if="props.hotkey"
            class="pointer-events-none hidden shrink-0 rounded-[8px] border border-border bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground lg:inline-flex"
          >
            Ctrl K
          </kbd>
        </div>
      </div>
    </UiPopoverAnchor>
    <UiPopoverContent
      class="w-max min-w-(--radix-popover-trigger-width) max-w-[min(36rem,calc(100vw-2rem))] max-h-80 overflow-x-hidden overflow-y-auto rounded-2xl border-border p-2 shadow-lg"
      align="start"
      :side-offset="4"
      prioritize-position
      :collision-padding="16"
    >
      <p v-if="loading" class="px-2 py-2 text-sm text-muted-foreground">
        Γίνεται αναζήτηση...
      </p>
      <div role="listbox" aria-label="Αναζήτηση υλικού...">
        <NuxtLink
          v-for="r in results"
          :key="`${r.type}-${r.id}`"
          role="option"
          :to="r.url"
          class="flex w-full min-w-0 items-center gap-3 rounded-xl px-2 py-2 hover:bg-secondary focus-visible:bg-secondary"
          @click="close"
        >
          <UiIconWell>
            <VIcon
              :name="r.type === 'chapter' ? 'bi-journal-bookmark' : 'bi-journal-text'"
              class="size-4"
              aria-hidden="true"
            />
          </UiIconWell>
          <span class="min-w-0">
            <span class="block truncate text-sm font-semibold leading-tight">
              {{ r.title }}
            </span>
            <span class="mt-0.5 block text-xs text-muted-foreground">
              {{ r.type === 'chapter' ? 'Κεφάλαιο' : 'Υλικό' }}
            </span>
          </span>
        </NuxtLink>
      </div>
      <p
        v-if="!loading && results.length === 0 && query.trim()"
        class="px-2 py-2 text-center text-sm text-muted-foreground"
      >
        Δεν βρέθηκαν αποτελέσματα
      </p>
    </UiPopoverContent>
  </UiPopover>
</template>
