<script setup lang="ts">
import { includesFolded } from '#shared/utils/foldGreekSearch.mjs'
import { toast } from 'vue-sonner'
import UiButton from '~/components/ui/Button.vue'
import UiInput from '~/components/ui/Input.vue'
import UiSkeleton from '~/components/ui/Skeleton.vue'
import UiCard from '~/components/ui/Card.vue'
import UiCardContent from '~/components/ui/CardContent.vue'
import UiAlertDialogRoot from '~/components/ui/alert-dialog/AlertDialogRoot.vue'
import UiAlertDialogPortal from '~/components/ui/alert-dialog/AlertDialogPortal.vue'
import UiAlertDialogOverlay from '~/components/ui/alert-dialog/AlertDialogOverlay.vue'
import UiAlertDialogContent from '~/components/ui/alert-dialog/AlertDialogContent.vue'
import UiAlertDialogHeader from '~/components/ui/alert-dialog/AlertDialogHeader.vue'
import UiAlertDialogFooter from '~/components/ui/alert-dialog/AlertDialogFooter.vue'
import UiAlertDialogTitle from '~/components/ui/alert-dialog/AlertDialogTitle.vue'
import UiAlertDialogDescription from '~/components/ui/alert-dialog/AlertDialogDescription.vue'
import UiAlertDialogCancel from '~/components/ui/alert-dialog/AlertDialogCancel.vue'
import UiAlertDialogAction from '~/components/ui/alert-dialog/AlertDialogAction.vue'
import AdminGradeModal from '~/components/admin/GradeModal.vue'
import AdminListCount from '~/components/admin/AdminListCount.vue'
import type { Grade } from '~/types/database'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead(() => ({ title: 'Διαχείριση - Τάξεις' }))

const adminFetch = useAdminFetch()
const grades = ref<Grade[]>([])
const loading = ref(true)
const search = ref('')
const modalOpen = ref(false)
const editingGrade = ref<Grade | null>(null)
const deleteDialogOpen = ref(false)
const deletingId = ref<string | null>(null)
const deleteLoading = ref(false)
const saveOrderLoading = ref(false)
const orderedIds = ref<string[]>([])
const draggedIndex = ref<number | null>(null)

const filteredGrades = computed(() => {
  if (!search.value) return grades.value
  return grades.value.filter(g => includesFolded(g.name, search.value))
})

const displayedGrades = computed(() => {
  const list = filteredGrades.value
  if (orderedIds.value.length !== list.length) return list
  return orderedIds.value
    .map(id => list.find(g => g.id === id))
    .filter((g): g is Grade => !!g)
})

const hasOrderChanged = computed(() => {
  if (search.value) return false
  const list = filteredGrades.value
  if (orderedIds.value.length !== list.length) return false
  return orderedIds.value.some((id, i) => list[i]?.id !== id)
})

const canReorder = computed(() => !search.value)

function syncOrderedIds() {
  orderedIds.value = filteredGrades.value.map(g => g.id)
}

watch(filteredGrades, syncOrderedIds, { deep: true })

async function fetchGrades() {
  loading.value = true
  try {
    grades.value = await adminFetch<Grade[]>('/api/admin/grades')
    syncOrderedIds()
  } catch {
    grades.value = []
    toast.error('Κάτι πήγε στραβά')
  } finally {
    loading.value = false
  }
}

onMounted(fetchGrades)

function openCreate() { editingGrade.value = null; modalOpen.value = true }
function openEdit(g: Grade) { editingGrade.value = g; modalOpen.value = true }
function openDelete(id: string) { deletingId.value = id; deleteDialogOpen.value = true }

async function confirmDelete() {
  if (!deletingId.value) return
  deleteLoading.value = true
  try {
    await adminFetch(`/api/admin/grades/${deletingId.value}`, { method: 'DELETE' })
    await fetchGrades()
    deleteDialogOpen.value = false
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.error(err?.data?.message ?? 'Κάτι πήγε στραβά')
  } finally {
    deleteLoading.value = false
  }
}

async function saveOrder() {
  if (!hasOrderChanged.value) return
  saveOrderLoading.value = true
  try {
    await adminFetch('/api/admin/grades/reorder', { method: 'PATCH', body: { ids: orderedIds.value } })
    toast.success('Η σειρά αποθηκεύτηκε')
    await fetchGrades()
  } catch {
    toast.error('Αποτυχία αποθήκευσης σειράς')
  } finally {
    saveOrderLoading.value = false
  }
}

function onDragStart(e: DragEvent, index: number) {
  draggedIndex.value = index
  e.dataTransfer!.effectAllowed = 'move'
  e.dataTransfer!.setData('text/plain', String(index))
  if (e.target instanceof HTMLElement) e.target.classList.add('opacity-50')
}

function onDragEnd(e: DragEvent) {
  draggedIndex.value = null
  if (e.target instanceof HTMLElement) e.target.classList.remove('opacity-50')
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  e.dataTransfer!.dropEffect = 'move'
}

function onDrop(e: DragEvent, dropIndex: number) {
  e.preventDefault()
  const from = draggedIndex.value
  if (from == null || from === dropIndex) return
  const ids = [...orderedIds.value]
  const [removed] = ids.splice(from, 1)
  if (removed == null) return
  ids.splice(dropIndex, 0, removed)
  orderedIds.value = ids
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold font-heading">
          Τάξεις<AdminListCount v-if="!loading" :shown="filteredGrades.length" :total="grades.length" />
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <UiButton
          :disabled="!canReorder || !hasOrderChanged || saveOrderLoading"
          @click="saveOrder"
        >
          {{ saveOrderLoading ? 'Φόρτωση...' : 'Αποθήκευση σειράς' }}
        </UiButton>
        <UiButton @click="openCreate">
          <VIcon name="bi-plus-circle" class="mr-2 size-4" />
          Δημιουργία
        </UiButton>
      </div>
    </div>

    <!-- Search -->
    <div class="relative mb-6">
      <VIcon name="bi-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <UiInput v-model="search" placeholder="Αναζήτηση..." class="pl-9" />
    </div>

    <!-- Skeleton -->
    <template v-if="loading">
      <div class="space-y-3">
        <UiCard v-for="i in 5" :key="i" class="rounded-2xl border-border">
          <UiCardContent class="p-4 flex items-center gap-4">
            <UiSkeleton class="size-10 shrink-0 rounded-full" />
            <UiSkeleton class="h-4 flex-1" />
          </UiCardContent>
        </UiCard>
      </div>
    </template>

    <!-- Cards -->
    <template v-else>
      <div v-if="!displayedGrades.length" class="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <VIcon name="bi-inbox" class="size-12 mx-auto mb-3 opacity-50" />
        <p>Δεν υπάρχουν τάξεις. Δημιούργησέ τες μέσω API ή διαχείρισης.</p>
      </div>
      <div v-else class="space-y-3">
        <UiCard
          v-for="(g, index) in displayedGrades"
          :key="g.id"
          class="rounded-2xl border-border transition-opacity"
          :draggable="canReorder"
          @dragstart="onDragStart($event, index)"
          @dragend="onDragEnd"
          @dragover="onDragOver"
          @drop="onDrop($event, index)"
        >
          <UiCardContent class="p-4 flex items-center gap-4">
            <div
              class="cursor-grab active:cursor-grabbing shrink-0 rounded p-1 hover:bg-muted text-muted-foreground"
              aria-label="Σύρε για αναδιάταξη"
            >
              <VIcon name="bi-grip-vertical" class="size-5" />
            </div>
            <UiIconWell>
              <VIcon name="bi-mortarboard" class="size-5" aria-hidden="true" />
            </UiIconWell>
            <div class="min-w-0 flex-1">
              <p class="font-semibold">{{ g.name }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <UiButton size="sm" variant="outline" @click.stop="openEdit(g)">Επεξεργασία</UiButton>
              <UiButton size="sm" variant="destructive" @click.stop="openDelete(g.id)">Διαγραφή</UiButton>
            </div>
          </UiCardContent>
        </UiCard>
      </div>
    </template>

    <AdminGradeModal :open="modalOpen" :grade="editingGrade" @close="modalOpen = false" @saved="fetchGrades" />

    <UiAlertDialogRoot v-model:open="deleteDialogOpen">
      <UiAlertDialogPortal>
        <UiAlertDialogOverlay />
        <UiAlertDialogContent>
          <UiAlertDialogHeader>
            <UiAlertDialogTitle>Επιβεβαίωση διαγραφής</UiAlertDialogTitle>
            <UiAlertDialogDescription>Είστε σίγουροι; Δεν μπορεί να αναιρεθεί.</UiAlertDialogDescription>
          </UiAlertDialogHeader>
          <UiAlertDialogFooter>
            <UiAlertDialogCancel><UiButton variant="cancel">Ακύρωση</UiButton></UiAlertDialogCancel>
            <UiAlertDialogAction as-child>
              <UiButton variant="destructive" :disabled="deleteLoading" @click="confirmDelete">Διαγραφή</UiButton>
            </UiAlertDialogAction>
          </UiAlertDialogFooter>
        </UiAlertDialogContent>
      </UiAlertDialogPortal>
    </UiAlertDialogRoot>
  </div>
</template>
