<script setup lang="ts">
import { toast } from "vue-sonner";
import UiButton from "~/components/ui/Button.vue";
import UiTextarea from "~/components/ui/Textarea.vue";
import UiLabel from "~/components/ui/Label.vue";
import UiSkeleton from "~/components/ui/Skeleton.vue";
import TooltipProvider from "~/components/ui/tooltip/TooltipProvider.vue";
import Tooltip from "~/components/ui/tooltip/Tooltip.vue";
import TooltipTrigger from "~/components/ui/tooltip/TooltipTrigger.vue";
import TooltipContent from "~/components/ui/tooltip/TooltipContent.vue";

definePageMeta({ layout: "default" });
const route = useRoute();
const { session } = useCurrentUser();

type ArticlePayload = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  reading_time_minutes: number;
  image_url?: string | null;
  created_at: string;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  myComment: { id: string; body: string; updated_at: string } | null;
};

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  users?: { id: string; name: string | null; avatar_url: string | null } | null;
};

const article = ref<ArticlePayload | null>(null);
const articlePending = ref(true);
const comments = ref<CommentRow[]>([]);
const commentText = ref("");
const likeLoading = ref(false);
const likeLabel = computed(() =>
  article.value?.likedByMe ? "Αναίρεση επισήμανσης" : "Επισήμανση",
);
const commentLoading = ref(false);
const composerOpen = ref(false);
const shareOpen = ref(false);
const composerRef = ref<HTMLElement | null>(null);
const commentLabel = computed(() =>
  article.value?.myComment ? "Επεξεργασία σχολίου" : "Σχόλιο",
);

const id = computed(() => route.params.id as string);

useHead(() => ({
  title: article.value?.title ? `${article.value.title} — Άρθρα` : "Άρθρα",
}));

async function loadArticle() {
  articlePending.value = true;
  try {
    article.value = await $fetch<ArticlePayload>(`/api/articles/${id.value}`, {
      credentials: "include",
    });
  } catch {
    article.value = null;
    toast.error("Κάτι πήγε στραβά");
  } finally {
    articlePending.value = false;
  }
}

async function loadComments() {
  try {
    comments.value = await $fetch<CommentRow[]>(
      `/api/articles/${id.value}/comments`,
      {
        credentials: "include",
      },
    );
  } catch {
    comments.value = [];
  }
}

onMounted(async () => {
  await loadArticle();
  await loadComments();
});

watch(id, async () => {
  commentText.value = "";
  composerOpen.value = false;
  await loadArticle();
  await loadComments();
});

watch(
  () => article.value?.myComment,
  (mc) => {
    if (mc?.body) commentText.value = mc.body;
  },
  { immediate: true },
);

async function toggleLike() {
  if (!session.value?.user?.id) {
    toast.error("Συνδεθείτε για να σχολιάσετε ή να κάνετε επισήμανση.");
    return;
  }
  const a = article.value;
  if (!a) return;
  likeLoading.value = true;
  try {
    if (a.likedByMe) {
      await $fetch(`/api/articles/${id.value}/like`, {
        method: "DELETE",
        credentials: "include",
      });
      a.likedByMe = false;
      a.likeCount = Math.max(0, a.likeCount - 1);
    } else {
      await $fetch(`/api/articles/${id.value}/like`, {
        method: "POST",
        credentials: "include",
      });
      a.likedByMe = true;
      a.likeCount += 1;
    }
  } catch {
    toast.error("Κάτι πήγε στραβά");
  } finally {
    likeLoading.value = false;
  }
}

function toggleComposer() {
  if (!session.value?.user?.id) {
    toast.error("Συνδεθείτε για να σχολιάσετε ή να κάνετε επισήμανση.");
    return;
  }
  composerOpen.value = !composerOpen.value;
  if (composerOpen.value) {
    nextTick(() => {
      composerRef.value?.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
    });
  }
}

async function saveComment() {
  if (!session.value?.user?.id) {
    toast.error("Συνδεθείτε για να σχολιάσετε ή να κάνετε επισήμανση.");
    return;
  }
  const body = commentText.value.trim();
  if (body.length < 1 || body.length > 2000) {
    toast.error("Κάτι πήγε στραβά");
    return;
  }
  commentLoading.value = true;
  try {
    await $fetch(`/api/articles/${id.value}/comment`, {
      method: "PUT",
      credentials: "include",
      body: { body },
    });
    await loadArticle();
    await loadComments();
    composerOpen.value = false;
    toast.success("Το σχόλιο δημοσιεύτηκε");
  } catch {
    toast.error("Κάτι πήγε στραβά");
  } finally {
    commentLoading.value = false;
  }
}

async function removeComment() {
  if (!session.value?.user?.id) return;
  commentLoading.value = true;
  try {
    await $fetch(`/api/articles/${id.value}/comment`, {
      method: "DELETE",
      credentials: "include",
    });
    commentText.value = "";
    composerOpen.value = false;
    await loadArticle();
    await loadComments();
  } catch {
    toast.error("Κάτι πήγε στραβά");
  } finally {
    commentLoading.value = false;
  }
}

</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-12">
    <CatalogBackLink class="mb-6" to="/articles" name="Όλα τα άρθρα" />

    <template v-if="articlePending">
      <UiSkeleton class="mb-3 h-9 w-3/4 rounded-xl" />
      <UiSkeleton class="h-4 w-40 rounded-lg" />
      <div class="mt-4 flex gap-2">
        <UiSkeleton class="h-5 w-16 rounded-md" />
        <UiSkeleton class="h-5 w-20 rounded-md" />
      </div>
    </template>

    <template v-else-if="!article">
      <p class="text-muted-foreground">Κάτι πήγε στραβά</p>
    </template>

    <template v-else>
      <header class="mb-8">
        <h1 class="text-3xl font-heading font-bold">{{ article.title }}</h1>
        <p class="text-sm text-muted-foreground mt-2">
          {{ `${article.reading_time_minutes} λεπτά ανάγνωσης` }}
        </p>
        <div v-if="article.tags?.length" class="flex flex-wrap gap-2 mt-4">
          <span
            v-for="tag in article.tags"
            :key="tag"
            class="text-xs rounded-md bg-muted px-2 py-0.5 text-muted-foreground"
          >
            {{ tag }}
          </span>
        </div>
      </header>

      <CatalogCover
        class="mb-8"
        :image-url="article.image_url"
        :alt="article.title"
      />

      <div
        class="font-reading prose prose-neutral mb-10 max-w-none whitespace-pre-wrap dark:prose-invert"
      >
        {{ article.body }}
      </div>

      <div class="flex flex-wrap items-center gap-3 mb-10">
        <template v-if="session?.user?.id">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger as-child>
                <UiButton
                  variant="outline"
                  size="sm"
                  :disabled="likeLoading"
                  :aria-label="likeLabel"
                  @click="toggleLike"
                >
                  <VIcon
                    :name="article.likedByMe ? 'bi-heart-fill' : 'bi-heart'"
                    class="size-4"
                    aria-hidden="true"
                  />
                  <span>{{ article.likeCount }}</span>
                </UiButton>
              </TooltipTrigger>
              <TooltipContent>
                {{ likeLabel }}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </template>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <UiButton
                variant="outline"
                size="sm"
                :aria-expanded="composerOpen"
                :aria-label="commentLabel"
                @click="toggleComposer"
              >
                <VIcon name="bi-chat-text" class="size-4" aria-hidden="true" />
                <span>{{ article.commentCount }}</span>
              </UiButton>
            </TooltipTrigger>
            <TooltipContent>
              {{ commentLabel }}
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <UiButton
                variant="outline"
                size="sm"
                aria-label="Κοινοποίηση"
                @click="shareOpen = true"
              >
                <VIcon name="bi-share" class="size-4" aria-hidden="true" />
              </UiButton>
            </TooltipTrigger>
            <TooltipContent>
              Κοινοποίηση
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <ArticleShareDialog v-model:open="shareOpen" :title="article.title" />

      <section>
        <div
          v-if="composerOpen"
          ref="composerRef"
          class="mb-6 rounded-3xl border border-border bg-card p-5 shadow-sm"
        >
          <UiLabel>Το σχόλιό σας</UiLabel>
          <UiTextarea
            v-model="commentText"
            placeholder="Γράψτε ένα σχόλιο…"
            class="mt-3 min-h-28 rounded-2xl border-none bg-secondary font-reading text-base focus:bg-card"
          />
          <div class="mt-4 flex flex-wrap gap-2">
            <UiButton size="sm" :disabled="commentLoading" @click="saveComment">
              Σχόλιο
            </UiButton>
            <UiButton
              v-if="article.myComment"
              size="sm"
              variant="outline"
              :disabled="commentLoading"
              @click="removeComment"
            >
              Αφαίρεση σχολίου
            </UiButton>
          </div>
        </div>

        <h2 class="mb-4 font-heading text-xl font-semibold">Σχόλια</h2>
        <ul v-if="comments.length" class="space-y-3">
          <li
            v-for="c in comments"
            :key="c.id"
            class="flex gap-3 rounded-3xl border border-border bg-card p-5 shadow-sm"
          >
            <span
              class="flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-secondary"
            >
              <img
                v-if="c.users?.avatar_url"
                :src="c.users.avatar_url"
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
            <div class="min-w-0">
              <p class="font-heading text-sm font-semibold text-foreground">
                {{ c.users?.name ?? "Χρήστης" }}
              </p>
              <p
                class="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground"
              >
                {{ c.body }}
              </p>
              <p class="mt-2 text-xs text-muted-foreground">
                {{ new Date(c.created_at).toLocaleString("el-GR") }}
              </p>
            </div>
          </li>
        </ul>
        <p
          v-else
          class="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground"
        >
          Δεν υπάρχουν σχόλια ακόμα.
        </p>
      </section>
    </template>
  </div>
</template>
