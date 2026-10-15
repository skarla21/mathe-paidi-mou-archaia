<script setup lang="ts">
import UiDialog from '~/components/ui/dialog/Dialog.vue'
import UiDialogPortal from '~/components/ui/dialog/DialogPortal.vue'
import UiDialogOverlay from '~/components/ui/dialog/DialogOverlay.vue'
import UiDialogContent from '~/components/ui/dialog/DialogContent.vue'
import UiDialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import UiDialogFooter from '~/components/ui/dialog/DialogFooter.vue'
import UiDialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import UiButton from '~/components/ui/Button.vue'
import AdminTablePager from '~/components/admin/AdminTablePager.vue'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs'
import { toast } from 'vue-sonner'
import type { AdminListPage } from '~~/types/domain'
import type { Purchase, Download, LessonRating, LessonComment, ArticleLike, ArticleComment } from '~/types/database'

const props = defineProps<{ open: boolean; userId: string | null }>()
const emit = defineEmits<{ close: [] }>()
const adminFetch = useAdminFetch()

const purchases = reactive(useAdminDetailTab<Purchase>())
const downloads = reactive(useAdminDetailTab<Download>())
const ratings = reactive(useAdminDetailTab<LessonRating>())
const comments = reactive(useAdminDetailTab<LessonComment>())
const articleLikes = reactive(useAdminDetailTab<ArticleLike>())
const articleComments = reactive(useAdminDetailTab<ArticleComment>())
const loading = ref(false)

type PendingDelete =
  | { kind: 'rating'; id: string }
  | { kind: 'comment'; id: string }
  | { kind: 'article_like'; id: string }
  | { kind: 'article_comment'; id: string }
const pendingDelete = ref<PendingDelete | null>(null)
const deleteDialogOpen = ref(false)
const deleteLoading = ref(false)

function fetchPage<T>(path: string, pageNumber: number) {
  return adminFetch<AdminListPage<T>>(path, { query: { page: pageNumber } })
}

async function loadAll() {
  if (!props.userId) return
  loading.value = true
  try {
    const uid = props.userId
    await Promise.all([
      purchases.load((p) => fetchPage(`/api/admin/users/${uid}/purchases`, p)),
      downloads.load((p) => fetchPage(`/api/admin/users/${uid}/downloads`, p)),
      ratings.load((p) => fetchPage(`/api/admin/users/${uid}/ratings`, p)),
      comments.load((p) => fetchPage(`/api/admin/users/${uid}/comments`, p)),
      articleLikes.load((p) => fetchPage(`/api/admin/users/${uid}/article-likes`, p)),
      articleComments.load((p) => fetchPage(`/api/admin/users/${uid}/article-comments`, p)),
    ])
  } catch {
    toast.error('Κάτι πήγε στραβά')
  } finally {
    loading.value = false
  }
}

watch(() => props.open, async (val) => {
  if (!val || !props.userId) return
  purchases.reset()
  downloads.reset()
  ratings.reset()
  comments.reset()
  articleLikes.reset()
  articleComments.reset()
  await loadAll()
})

function watchTabPage(pageSource: { page: number }, loader: () => Promise<void>) {
  watch(() => pageSource.page, async () => {
    if (!props.open || !props.userId || loading.value) return
    try {
      await loader()
    } catch {
      toast.error('Κάτι πήγε στραβά')
    }
  })
}

watchTabPage(purchases, () => purchases.load((p) => fetchPage(`/api/admin/users/${props.userId}/purchases`, p)))
watchTabPage(downloads, () => downloads.load((p) => fetchPage(`/api/admin/users/${props.userId}/downloads`, p)))
watchTabPage(ratings, () => ratings.load((p) => fetchPage(`/api/admin/users/${props.userId}/ratings`, p)))
watchTabPage(comments, () => comments.load((p) => fetchPage(`/api/admin/users/${props.userId}/comments`, p)))
watchTabPage(articleLikes, () => articleLikes.load((p) => fetchPage(`/api/admin/users/${props.userId}/article-likes`, p)))
watchTabPage(articleComments, () => articleComments.load((p) => fetchPage(`/api/admin/users/${props.userId}/article-comments`, p)))

function requestDelete(kind: PendingDelete['kind'], id: string) {
  pendingDelete.value = { kind, id } as PendingDelete
  deleteDialogOpen.value = true
}

async function confirmDelete() {
  if (!pendingDelete.value) return
  deleteLoading.value = true
  const { kind, id } = pendingDelete.value
  try {
    if (kind === 'rating') {
      await adminFetch(`/api/admin/ratings/${id}`, { method: 'DELETE' })
      ratings.items = ratings.items.filter(r => r.id !== id)
      ratings.total = Math.max(0, ratings.total - 1)
      toast.success('Η βαθμολογία διαγράφηκε')
    } else if (kind === 'comment') {
      await adminFetch(`/api/admin/comments/${id}`, { method: 'DELETE' })
      comments.items = comments.items.filter(c => c.id !== id)
      comments.total = Math.max(0, comments.total - 1)
      toast.success('Το σχόλιο διαγράφηκε')
    } else if (kind === 'article_like') {
      await adminFetch(`/api/admin/article-likes/${id}`, { method: 'DELETE' })
      articleLikes.items = articleLikes.items.filter(x => x.id !== id)
      articleLikes.total = Math.max(0, articleLikes.total - 1)
      toast.success('Η επισήμανση αφαιρέθηκε')
    } else {
      await adminFetch(`/api/admin/article-comments/${id}`, { method: 'DELETE' })
      articleComments.items = articleComments.items.filter(x => x.id !== id)
      articleComments.total = Math.max(0, articleComments.total - 1)
      toast.success('Το σχόλιο διαγράφηκε')
    }
    deleteDialogOpen.value = false
    pendingDelete.value = null
  } catch {
    toast.error('Κάτι πήγε στραβά')
  } finally { deleteLoading.value = false }
}
</script>

<template>
  <UiDialog :open="!!props.open" @update:open="(v: boolean) => !v && emit('close')">
    <UiDialogPortal>
      <UiDialogOverlay />
      <UiDialogContent class="w-fit min-w-[min(32rem,calc(100vw-2rem))] max-w-[calc(100vw-2rem)] max-h-[80vh] overflow-x-hidden overflow-y-auto">
        <UiDialogHeader class="min-w-0">
          <UiDialogTitle>Λεπτομέρειες χρήστη</UiDialogTitle>
        </UiDialogHeader>
        <div v-if="loading" class="py-4 text-sm text-muted-foreground">Φόρτωση...</div>
        <Tabs v-else default-value="downloads" class="min-w-0 max-w-full">
          <TabsList class="w-max max-w-full overflow-x-auto">
            <TabsTrigger value="downloads" class="flex-1 text-xs">
              Λήψεις ({{ downloads.total }})
            </TabsTrigger>
            <TabsTrigger value="purchases" class="flex-1 text-xs">
              Αγορές ({{ purchases.total }})
            </TabsTrigger>
            <TabsTrigger value="ratings" class="flex-1 text-xs">
              Βαθμολογίες ({{ ratings.total }})
            </TabsTrigger>
            <TabsTrigger value="comments" class="flex-1 text-xs">
              Σχόλια ({{ comments.total }})
            </TabsTrigger>
            <TabsTrigger value="articleLikes" class="flex-1 text-xs">
              Επισημάνσεις άρθρων ({{ articleLikes.total }})
            </TabsTrigger>
            <TabsTrigger value="articleComments" class="flex-1 text-xs">
              Σχόλια άρθρων ({{ articleComments.total }})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="downloads" class="mt-4">
            <p v-if="!downloads.items.length" class="text-xs text-muted-foreground">—</p>
            <ul v-else class="text-xs space-y-1">
              <li v-for="d in downloads.items" :key="d.id" class="flex justify-between gap-2">
                <span>{{ d.lessons?.title }}</span>
                <span class="text-muted-foreground shrink-0">{{ new Date(d.downloaded_at).toLocaleDateString() }}</span>
              </li>
            </ul>
            <AdminTablePager
              v-model:page="downloads.page"
              :total="downloads.total"
              :page-size="downloads.pageSize"
              :disabled="downloads.loading"
            />
          </TabsContent>

          <TabsContent value="purchases" class="mt-4">
            <p v-if="!purchases.items.length" class="text-xs text-muted-foreground">—</p>
            <ul v-else class="text-xs space-y-1">
              <li v-for="p in purchases.items" :key="p.id" class="flex justify-between gap-2">
                <span>{{ p.lessons?.title }}</span>
                <span class="text-muted-foreground shrink-0">{{ new Date(p.created_at).toLocaleDateString() }}</span>
              </li>
            </ul>
            <AdminTablePager
              v-model:page="purchases.page"
              :total="purchases.total"
              :page-size="purchases.pageSize"
              :disabled="purchases.loading"
            />
          </TabsContent>

          <TabsContent value="ratings" class="mt-4">
            <p v-if="!ratings.items.length" class="text-xs text-muted-foreground">Δεν υπάρχουν βαθμολογίες ακόμα.</p>
            <ul v-else class="text-xs space-y-2">
              <li v-for="r in ratings.items" :key="r.id" class="flex items-center justify-between gap-2">
                <div class="flex flex-col gap-0.5 min-w-0">
                  <span class="truncate">{{ r.lessons?.title }}</span>
                  <span class="flex items-center gap-0.5">
                    <template v-for="i in 5" :key="i">
                      <VIcon
                        :name="i <= r.rating ? 'bi-star-fill' : 'bi-star'"
                        class="w-3 h-3"
                        :class="i <= r.rating ? 'text-yellow-400' : 'text-muted-foreground'"
                      />
                    </template>
                  </span>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-muted-foreground">{{ new Date(r.created_at).toLocaleDateString() }}</span>
                  <UiButton
                    variant="ghost"
                    size="icon"
                    class="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                    aria-label="Διαγραφή βαθμολογίας"
                    @click="requestDelete('rating', r.id)"
                  >
                    <VIcon name="bi-trash" class="w-3 h-3" />
                  </UiButton>
                </div>
              </li>
            </ul>
            <AdminTablePager
              v-model:page="ratings.page"
              :total="ratings.total"
              :page-size="ratings.pageSize"
              :disabled="ratings.loading"
            />
          </TabsContent>

          <TabsContent value="comments" class="mt-4">
            <p v-if="!comments.items.length" class="text-xs text-muted-foreground">Δεν υπάρχουν σχόλια ακόμα.</p>
            <ul v-else class="text-xs space-y-2">
              <li v-for="c in comments.items" :key="c.id" class="flex items-start justify-between gap-2">
                <div class="flex flex-col gap-0.5 min-w-0">
                  <span class="truncate font-medium">{{ c.lessons?.title }}</span>
                  <span class="text-muted-foreground line-clamp-2">{{ c.body }}</span>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-muted-foreground">{{ new Date(c.created_at).toLocaleDateString() }}</span>
                  <UiButton
                    variant="ghost"
                    size="icon"
                    class="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                    aria-label="Διαγραφή σχολίου"
                    @click="requestDelete('comment', c.id)"
                  >
                    <VIcon name="bi-trash" class="w-3 h-3" />
                  </UiButton>
                </div>
              </li>
            </ul>
            <AdminTablePager
              v-model:page="comments.page"
              :total="comments.total"
              :page-size="comments.pageSize"
              :disabled="comments.loading"
            />
          </TabsContent>

          <TabsContent value="articleLikes" class="mt-4">
            <p v-if="!articleLikes.items.length" class="text-xs text-muted-foreground">—</p>
            <ul v-else class="text-xs space-y-2">
              <li v-for="x in articleLikes.items" :key="x.id" class="flex items-start justify-between gap-2">
                <div class="flex flex-col gap-0.5 min-w-0">
                  <span class="truncate font-medium">{{ x.articles?.title }}</span>
                  <span class="text-muted-foreground">{{ new Date(x.created_at).toLocaleDateString() }}</span>
                </div>
                <UiButton
                  variant="ghost"
                  size="icon"
                  class="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                  aria-label="Αφαίρεση επισήμανσης"
                  @click="requestDelete('article_like', x.id)"
                >
                  <VIcon name="bi-trash" class="w-3 h-3" />
                </UiButton>
              </li>
            </ul>
            <AdminTablePager
              v-model:page="articleLikes.page"
              :total="articleLikes.total"
              :page-size="articleLikes.pageSize"
              :disabled="articleLikes.loading"
            />
          </TabsContent>

          <TabsContent value="articleComments" class="mt-4">
            <p v-if="!articleComments.items.length" class="text-xs text-muted-foreground">Δεν υπάρχουν σχόλια ακόμα.</p>
            <ul v-else class="text-xs space-y-2">
              <li v-for="x in articleComments.items" :key="x.id" class="flex items-start justify-between gap-2">
                <div class="flex flex-col gap-0.5 min-w-0">
                  <span class="truncate font-medium">
                    {{ x.articles?.title }}
                    <span
                      v-if="x.parent_id"
                      class="ml-1 font-normal text-muted-foreground"
                    >(απάντηση)</span>
                  </span>
                  <span class="text-muted-foreground line-clamp-2">{{ x.body }}</span>
                </div>
                <div class="flex items-center gap-2 shrink-0">
                  <span class="text-muted-foreground">{{ new Date(x.created_at).toLocaleDateString() }}</span>
                  <UiButton
                    variant="ghost"
                    size="icon"
                    class="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                    aria-label="Διαγραφή σχολίου"
                    @click="requestDelete('article_comment', x.id)"
                  >
                    <VIcon name="bi-trash" class="w-3 h-3" />
                  </UiButton>
                </div>
              </li>
            </ul>
            <AdminTablePager
              v-model:page="articleComments.page"
              :total="articleComments.total"
              :page-size="articleComments.pageSize"
              :disabled="articleComments.loading"
            />
          </TabsContent>
        </Tabs>
        <UiDialogFooter class="mt-4 min-w-0">
          <UiButton variant="cancel" @click="emit('close')">Ακύρωση</UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialogPortal>
  </UiDialog>

  <UiAlertDialogRoot v-model:open="deleteDialogOpen">
    <UiAlertDialogPortal>
      <UiAlertDialogOverlay />
      <UiAlertDialogContent>
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>
            {{
              pendingDelete?.kind === 'rating'
                ? 'Διαγραφή βαθμολογίας'
                : pendingDelete?.kind === 'comment' || pendingDelete?.kind === 'article_comment'
                  ? 'Διαγραφή σχολίου'
                  : 'Αφαίρεση επισήμανσης'
            }}
          </UiAlertDialogTitle>
          <UiAlertDialogDescription>
            {{
              pendingDelete?.kind === 'rating'
                ? 'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτήν τη βαθμολογία;'
                : pendingDelete?.kind === 'comment'
                  ? 'Είστε σίγουροι ότι θέλετε να διαγράψετε αυτό το σχόλιο;'
                  : pendingDelete?.kind === 'article_comment'
                    ? 'Θα αφαιρεθεί το σχόλιο από το άρθρο.'
                    : 'Θα αφαιρεθεί η επισήμανση από το άρθρο.'
            }}
          </UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel>
            <UiButton variant="cancel">Ακύρωση</UiButton>
          </UiAlertDialogCancel>
          <UiAlertDialogAction as-child>
            <UiButton variant="destructive" :disabled="deleteLoading" @click="confirmDelete">
              Διαγραφή
            </UiButton>
          </UiAlertDialogAction>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialogPortal>
  </UiAlertDialogRoot>
</template>
