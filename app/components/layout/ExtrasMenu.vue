<script setup lang="ts">
import { extrasMenuActive } from '~/utils/extrasMenuActive'

const props = withDefaults(defineProps<{
  variant?: 'desktop' | 'mobile'
}>(), {
  variant: 'desktop',
})

const emit = defineEmits<{
  navigate: []
}>()

const { categories, categoriesLoaded, categoriesFailed, ensureCategories } = useCatalogNav()
const route = useRoute()
const extrasActive = computed(() => extrasMenuActive(route.path))

const open = ref(false)
const mobileOpen = ref(false)
const rootRef = ref<HTMLElement | null>(null)
let closeTimer: ReturnType<typeof setTimeout> | null = null

function clearCloseTimer() {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

function openMenu() {
  clearCloseTimer()
  open.value = true
}

function scheduleClose() {
  clearCloseTimer()
  closeTimer = setTimeout(() => {
    open.value = false
    closeTimer = null
  }, 160)
}

function closeMenu() {
  clearCloseTimer()
  open.value = false
}

function onFocusOut(event: FocusEvent) {
  const next = event.relatedTarget
  if (!(next instanceof Node) || !rootRef.value?.contains(next)) closeMenu()
}

function onNavigate() {
  closeMenu()
  mobileOpen.value = false
  emit('navigate')
}

onMounted(() => {
  void ensureCategories()
})
onBeforeUnmount(clearCloseTimer)
</script>

<template>
  <div
    v-if="props.variant === 'desktop'"
    ref="rootRef"
    class="relative"
    @mouseenter="openMenu"
    @mouseleave="scheduleClose"
    @focusout="onFocusOut"
    @keydown.escape="closeMenu"
  >
    <button
      type="button"
      class="nav-bobble px-1 py-1 text-[15px] font-bold"
      :class="extrasActive ? 'text-[#0e7490] wavy-teal' : 'text-muted-foreground hover:text-[#0e7490] hover-wavy-teal'"
      :aria-expanded="open"
      aria-haspopup="true"
      @click="open ? closeMenu() : openMenu()"
    >
      Άλλο υλικό
    </button>
    <div v-show="open" class="absolute top-full left-0 z-50 pt-3 w-72">
      <div class="rounded-2xl border border-border bg-card p-3 shadow-[0_24px_48px_-12px_rgba(15,23,42,0.18)] flex flex-col gap-1">
        <span class="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
          Κατηγορίες
        </span>
        <NuxtLink
          v-for="category in categories"
          :key="category.id"
          :to="`/category/${category.slug}`"
          class="rounded-lg px-3 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
          @click="onNavigate"
        >
          {{ category.name }}
        </NuxtLink>
        <p v-if="categoriesFailed && categories.length === 0" class="px-3 py-2 text-sm text-muted-foreground">
          Κάτι πήγε στραβά
        </p>
        <p v-else-if="!categoriesLoaded && categories.length === 0" class="px-3 py-2 text-sm text-muted-foreground">
          Φόρτωση...
        </p>
        <p v-else-if="categories.length === 0" class="px-3 py-2 text-sm text-muted-foreground">
          Δεν υπάρχουν ακόμη κατηγορίες.
        </p>
        <div class="mt-1 border-t border-border pt-1 flex flex-col">
          <NuxtLink
            to="/notes"
            class="rounded-lg px-3 py-2 text-sm font-semibold text-[#0e7490] hover:bg-secondary"
            @click="onNavigate"
          >
            Όλες οι κατηγορίες
          </NuxtLink>
          <NuxtLink
            to="/articles"
            class="rounded-lg px-3 py-2 text-sm font-semibold text-amethyst hover:bg-secondary"
            @click="onNavigate"
          >
            Άρθρα
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>

  <div v-else>
    <button
      type="button"
      class="font-ui w-full flex items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold hover:bg-secondary transition-colors"
      :class="extrasActive ? 'text-[#0e7490]' : 'text-muted-foreground hover:text-foreground'"
      :aria-expanded="mobileOpen"
      @click="mobileOpen = !mobileOpen"
    >
      <VIcon name="bi-collection" class="size-5 shrink-0" aria-hidden="true" />
      <span class="flex-1 text-left">Άλλο υλικό</span>
      <VIcon
        name="bi-chevron-down"
        class="size-4 transition-transform duration-200"
        :class="mobileOpen && 'rotate-180'"
        aria-hidden="true"
      />
    </button>
    <div v-if="mobileOpen" class="ml-4 mt-1 flex flex-col gap-1 border-l border-border pl-3">
      <NuxtLink
        v-for="category in categories"
        :key="category.id"
        :to="`/category/${category.slug}`"
        class="rounded-lg px-2 py-2 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
        @click="onNavigate"
      >
        {{ category.name }}
      </NuxtLink>
      <p v-if="categoriesFailed && categories.length === 0" class="px-2 py-2 text-sm text-muted-foreground">
        Κάτι πήγε στραβά
      </p>
      <p v-else-if="!categoriesLoaded && categories.length === 0" class="px-2 py-2 text-sm text-muted-foreground">
        Φόρτωση...
      </p>
      <p v-else-if="categories.length === 0" class="px-2 py-2 text-sm text-muted-foreground">
        Δεν υπάρχουν ακόμη κατηγορίες.
      </p>
      <NuxtLink
        to="/notes"
        class="rounded-lg px-2 py-2 text-sm font-semibold text-[#0e7490] hover:bg-secondary"
        @click="onNavigate"
      >
        Όλες οι κατηγορίες
      </NuxtLink>
      <NuxtLink
        to="/articles"
        class="rounded-lg px-2 py-2 text-sm font-semibold text-amethyst hover:bg-secondary"
        @click="onNavigate"
      >
        Άρθρα
      </NuxtLink>
    </div>
  </div>
</template>
