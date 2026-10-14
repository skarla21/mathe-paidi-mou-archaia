<script setup lang="ts">
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
import AdminCategoryModal from '~/components/admin/CategoryModal.vue'
import AdminListCount from '~/components/admin/AdminListCount.vue'
import AdminSortModal from '~/components/admin/AdminSortModal.vue'
import type { Category } from '~/types/database'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead(() => ({ title: 'Διαχείριση - Κατηγορίες' }))

const adminFetch = useAdminFetch()
const storedImageSrc = useStoredImageSrc()
const categories = ref<Category[]>([])
const loading = ref(true)
const search = ref('')
const modalOpen = ref(false)
const sortModalOpen = ref(false)
const editingCategory = ref<Category | null>(null)
const deleteDialogOpen = ref(false)
const deletingId = ref<string | null>(null)
const deleteLoading = ref(false)

const filteredCategories = computed(() => {
  if (!search.value) return categories.value
  const q = search.value.toLowerCase()
  return categories.value.filter(c => c.name.toLowerCase().includes(q))
})

async function fetchCategories() {
  loading.value = true
  try {
    categories.value = await adminFetch<Category[]>('/api/admin/categories')
  } catch {
    categories.value = []
    toast.error('Κάτι πήγε στραβά')
  } finally {
    loading.value = false
  }
}

onMounted(fetchCategories)

function openCreate() { editingCategory.value = null; modalOpen.value = true }
function openEdit(c: Category) { editingCategory.value = c; modalOpen.value = true }
function openDelete(id: string) { deletingId.value = id; deleteDialogOpen.value = true }

async function confirmDelete() {
  if (!deletingId.value) return
  deleteLoading.value = true
  try {
    await adminFetch(`/api/admin/categories/${deletingId.value}`, { method: 'DELETE' })
    await fetchCategories()
    deleteDialogOpen.value = false
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.error(err?.data?.message ?? 'Κάτι πήγε στραβά')
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold font-heading">
          Κατηγορίες<AdminListCount v-if="!loading" :shown="filteredCategories.length" :total="categories.length" />
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <UiButton variant="outline" @click="sortModalOpen = true">
          <VIcon name="bi-arrow-down-up" class="mr-2 size-4" />
          Ταξινόμηση κατηγοριών
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
      <div v-if="!filteredCategories.length" class="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <VIcon name="bi-inbox" class="size-12 mx-auto mb-3 opacity-50" />
        <p>Δεν υπάρχουν κατηγορίες ακόμα.</p>
      </div>
      <div v-else class="space-y-3">
        <UiCard v-for="c in filteredCategories" :key="c.id" class="rounded-2xl border-border">
          <UiCardContent class="p-4 flex items-center gap-4">
            <img
              v-if="storedImageSrc(c.image_url)"
              :src="storedImageSrc(c.image_url)"
              :alt="c.name"
              class="size-12 shrink-0 rounded-xl object-cover"
            >
            <UiIconWell v-else>
              <VIcon name="bi-folder" class="size-5" aria-hidden="true" />
            </UiIconWell>
            <div class="min-w-0 flex-1">
              <p class="font-semibold">{{ c.name }}</p>
              <p v-if="c.description" class="text-sm text-muted-foreground line-clamp-1">{{ c.description }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <UiButton size="sm" variant="outline" @click.stop="openEdit(c)">Επεξεργασία</UiButton>
              <UiButton size="sm" variant="destructive" @click.stop="openDelete(c.id)">Διαγραφή</UiButton>
            </div>
          </UiCardContent>
        </UiCard>
      </div>
    </template>

    <AdminCategoryModal :open="modalOpen" :category="editingCategory" @close="modalOpen = false" @saved="fetchCategories" />

    <AdminSortModal
      :open="sortModalOpen"
      mode="categories"
      @close="sortModalOpen = false"
      @saved="fetchCategories"
    />

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
