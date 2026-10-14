<script setup lang="ts">
import UiDialog from "~/components/ui/dialog/Dialog.vue";
import UiDialogPortal from "~/components/ui/dialog/DialogPortal.vue";
import UiDialogOverlay from "~/components/ui/dialog/DialogOverlay.vue";
import UiDialogContent from "~/components/ui/dialog/DialogContent.vue";
import UiDialogHeader from "~/components/ui/dialog/DialogHeader.vue";
import UiDialogFooter from "~/components/ui/dialog/DialogFooter.vue";
import UiDialogTitle from "~/components/ui/dialog/DialogTitle.vue";
import UiButton from "~/components/ui/Button.vue";
import UiAlertDialogRoot from "~/components/ui/alert-dialog/AlertDialogRoot.vue";
import UiAlertDialogPortal from "~/components/ui/alert-dialog/AlertDialogPortal.vue";
import UiAlertDialogOverlay from "~/components/ui/alert-dialog/AlertDialogOverlay.vue";
import UiAlertDialogContent from "~/components/ui/alert-dialog/AlertDialogContent.vue";
import UiAlertDialogHeader from "~/components/ui/alert-dialog/AlertDialogHeader.vue";
import UiAlertDialogFooter from "~/components/ui/alert-dialog/AlertDialogFooter.vue";
import UiAlertDialogTitle from "~/components/ui/alert-dialog/AlertDialogTitle.vue";
import UiAlertDialogDescription from "~/components/ui/alert-dialog/AlertDialogDescription.vue";
import UiAlertDialogCancel from "~/components/ui/alert-dialog/AlertDialogCancel.vue";
import UiAlertDialogAction from "~/components/ui/alert-dialog/AlertDialogAction.vue";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { toast } from "vue-sonner";
import type { ArticleLike, ArticleComment } from "~/types/database";

const props = defineProps<{ open: boolean; articleId: string | null }>();
const emit = defineEmits<{ close: [] }>();
const adminFetch = useAdminFetch();

const likes = ref<ArticleLike[]>([]);
const comments = ref<ArticleComment[]>([]);
const loading = ref(false);

type PendingDelete =
  | { kind: "like"; id: string }
  | { kind: "comment"; id: string };
const pendingDelete = ref<PendingDelete | null>(null);
const deleteDialogOpen = ref(false);
const deleteLoading = ref(false);

watch(
  () => props.open,
  async (val) => {
    if (!val || !props.articleId) return;
    loading.value = true;
    likes.value = [];
    comments.value = [];
    try {
      const [l, c] = await Promise.all([
        adminFetch<ArticleLike[]>(
          `/api/admin/articles/${props.articleId}/likes`,
        ),
        adminFetch<ArticleComment[]>(
          `/api/admin/articles/${props.articleId}/comments`,
        ),
      ]);
      likes.value = l;
      comments.value = c;
    } catch {
      toast.error("Κάτι πήγε στραβά");
    } finally {
      loading.value = false;
    }
  },
);

function requestDeleteLike(id: string) {
  pendingDelete.value = { kind: "like", id };
  deleteDialogOpen.value = true;
}

function requestDeleteComment(id: string) {
  pendingDelete.value = { kind: "comment", id };
  deleteDialogOpen.value = true;
}

async function confirmDelete() {
  if (!pendingDelete.value) return;
  deleteLoading.value = true;
  const { kind, id } = pendingDelete.value;
  try {
    if (kind === "like") {
      await adminFetch(`/api/admin/article-likes/${id}`, { method: "DELETE" });
      likes.value = likes.value.filter((x) => x.id !== id);
      toast.success("Η επισήμανση αφαιρέθηκε");
    } else {
      await adminFetch(`/api/admin/article-comments/${id}`, {
        method: "DELETE",
      });
      comments.value = comments.value.filter((x) => x.id !== id);
      toast.success("Το σχόλιο διαγράφηκε");
    }
    deleteDialogOpen.value = false;
    pendingDelete.value = null;
  } catch {
    toast.error("Κάτι πήγε στραβά");
  } finally {
    deleteLoading.value = false;
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString();
}
</script>

<template>
  <UiDialog
    :open="!!props.open"
    @update:open="(v: boolean) => !v && emit('close')"
  >
    <UiDialogPortal>
      <UiDialogOverlay />
      <UiDialogContent class="max-w-lg max-h-[80vh] overflow-y-auto">
        <UiDialogHeader>
          <UiDialogTitle>Συμμετοχή σε άρθρο</UiDialogTitle>
        </UiDialogHeader>

        <div v-if="loading" class="py-4 text-sm text-muted-foreground">
          Φόρτωση...
        </div>

        <Tabs v-else default-value="likes">
          <TabsList class="w-full">
            <TabsTrigger value="likes" class="flex-1">
              Επισημάνσεις ({{ likes.length }})
            </TabsTrigger>
            <TabsTrigger value="comments" class="flex-1">
              Σχόλια ({{ comments.length }})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="likes" class="mt-4 space-y-2">
            <p v-if="!likes.length" class="text-xs text-muted-foreground">—</p>
            <ul v-else class="space-y-2">
              <li
                v-for="like in likes"
                :key="like.id"
                class="flex items-start justify-between gap-3 rounded-md bg-accent/30 px-3 py-2 text-xs"
              >
                <div class="min-w-0 flex-1 space-y-0.5">
                  <p class="font-medium truncate">
                    {{ like.users?.name ?? like.user_id }}
                  </p>
                  <p class="text-muted-foreground">{{ like.users?.email }}</p>
                  <p class="text-muted-foreground">
                    {{ formatDate(like.created_at) }}
                  </p>
                </div>
                <UiButton
                  variant="ghost"
                  size="icon"
                  class="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                  aria-label="Αφαίρεση επισήμανσης"
                  @click="requestDeleteLike(like.id)"
                >
                  <VIcon name="bi-trash" class="w-3.5 h-3.5" />
                </UiButton>
              </li>
            </ul>
          </TabsContent>

          <TabsContent value="comments" class="mt-4 space-y-2">
            <p v-if="!comments.length" class="text-xs text-muted-foreground">
              Δεν υπάρχουν σχόλια ακόμα.
            </p>
            <ul v-else class="space-y-2">
              <li
                v-for="comment in comments"
                :key="comment.id"
                class="flex items-start justify-between gap-3 rounded-md bg-accent/30 px-3 py-2 text-xs"
              >
                <div class="min-w-0 flex-1 space-y-0.5">
                  <p class="font-medium truncate">
                    {{ comment.users?.name ?? comment.user_id }}
                  </p>
                  <p
                    class="text-foreground wrap-break-word whitespace-pre-wrap"
                  >
                    {{ comment.body }}
                  </p>
                  <p class="text-muted-foreground">
                    {{ formatDate(comment.created_at) }}
                  </p>
                </div>
                <UiButton
                  variant="ghost"
                  size="icon"
                  class="h-7 w-7 shrink-0 text-destructive hover:text-destructive"
                  aria-label="Διαγραφή σχολίου"
                  @click="requestDeleteComment(comment.id)"
                >
                  <VIcon name="bi-trash" class="w-3.5 h-3.5" />
                </UiButton>
              </li>
            </ul>
          </TabsContent>
        </Tabs>

        <UiDialogFooter class="mt-4">
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
              pendingDelete?.kind === "like"
                ? "Αφαίρεση επισήμανσης"
                : "Διαγραφή σχολίου"
            }}
          </UiAlertDialogTitle>
          <UiAlertDialogDescription>
            {{
              pendingDelete?.kind === "like"
                ? "Θα αφαιρεθεί η επισήμανση από το άρθρο."
                : "Θα αφαιρεθεί το σχόλιο από το άρθρο."
            }}
          </UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel>
            <UiButton variant="cancel">Ακύρωση</UiButton>
          </UiAlertDialogCancel>
          <UiAlertDialogAction as-child>
            <UiButton
              variant="destructive"
              :disabled="deleteLoading"
              @click="confirmDelete"
            >
              Διαγραφή
            </UiButton>
          </UiAlertDialogAction>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialogPortal>
  </UiAlertDialogRoot>
</template>
