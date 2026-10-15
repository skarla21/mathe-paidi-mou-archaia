<script setup lang="ts">
import { toast } from "vue-sonner";
import UiButton from "~/components/ui/Button.vue";
import UiTextarea from "~/components/ui/Textarea.vue";
import UiLabel from "~/components/ui/Label.vue";
import ArticleCommentItem, {
  type ArticleCommentRow,
} from "~/components/article/ArticleCommentItem.vue";

const props = defineProps<{
  articleId: string;
  comments: ArticleCommentRow[];
}>();

const emit = defineEmits<{
  refresh: [];
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
  const byParent = new Map<string, ArticleCommentRow[]>();
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
    toast.error("Συνδεθείτε για να σχολιάσετε ή να κάνετε επισήμανση.");
    openLogin(route.fullPath);
    return false;
  }
  if (!session.value.user.email_verified) {
    toast.error(
      "Επαληθεύστε το email σας για να σχολιάσετε ή να κάνετε επισήμανση.",
    );
    openEditProfile();
    return false;
  }
  return true;
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
    await $fetch(`/api/articles/${props.articleId}/comments`, {
      method: "POST",
      credentials: "include",
      body: { body },
    });
    composerText.value = "";
    toast.success("Το σχόλιο δημοσιεύτηκε");
    emit("refresh");
  } catch (e: unknown) {
    const status = (e as { statusCode?: number })?.statusCode;
    if (status === 403) {
      toast.error(
        "Επαληθεύστε το email σας για να σχολιάσετε ή να κάνετε επισήμανση.",
      );
      openEditProfile();
    } else if (status === 401) {
      toast.error("Συνδεθείτε για να σχολιάσετε ή να κάνετε επισήμανση.");
      openLogin(route.fullPath);
    } else {
      toast.error("Κάτι πήγε στραβά");
    }
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
    await $fetch(`/api/articles/${props.articleId}/comments`, {
      method: "POST",
      credentials: "include",
      body: { body, parent_id: parentId },
    });
    replyToId.value = null;
    replyText.value = "";
    toast.success("Η απάντηση δημοσιεύτηκε");
    emit("refresh");
  } catch (e: unknown) {
    const status = (e as { statusCode?: number })?.statusCode;
    if (status === 403) {
      toast.error(
        "Επαληθεύστε το email σας για να σχολιάσετε ή να κάνετε επισήμανση.",
      );
      openEditProfile();
    } else if (status === 401) {
      toast.error("Συνδεθείτε για να σχολιάσετε ή να κάνετε επισήμανση.");
      openLogin(route.fullPath);
    } else {
      toast.error("Κάτι πήγε στραβά");
    }
  } finally {
    replyLoading.value = false;
  }
}

function onDeleted() {
  emit("refresh");
}
</script>

<template>
  <section id="article-comments" class="scroll-mt-24">
    <h2 class="mb-4 font-heading text-xl font-semibold">Σχόλια</h2>

    <ul v-if="threads.length" class="space-y-3">
      <template v-for="thread in threads" :key="thread.master.id">
        <ArticleCommentItem
          :comment="thread.master"
          :article-id="articleId"
          :can-moderate="isAdmin"
          :reply-open="replyToId === thread.master.id"
          :reply-text="replyText"
          :reply-loading="replyLoading"
          @toggle-reply="toggleReply(thread.master.id)"
          @update:reply-text="replyText = $event"
          @submit-reply="submitReply(thread.master.id)"
          @updated="emit('refresh')"
          @deleted="onDeleted"
        />
        <ArticleCommentItem
          v-for="reply in thread.replies"
          :key="reply.id"
          :comment="reply"
          :article-id="articleId"
          is-reply
          :can-moderate="isAdmin"
          @updated="emit('refresh')"
          @deleted="onDeleted"
        />
      </template>
    </ul>
    <p
      v-else
      class="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground"
    >
      Δεν υπάρχουν σχόλια ακόμα.
    </p>

    <div class="mt-6 rounded-3xl border border-border bg-card p-5 shadow-sm">
      <UiLabel>Το σχόλιό σας</UiLabel>
      <UiTextarea
        v-model="composerText"
        placeholder="Γράψτε ένα σχόλιο…"
        class="mt-3 min-h-28 rounded-2xl border-none bg-secondary font-reading text-base focus:bg-card"
      />
      <div class="mt-4">
        <UiButton size="sm" :disabled="composerLoading" @click="submitComposer">
          Σχόλιο
        </UiButton>
      </div>
    </div>
  </section>
</template>
