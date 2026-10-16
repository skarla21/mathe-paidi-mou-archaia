<script setup lang="ts">
import { toast } from "vue-sonner";
import UiButton from "~/components/ui/Button.vue";
import UiTextarea from "~/components/ui/Textarea.vue";
import LessonCommentItem, {
  type LessonCommentRow,
} from "~/components/lesson/LessonCommentItem.vue";

const props = defineProps<{
  lessonId: string;
  comments: LessonCommentRow[];
  canAccess: boolean;
  hasMore?: boolean;
  loadingMore?: boolean;
}>();

const emit = defineEmits<{
  refresh: [];
  loadMore: [];
}>();

const route = useRoute();
const { session, isAdmin } = useCurrentUser();
const { open: openEditProfile } = useEditProfileModal();
const { openLogin } = useAuthModal();

const composerText = ref("");
const composerLoading = ref(false);
const replyToId = ref<string | null>(null);
const replyText = ref("");
const replyLoading = ref(false);

const threads = computed(() => {
  const masters = props.comments.filter((c) => !c.parent_id);
  const byParent = new Map<string, LessonCommentRow[]>();
  for (const c of props.comments) {
    if (!c.parent_id) continue;
    const list = byParent.get(c.parent_id) ?? [];
    list.push(c);
    byParent.set(c.parent_id, list);
  }
  return masters.map((master) => ({
    master,
    replies: byParent.get(master.id) ?? [],
  }));
});

function ensureCanInteract(): boolean {
  if (!session.value?.user?.id) {
    toast.error("Συνδεθείτε για να σχολιάσετε ή να αξιολογήσετε.");
    openLogin(route.fullPath);
    return false;
  }
  if (!session.value.user.email_verified) {
    toast.error(
      "Επαληθεύστε το email σας για να σχολιάσετε ή να αξιολογήσετε.",
    );
    openEditProfile();
    return false;
  }
  if (!props.canAccess) {
    toast.error("Χρειάζεστε πρόσβαση στο υλικό για να σχολιάσετε.");
    return false;
  }
  return true;
}

function handleWriteError(e: unknown) {
  const status = (e as { statusCode?: number })?.statusCode;
  if (status === 403) {
    if (!session.value.user?.email_verified) {
      toast.error(
        "Επαληθεύστε το email σας για να σχολιάσετε ή να αξιολογήσετε.",
      );
      openEditProfile();
    } else {
      toast.error("Χρειάζεστε πρόσβαση στο υλικό για να σχολιάσετε.");
    }
  } else if (status === 401) {
    toast.error("Συνδεθείτε για να σχολιάσετε ή να αξιολογήσετε.");
    openLogin(route.fullPath);
  } else {
    toast.error("Κάτι πήγε στραβά");
  }
}

async function submitComposer() {
  if (!ensureCanInteract()) return;
  const body = composerText.value.trim();
  if (body.length < 1 || body.length > 2000) {
    toast.error("Το σχόλιο πρέπει να είναι από 1 έως 2000 χαρακτήρες.");
    return;
  }
  composerLoading.value = true;
  try {
    await $fetch(`/api/lessons/${props.lessonId}/comments`, {
      method: "POST",
      credentials: "include",
      body: { body },
    });
    composerText.value = "";
    toast.success("Το σχόλιο δημοσιεύτηκε");
    emit("refresh");
  } catch (e: unknown) {
    handleWriteError(e);
  } finally {
    composerLoading.value = false;
  }
}

function toggleReply(commentId: string) {
  if (replyToId.value === commentId) {
    replyToId.value = null;
    replyText.value = "";
    return;
  }
  if (!ensureCanInteract()) return;
  replyToId.value = commentId;
  replyText.value = "";
}

async function submitReply(parentId: string) {
  if (!ensureCanInteract()) return;
  const body = replyText.value.trim();
  if (body.length < 1 || body.length > 2000) {
    toast.error("Το σχόλιο πρέπει να είναι από 1 έως 2000 χαρακτήρες.");
    return;
  }
  replyLoading.value = true;
  try {
    await $fetch(`/api/lessons/${props.lessonId}/comments`, {
      method: "POST",
      credentials: "include",
      body: { body, parent_id: parentId },
    });
    replyToId.value = null;
    replyText.value = "";
    toast.success("Η απάντηση δημοσιεύτηκε");
    emit("refresh");
  } catch (e: unknown) {
    handleWriteError(e);
  } finally {
    replyLoading.value = false;
  }
}

function onDeleted() {
  emit("refresh");
}
</script>

<template>
  <section id="lesson-comments" class="scroll-mt-24">
    <h2 class="mb-4 font-heading text-xl font-semibold">Σχόλια</h2>

    <div v-if="hasMore" class="mb-4 flex justify-center">
      <UiButton
        variant="outline"
        size="sm"
        :disabled="loadingMore"
        @click="emit('loadMore')"
      >
        {{ loadingMore ? "Φόρτωση…" : "Φόρτωση παλαιότερων" }}
      </UiButton>
    </div>

    <ul v-if="threads.length" class="space-y-3">
      <template v-for="thread in threads" :key="thread.master.id">
        <LessonCommentItem
          :comment="thread.master"
          :lesson-id="lessonId"
          :can-moderate="isAdmin"
          @toggle-reply="toggleReply(thread.master.id)"
          @updated="emit('refresh')"
          @deleted="onDeleted"
        />
        <LessonCommentItem
          v-for="reply in thread.replies"
          :key="reply.id"
          :comment="reply"
          :lesson-id="lessonId"
          is-reply
          :can-moderate="isAdmin"
          @toggle-reply="toggleReply(thread.master.id)"
          @updated="emit('refresh')"
          @deleted="onDeleted"
        />
        <li
          v-if="replyToId === thread.master.id"
          class="ml-8 rounded-3xl border border-border bg-secondary/40 p-4 sm:ml-12"
        >
          <UiTextarea
            v-model="replyText"
            placeholder="Γράψτε μια απάντηση…"
            class="min-h-24 rounded-2xl border-none bg-card font-reading text-base"
          />
          <div class="mt-3 flex flex-wrap gap-2">
            <UiButton
              size="sm"
              :disabled="replyLoading"
              @click="submitReply(thread.master.id)"
            >
              Απάντηση
            </UiButton>
            <UiButton
              size="sm"
              variant="outline"
              :disabled="replyLoading"
              @click="toggleReply(thread.master.id)"
            >
              Ακύρωση
            </UiButton>
          </div>
        </li>
      </template>
    </ul>
    <p
      v-else
      class="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground"
    >
      Δεν υπάρχουν σχόλια ακόμα.
    </p>

    <div class="mt-6 rounded-3xl border border-border bg-card p-5 shadow-sm">
      <UiTextarea
        v-model="composerText"
        placeholder="Γράψτε ένα σχόλιο…"
        class="min-h-28 rounded-2xl border-none bg-secondary font-reading text-base focus:bg-card"
      />
      <div class="mt-4">
        <UiButton size="sm" :disabled="composerLoading" @click="submitComposer">
          Σχόλιο
        </UiButton>
      </div>
    </div>
  </section>
</template>
