<script setup lang="ts">
import { toast } from "vue-sonner";
import UiButton from "~/components/ui/Button.vue";
import UiSkeleton from "~/components/ui/Skeleton.vue";
import TooltipProvider from "~/components/ui/tooltip/TooltipProvider.vue";
import Tooltip from "~/components/ui/tooltip/Tooltip.vue";
import TooltipTrigger from "~/components/ui/tooltip/TooltipTrigger.vue";
import TooltipContent from "~/components/ui/tooltip/TooltipContent.vue";
import ContentReadingTime from "~/components/content/ReadingTime.vue";
import ArticleComments from "~/components/article/ArticleComments.vue";
import type { ArticleCommentRow } from "~/components/article/ArticleCommentItem.vue";

definePageMeta({ layout: "default" });
const route = useRoute();
const { session } = useCurrentUser();
const { open: openEditProfile } = useEditProfileModal();
const { openLogin } = useAuthModal();

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
};

const article = ref<ArticlePayload | null>(null);
const articlePending = ref(true);
const comments = ref<ArticleCommentRow[]>([]);
const likeLoading = ref(false);
const likeLabel = computed(() =>
  article.value?.likedByMe ? "Αναίρεση επισήμανσης" : "Επισήμανση",
);
const shareOpen = ref(false);

const id = computed(() => route.params.id as string);

useHead(() => ({
  title: article.value?.title ? `${article.value.title} — Άρθρα` : "Άρθρα",
}));

function ensureLoggedIn(): boolean {
  if (!session.value?.user?.id) {
    toast.error("Συνδεθείτε για να σχολιάσετε ή να κάνετε επισήμανση.");
    openLogin(route.fullPath);
    return false;
  }
  return true;
}

function ensureCanInteract(): boolean {
  if (!ensureLoggedIn()) return false;
  if (!session.value.user?.email_verified) {
    toast.error(
      "Επαληθεύστε το email σας για να σχολιάσετε ή να κάνετε επισήμανση.",
    );
    openEditProfile();
    return false;
  }
  return true;
}

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
    comments.value = await $fetch<ArticleCommentRow[]>(
      `/api/articles/${id.value}/comments`,
      {
        credentials: "include",
      },
    );
  } catch {
    comments.value = [];
    toast.error("Αποτυχία φόρτωσης σχολίων");
  }
}

async function syncCommentCount() {
  try {
    const payload = await $fetch<ArticlePayload>(`/api/articles/${id.value}`, {
      credentials: "include",
    });
    if (article.value) {
      article.value.commentCount = payload.commentCount;
    }
  } catch {
    /* count stays until next full load */
  }
}

async function onCommentsRefresh() {
  await loadComments();
  await syncCommentCount();
}

onMounted(async () => {
  await loadArticle();
  await loadComments();
});

watch(id, async () => {
  await loadArticle();
  await loadComments();
});

async function toggleLike() {
  const a = article.value;
  if (!a) return;
  if (a.likedByMe) {
    if (!ensureLoggedIn()) return;
  } else if (!ensureCanInteract()) {
    return;
  }
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
    likeLoading.value = false;
  }
}

function scrollToComments() {
  document
    .getElementById("article-comments")
    ?.scrollIntoView({ behavior: "smooth", block: "start" });
}
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-12">
    <CatalogBackLink class="mb-6" to="/articles" name="Όλα τα άρθρα" />

    <template v-if="articlePending">
      <UiSkeleton class="mb-3 h-9 w-full rounded-xl" />
      <div class="flex justify-end">
        <UiSkeleton class="h-4 w-40 rounded-lg" />
      </div>
      <div class="mt-4 flex gap-2">
        <UiSkeleton class="h-5 w-16 rounded-md" />
        <UiSkeleton class="h-5 w-20 rounded-md" />
      </div>
    </template>

    <template v-else-if="!article">
      <p class="text-muted-foreground">Κάτι πήγε στραβά</p>
    </template>

    <template v-else>
      <header class="mb-8 space-y-2">
        <h1 class="text-3xl font-heading font-bold">
          {{ article.title }}
        </h1>
        <ContentReadingTime
          class="text-end"
          :minutes="article.reading_time_minutes"
        />
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
        show-full
        :image-url="article.image_url"
        :alt="article.title"
      />

      <div
        class="font-reading prose prose-neutral mb-10 max-w-none whitespace-pre-wrap dark:prose-invert"
      >
        {{ article.body }}
      </div>

      <div class="mb-10 flex flex-wrap items-center gap-3">
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
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <UiButton
                variant="outline"
                size="sm"
                aria-label="Σχόλια"
                @click="scrollToComments"
              >
                <VIcon name="bi-chat-text" class="size-4" aria-hidden="true" />
                <span>{{ article.commentCount }}</span>
              </UiButton>
            </TooltipTrigger>
            <TooltipContent> Σχόλια </TooltipContent>
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
            <TooltipContent> Κοινοποίηση </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <ArticleShareDialog v-model:open="shareOpen" :title="article.title" />

      <ArticleComments
        :article-id="article.id"
        :comments="comments"
        @refresh="onCommentsRefresh"
      />
    </template>
  </div>
</template>
