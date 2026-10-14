<script setup lang="ts">
import { toast } from "vue-sonner";
import UiButton from "~/components/ui/Button.vue";
import UiCard from "~/components/ui/Card.vue";
import UiCardContent from "~/components/ui/CardContent.vue";
import UiTextarea from "~/components/ui/Textarea.vue";
import UiLabel from "~/components/ui/Label.vue";
import UiSkeleton from "~/components/ui/Skeleton.vue";
import { NuxtLink } from "#components";

definePageMeta({ layout: "default" });
const route = useRoute();
const { session } = useCurrentUser();

type ArticlePayload = {
  id: string;
  title: string;
  body: string;
  tags: string[];
  reading_time_minutes: number;
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
const commentLoading = ref(false);

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
    toast.success("Το σχόλιο αποθηκεύτηκε");
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
    await loadArticle();
    await loadComments();
  } catch {
    toast.error("Κάτι πήγε στραβά");
  } finally {
    commentLoading.value = false;
  }
}

async function copyLink() {
  const url = typeof window !== "undefined" ? window.location.href : "";
  try {
    await navigator.clipboard.writeText(url);
    toast.success("Ο σύνδεσμος αντιγράφηκε στο πρόχειρο.");
  } catch {
    toast.error("Κάτι πήγε στραβά");
  }
}
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-12">
    <NuxtLink
      to="/articles"
      class="text-sm text-muted-foreground hover:text-foreground mb-6 inline-block"
    >
      Όλα τα άρθρα
    </NuxtLink>

    <template v-if="articlePending">
      <UiSkeleton class="mb-3 h-9 w-3/4 rounded-xl" />
      <UiSkeleton class="h-4 w-40 rounded-lg" />
      <div class="mt-4 flex gap-2">
        <UiSkeleton class="h-5 w-16 rounded-md" />
        <UiSkeleton class="h-5 w-20 rounded-md" />
      </div>
      <UiSkeleton class="mt-8 h-64 w-full rounded-3xl" />
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

      <div
        class="font-reading prose prose-neutral mb-10 max-w-none whitespace-pre-wrap dark:prose-invert"
      >
        {{ article.body }}
      </div>

      <div class="flex flex-wrap items-center gap-3 mb-10">
        <template v-if="session?.user?.id">
          <UiButton
            variant="outline"
            size="sm"
            :disabled="likeLoading"
            @click="toggleLike"
          >
            <VIcon
              :name="article.likedByMe ? 'bi-heart-fill' : 'bi-heart'"
              class="mr-2 size-4"
            />
            {{ article.likedByMe ? "Αναίρεση επισήμανσης" : "Επισήμανση" }}
            <span class="ml-1 text-muted-foreground"
              >({{ article.likeCount }})</span
            >
          </UiButton>
        </template>
        <UiButton variant="outline" size="sm" @click="copyLink">
          <VIcon name="bi-link-45deg" class="mr-2 size-4" />
          Αντιγραφή συνδέσμου
        </UiButton>
      </div>

      <UiCard v-if="session?.user?.id" class="mb-10">
        <UiCardContent class="p-6 space-y-3">
          <UiLabel>Το σχόλιό σας</UiLabel>
          <UiTextarea
            v-model="commentText"
            placeholder="Γράψτε ένα σχόλιο…"
            class="min-h-25 font-mono text-sm"
          />
          <div class="flex gap-2">
            <UiButton size="sm" :disabled="commentLoading" @click="saveComment"
              >Αποθήκευση</UiButton
            >
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
        </UiCardContent>
      </UiCard>
      <p v-else class="text-sm text-muted-foreground mb-10">
        Συνδεθείτε για να σχολιάσετε ή να κάνετε επισήμανση.
      </p>

      <section>
        <h2 class="text-lg font-heading font-semibold mb-4">Σχόλια</h2>
        <ul class="space-y-4">
          <li
            v-for="c in comments"
            :key="c.id"
            class="rounded-lg border border-border p-4 text-sm"
          >
            <p class="font-medium">{{ c.users?.name ?? "Χρήστης" }}</p>
            <p class="mt-1 whitespace-pre-wrap">{{ c.body }}</p>
            <p class="text-xs text-muted-foreground mt-2">
              {{ new Date(c.created_at).toLocaleString() }}
            </p>
          </li>
        </ul>
        <p v-if="!comments.length" class="text-sm text-muted-foreground">
          Δεν υπάρχουν σχόλια ακόμα.
        </p>
      </section>
    </template>
  </div>
</template>
