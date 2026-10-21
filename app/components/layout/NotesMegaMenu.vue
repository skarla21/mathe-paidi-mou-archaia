<script setup lang="ts">
import { notesMenuActive } from '~/utils/notesMenuActive'

const props = withDefaults(defineProps<{
  variant?: 'desktop' | 'mobile'
}>(), {
  variant: 'desktop',
})

const emit = defineEmits<{
  navigate: []
}>()

const {
  grades,
  loaded,
  failed,
  ensure,
  subjectsForGrade,
} = useCatalogNav()

const route = useRoute()
const notesActive = computed(() => notesMenuActive({
  path: route.path,
  gradeSlugs: grades.value.map((grade) => grade.slug),
  catalogFailed: failed.value,
  gradeParam: route.params.grade,
}))

const open = ref(false)
const panelShift = ref(0)
const rootRef = ref<HTMLElement | null>(null)
const panelRef = ref<HTMLElement | null>(null)
const activeGradeId = ref<string | null>(null)
const mobileOpen = ref(false)
const mobileGradeId = ref<string | null>(null)
let closeTimer: ReturnType<typeof setTimeout> | null = null

const choiceHit = 'relative z-0 before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-lg after:absolute after:inset-x-0 after:top-full after:h-1'

const activeSubjects = computed(() =>
  activeGradeId.value ? subjectsForGrade(activeGradeId.value) : [],
)
const activeGrade = computed(() => grades.value.find((grade) => grade.id === activeGradeId.value) ?? null)

function clearCloseTimer() {
  if (closeTimer) {
    clearTimeout(closeTimer)
    closeTimer = null
  }
}

let positionToken = 0

async function positionPanel() {
  const token = ++positionToken
  await nextTick()
  const panel = panelRef.value
  if (!panel || token !== positionToken) return
  panelShift.value = 0
  await nextTick()
  if (token !== positionToken) return
  const rect = panel.getBoundingClientRect()
  const margin = 12
  let shift = 0
  if (rect.right > window.innerWidth - margin) {
    shift = window.innerWidth - margin - rect.right
  }
  const left = rect.left + shift
  if (left < margin) shift += margin - left
  panelShift.value = shift
}

function onResize() {
  if (open.value) void positionPanel()
}

function selectGrade(gradeId: string) {
  if (activeGradeId.value === gradeId) return
  activeGradeId.value = gradeId
}

function openMenu() {
  clearCloseTimer()
  open.value = true
  void positionPanel()
}

function clearSelection() {
  activeGradeId.value = null
}

function scheduleClose() {
  clearCloseTimer()
  closeTimer = setTimeout(() => {
    open.value = false
    clearSelection()
    closeTimer = null
  }, 160)
}

function closeMenu() {
  clearCloseTimer()
  open.value = false
  clearSelection()
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

function toggleMobileGrade(gradeId: string) {
  mobileGradeId.value = mobileGradeId.value === gradeId ? null : gradeId
}

watch(activeGradeId, () => {
  if (open.value) void positionPanel()
})

let panelObserver: ResizeObserver | null = null

onMounted(() => {
  void ensure()
  window.addEventListener('resize', onResize)
  if (panelRef.value) {
    panelObserver = new ResizeObserver(() => {
      if (open.value) void positionPanel()
    })
    panelObserver.observe(panelRef.value)
  }
})

onBeforeUnmount(() => {
  clearCloseTimer()
  panelObserver?.disconnect()
  if (import.meta.client) window.removeEventListener('resize', onResize)
})
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
      class="flex items-center gap-1 px-1 py-1 text-[15px] font-semibold"
      :class="notesActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground'"
      :aria-expanded="open"
      aria-haspopup="true"
      @click="open ? closeMenu() : openMenu()"
    >
      Σημειώσεις
      <VIcon
        name="bi-chevron-down"
        class="size-3.5 transition-transform duration-200"
        :class="open && 'rotate-180'"
        aria-hidden="true"
      />
    </button>
    <div
      v-show="open"
      ref="panelRef"
      class="absolute top-full left-0 z-50 pt-3"
      :class="activeGradeId ? 'w-[min(36rem,calc(100vw-2rem))]' : 'w-80'"
      :style="panelShift ? { transform: `translateX(${panelShift}px)` } : undefined"
    >
      <div class="flex gap-3 rounded-xl border border-border bg-card p-4 text-left shadow-[0_10px_24px_rgba(42,36,32,0.08)]">
        <div
          class="flex flex-col gap-1 rounded-xl bg-secondary p-2"
          :class="activeGradeId ? 'w-[calc((36rem-2rem-0.75rem)/2)] shrink-0' : 'min-w-52 flex-1'"
        >
          <span class="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Τάξεις
          </span>
          <NuxtLink
            v-for="grade in grades"
            :key="grade.id"
            :to="`/${grade.slug}`"
            :class="[
              choiceHit,
              'flex items-center justify-between px-3 py-2 text-sm font-semibold text-muted-foreground hover:text-laurel hover:before:bg-muted',
              activeGradeId === grade.id && 'text-foreground before:bg-card before:shadow-sm',
            ]"
            @mouseenter="selectGrade(grade.id)"
            @focus="selectGrade(grade.id)"
            @click="onNavigate"
          >
            {{ grade.name }}
            <VIcon name="bi-chevron-right" class="size-3.5" aria-hidden="true" />
          </NuxtLink>
          <p v-if="failed && grades.length === 0" class="px-3 py-2 text-sm text-muted-foreground">
            Κάτι πήγε στραβά
          </p>
          <p v-else-if="!loaded && grades.length === 0" class="px-3 py-2 text-sm text-muted-foreground">
            Φόρτωση...
          </p>
          <p v-else-if="grades.length === 0" class="px-3 py-2 text-sm text-muted-foreground">
            Δεν υπάρχουν ακόμη τάξεις.
          </p>
        </div>
        <div v-if="activeGradeId" class="flex w-[calc((36rem-2rem-0.75rem)/2)] shrink-0 flex-col gap-1 rounded-xl bg-secondary/60 p-2">
          <span class="px-2 py-1 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Μαθήματα
          </span>
          <template v-for="subject in activeSubjects" :key="subject.id">
            <NuxtLink
              v-if="activeGrade?.slug && subject.slug"
              :to="`/${activeGrade.slug}/${subject.slug}`"
              :class="[choiceHit, 'px-3 py-2 text-sm font-semibold text-foreground hover:before:bg-muted']"
              @click="onNavigate"
            >
              {{ subject.name }}
            </NuxtLink>
          </template>
          <p v-if="activeSubjects.length === 0" class="px-3 py-2 text-sm text-muted-foreground">
            Δεν υπάρχουν ακόμη μαθήματα σε αυτή την τάξη.
          </p>
        </div>
      </div>
    </div>
  </div>

  <div v-else>
    <button
      type="button"
      class="font-ui flex w-full items-center gap-3 rounded-xl px-3 py-3 text-base font-semibold transition-colors hover:bg-secondary"
      :class="notesActive ? 'text-[#10b981]' : 'text-muted-foreground hover:text-foreground'"
      :aria-expanded="mobileOpen"
      @click="mobileOpen = !mobileOpen"
    >
      <VIcon name="bi-journal-text" class="size-5 shrink-0" aria-hidden="true" />
      <span class="flex-1 text-left">Σημειώσεις</span>
      <VIcon
        name="bi-chevron-down"
        class="size-4 transition-transform duration-200"
        :class="mobileOpen && 'rotate-180'"
        aria-hidden="true"
      />
    </button>
    <div v-if="mobileOpen" class="ml-4 mt-1 flex flex-col gap-1 border-l border-border pl-3">
      <p v-if="failed && grades.length === 0" class="px-2 py-2 text-sm text-muted-foreground">
        Κάτι πήγε στραβά
      </p>
      <p v-else-if="!loaded && grades.length === 0" class="px-2 py-2 text-sm text-muted-foreground">
        Φόρτωση...
      </p>
      <p v-else-if="grades.length === 0" class="px-2 py-2 text-sm text-muted-foreground">
        Δεν υπάρχουν ακόμη τάξεις.
      </p>
      <div v-for="grade in grades" :key="grade.id">
        <div class="flex items-center gap-1">
          <NuxtLink
            v-if="grade.slug"
            :to="`/${grade.slug}`"
            class="min-w-0 flex-1 rounded-lg px-2 py-2 text-sm font-semibold text-foreground hover:bg-secondary"
            @click="onNavigate"
          >
            {{ grade.name }}
          </NuxtLink>
          <button
            type="button"
            class="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary hover:text-foreground"
            :aria-expanded="mobileGradeId === grade.id"
            :aria-label="mobileGradeId === grade.id ? `Απόκρυψη μαθημάτων για ${grade.name}` : `Μαθήματα για ${grade.name}`"
            @click="toggleMobileGrade(grade.id)"
          >
            <VIcon
              name="bi-chevron-down"
              class="size-3.5 transition-transform"
              :class="mobileGradeId === grade.id && 'rotate-180'"
              aria-hidden="true"
            />
          </button>
        </div>
        <div v-if="mobileGradeId === grade.id" class="ml-2 flex flex-col gap-1 pb-2">
          <template v-for="subject in subjectsForGrade(grade.id)" :key="subject.id">
            <NuxtLink
              v-if="grade.slug && subject.slug"
              :to="`/${grade.slug}/${subject.slug}`"
              class="rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-secondary hover:text-foreground"
              @click="onNavigate"
            >
              {{ subject.name }}
            </NuxtLink>
          </template>
          <p v-if="subjectsForGrade(grade.id).length === 0" class="px-2 py-1.5 text-sm text-muted-foreground">
            Δεν υπάρχουν ακόμη μαθήματα σε αυτή την τάξη.
          </p>
        </div>
      </div>
    </div>
  </div>
</template>
