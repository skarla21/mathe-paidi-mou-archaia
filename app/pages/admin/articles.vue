<script setup lang="ts">
import { includesFolded } from '#shared/utils/foldGreekSearch.mjs'
import { toast } from 'vue-sonner'
import UiButton from '~/components/ui/Button.vue'
import UiInput from '~/components/ui/Input.vue'
import UiSkeleton from '~/components/ui/Skeleton.vue'
import UiCard from '~/components/ui/Card.vue'
import UiCardContent from '~/components/ui/CardContent.vue'
import UiBadge from '~/components/ui/Badge.vue'
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
import type { Article } from '~/types/database'

definePageMeta({ layout: 'admin', middleware: 'admin' })
useHead(() => ({ title: 'Διαχείριση - Άρθρα' }))

const adminFetch = useAdminFetch()
const storedImageSrc = useStoredImageSrc()
const articles = ref<Article[]>([])
const loading = ref(true)
const search = ref('')
const modalOpen = ref(false)
const editingArticle = ref<Article | null>(null)
const deleteDialogOpen = ref(false)
const deletingId = ref<string | null>(null)
const deleteLoading = ref(false)
const detailModalOpen = ref(false)
const detailArticleId = ref<string | null>(null)

const filteredArticles = computed(() => {
  if (!search.value) return articles.value
  return articles.value.filter(a => includesFolded(a.title, search.value))
})

async function fetchAll() {
  loading.value = true
  try {
    articles.value = await adminFetch<Article[]>('/api/admin/articles')
  } catch {
    articles.value = []
    toast.error('Κάτι πήγε στραβά')
  } finally {
    loading.value = false
  }
}

onMounted(fetchAll)

function openCreate() {
  editingArticle.value = null
  modalOpen.value = true
}
function openEdit(a: Article) {
  editingArticle.value = a
  modalOpen.value = true
}
function openDelete(id: string) {
  deletingId.value = id
  deleteDialogOpen.value = true
}
function openDetail(id: string) {
  detailArticleId.value = id
  detailModalOpen.value = true
}

async function confirmDelete() {
  if (!deletingId.value) return
  deleteLoading.value = true
  try {
    await adminFetch(`/api/admin/articles/${deletingId.value}`, { method: 'DELETE' })
    await fetchAll()
    deleteDialogOpen.value = false
  } catch {
    toast.error('Κάτι πήγε στραβά')
  } finally {
    deleteLoading.value = false
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold font-heading">Άρθρα</h1>
      <UiButton @click="openCreate">
        <VIcon name="bi-plus-circle" class="mr-2 size-4" />
        Δημιουργία
      </UiButton>
    </div>

    <div class="relative mb-6 max-w-md">
      <VIcon name="bi-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <UiInput v-model="search" placeholder="Αναζήτηση..." class="pl-9" />
    </div>

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

    <template v-else>
      <div v-if="!filteredArticles.length" class="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
        <VIcon name="bi-inbox" class="size-12 mx-auto mb-3 opacity-50" />
        <p>Δεν υπάρχουν άρθρα ακόμα.</p>
      </div>
      <div v-else class="space-y-3">
        <UiCard v-for="a in filteredArticles" :key="a.id" class="rounded-2xl border-border">
          <UiCardContent class="p-4 flex items-center gap-4 flex-wrap">
            <img
              v-if="storedImageSrc(a.image_url)"
              :src="storedImageSrc(a.image_url)"
              :alt="a.title"
              class="size-12 shrink-0 rounded-xl object-cover"
            >
            <UiIconWell v-else>
              <VIcon name="bi-newspaper" class="size-5" aria-hidden="true" />
            </UiIconWell>
            <div class="min-w-0 flex-1">
              <p class="font-semibold">{{ a.title }}</p>
              <div class="flex items-center gap-2 mt-1 flex-wrap text-xs text-muted-foreground">
                <UiBadge :variant="a.published ? 'default' : 'secondary'">
                  {{ a.published ? 'Δημοσιευμένο' : 'Πρόχειρο' }}
                </UiBadge>
                <span>| Χρόνος ανάγνωσης: {{ `${a.reading_time_minutes} λεπτά ανάγνωσης` }}</span>
                <span v-if="a.tags?.length" class="flex items-center gap-1 flex-wrap">
                  | <span v-for="tag in a.tags" :key="tag" class="rounded bg-muted px-1.5 py-0.5">{{ tag }}</span>
                </span>
                <span class="flex items-center gap-0.5">| <VIcon name="bi-heart" class="size-3" /> {{ a.likeCount ?? 0 }}</span>
                <span class="flex items-center gap-0.5">| <VIcon name="bi-chat-text" class="size-3" /> {{ a.commentCount ?? 0 }}</span>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <UiButton size="sm" variant="outline" @click.stop="openDetail(a.id)">
                <VIcon name="bi-eye" class="mr-1 size-3.5" />Λεπτομέρειες
              </UiButton>
              <UiButton size="sm" variant="outline" @click.stop="openEdit(a)">Επεξεργασία</UiButton>
              <UiButton size="sm" variant="destructive" @click.stop="openDelete(a.id)">Διαγραφή</UiButton>
            </div>
          </UiCardContent>
        </UiCard>
      </div>
    </template>

    <AdminArticleModal :open="modalOpen" :article="editingArticle" :articles="articles" @close="modalOpen = false" @saved="fetchAll" />
    <AdminArticleDetailModal :open="detailModalOpen" :article-id="detailArticleId" @close="detailModalOpen = false" />

    <UiAlertDialogRoot v-model:open="deleteDialogOpen">
      <UiAlertDialogPortal>
        <UiAlertDialogOverlay />
        <UiAlertDialogContent>
          <UiAlertDialogHeader>
            <UiAlertDialogTitle>Διαγραφή άρθρου</UiAlertDialogTitle>
            <UiAlertDialogDescription>Θα αφαιρεθεί το άρθρο και όλες οι επισημάνσεις και τα σχόλια.</UiAlertDialogDescription>
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
