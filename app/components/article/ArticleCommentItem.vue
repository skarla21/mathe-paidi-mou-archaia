<script setup lang="ts">
import { toast } from "vue-sonner";
import UiButton from "~/components/ui/Button.vue";
import UiTextarea from "~/components/ui/Textarea.vue";
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

export type ArticleCommentRow = {
  id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  created_at: string;
  updated_at: string;
  users?: { id: string; name: string | null; avatar_url: string | null } | null;
};

const props = defineProps<{
  comment: ArticleCommentRow;
  articleId: string;
  isReply?: boolean;
  canModerate: boolean;
}>();

const emit = defineEmits<{
  deleted: [];
  updated: [];
  "toggle-reply": [];
}>();

const { session, isAdmin } = useCurrentUser();

const editing = ref(false);
const editText = ref("");
const editLoading = ref(false);
const deleteOpen = ref(false);
const deleteLoading = ref(false);

const canManage = computed(
  () =>
    props.canModerate ||
    (!!session.value.user?.id && session.value.user.id === props.comment.user_id),
);

const now = useRelativeNow();
const relativeLabel = computed(() =>
  formatRelativeTime(props.comment.created_at, now.value),
);
const exactLabel = computed(() => formatExactTime(props.comment.created_at));
const timeLabel = computed(() =>
  exactLabel.value
    ? `${relativeLabel.value}, ${exactLabel.value}`
    : relativeLabel.value,
);

function startEdit() {
  editText.value = props.comment.body;
  editing.value = true;
}

function cancelEdit() {
  editing.value = false;
  editText.value = "";
}

async function saveEdit() {
  const body = editText.value.trim();
  if (body.length < 1 || body.length > 2000) {
    toast.error("Το σχόλιο πρέπει να είναι από 1 έως 2000 χαρακτήρες.");
    return;
  }
  if (!isAdmin.value && !session.value.user?.email_verified) {
    toast.error(
      "Επαληθεύστε το email σας για να σχολιάσετε ή να κάνετε επισήμανση.",
    );
    return;
  }
  editLoading.value = true;
  try {
    await $fetch(`/api/articles/${props.articleId}/comments/${props.comment.id}`, {
      method: "PATCH",
      credentials: "include",
      body: { body },
    });
    editing.value = false;
    toast.success("Το σχόλιο ενημερώθηκε");
    emit("updated");
  } catch (e: unknown) {
    const status = (e as { statusCode?: number })?.statusCode;
    if (status === 403) {
      toast.error(
        "Επαληθεύστε το email σας για να σχολιάσετε ή να κάνετε επισήμανση.",
      );
    } else {
      toast.error("Κάτι πήγε στραβά");
    }
  } finally {
    editLoading.value = false;
  }
}

async function confirmDelete() {
  deleteLoading.value = true;
  try {
    await $fetch(`/api/articles/${props.articleId}/comments/${props.comment.id}`, {
      method: "DELETE",
      credentials: "include",
    });
    deleteOpen.value = false;
    toast.success("Το σχόλιο διαγράφηκε");
    emit("deleted");
  } catch {
    toast.error("Κάτι πήγε στραβά");
  } finally {
    deleteLoading.value = false;
  }
}
</script>

<template>
  <li
    class="rounded-3xl border border-border bg-card p-5 shadow-sm"
    :class="isReply ? 'ml-8 sm:ml-12' : ''"
  >
    <div class="flex gap-3">
      <span
        class="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary"
      >
        <img
          v-if="comment.users?.avatar_url"
          :src="comment.users.avatar_url"
          alt=""
          class="size-full object-cover"
        />
        <VIcon
          v-else
          name="bi-person-circle"
          class="size-5 text-muted-foreground"
          aria-hidden="true"
        />
      </span>
      <div class="min-w-0 flex-1">
        <p class="flex min-w-0 flex-wrap items-baseline gap-x-1.5 font-heading text-sm">
          <span class="font-semibold text-foreground">
            {{ comment.users?.name ?? "Χρήστης" }}
          </span>
          <span
            v-if="relativeLabel"
            class="inline-flex items-baseline gap-x-1.5 whitespace-nowrap"
          >
            <span class="text-muted-foreground/70" aria-hidden="true">·</span>
            <time
              :datetime="comment.created_at"
              :title="exactLabel"
              :aria-label="timeLabel"
              class="text-xs font-normal text-muted-foreground"
            >
              {{ relativeLabel }}
            </time>
          </span>
        </p>

        <template v-if="editing">
          <UiTextarea
            v-model="editText"
            class="mt-2 min-h-24 rounded-2xl border-none bg-secondary font-reading text-base focus:bg-card"
          />
          <div class="mt-3 flex flex-wrap gap-2">
            <UiButton size="sm" :disabled="editLoading" @click="saveEdit">
              Αποθήκευση
            </UiButton>
            <UiButton
              size="sm"
              variant="outline"
              :disabled="editLoading"
              @click="cancelEdit"
            >
              Ακύρωση
            </UiButton>
          </div>
        </template>
        <template v-else>
          <p
            class="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground"
          >
            {{ comment.body }}
          </p>
          <div class="mt-3 flex flex-wrap items-center gap-1">
            <UiButton
              variant="ghost"
              size="sm"
              class="h-8 gap-1.5 px-2 text-muted-foreground"
              aria-label="Απάντηση"
              @click="emit('toggle-reply')"
            >
              <VIcon name="bi-chat-dots" class="size-4" aria-hidden="true" />
              Απάντηση
            </UiButton>
            <template v-if="canManage">
              <UiButton
                variant="ghost"
                size="sm"
                class="h-8 gap-1.5 px-2 text-muted-foreground"
                aria-label="Επεξεργασία"
                @click="startEdit"
              >
                <VIcon name="bi-pencil" class="size-3.5" aria-hidden="true" />
                Επεξεργασία
              </UiButton>
              <UiButton
                variant="ghost"
                size="sm"
                class="h-8 gap-1.5 px-2 text-destructive hover:text-destructive"
                aria-label="Διαγραφή"
                @click="deleteOpen = true"
              >
                <VIcon name="bi-trash" class="size-3.5" aria-hidden="true" />
                Διαγραφή
              </UiButton>
            </template>
          </div>
        </template>
      </div>
    </div>
  </li>

  <UiAlertDialogRoot v-model:open="deleteOpen">
    <UiAlertDialogPortal>
      <UiAlertDialogOverlay />
      <UiAlertDialogContent>
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>Διαγραφή σχολίου</UiAlertDialogTitle>
          <UiAlertDialogDescription>
            {{
              isReply
                ? "Θα διαγραφεί η απάντηση. Η ενέργεια δεν αναιρείται."
                : "Θα διαγραφεί το σχόλιο και όλες οι απαντήσεις του. Η ενέργεια δεν αναιρείται."
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
