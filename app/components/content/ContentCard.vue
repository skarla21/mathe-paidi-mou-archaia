<script setup lang="ts">
import { toast } from "vue-sonner";
import UiButton from "~/components/ui/Button.vue";
import ContentReadingTime from "~/components/content/ReadingTime.vue";
import {
  lessonFileSizeLabel,
  lessonPageCountLabel,
} from "#shared/utils/lessonPreviewUrl.mjs";

const props = withDefaults(
  defineProps<{
    to: string;
    title: string;
    description?: string | null;
    chips?: string[];
    /** When true, chips open chipSearchPath?q=… in a new tab (content tags). */
    chipSearch?: boolean;
    /** Base path for clickable chips (e.g. /search or /articles). */
    chipSearchPath?: string;
    previewUrl?: string | null;
    /** portrait = PDF page teaser; landscape = article cover */
    thumbLayout?: "portrait" | "landscape";
    previewMode?: "cover" | "contain";
    placeholderIcon?: string;
    readingMinutes?: number | null;
    pageCount?: number | null;
    fileBytes?: number | null;
    lessonId?: string | null;
    bookmarked?: boolean;
    isFree?: boolean | null;
    avgRating?: number | null;
    ratingCount?: number | null;
    likeCount?: number | null;
  }>(),
  {
    description: null,
    chips: () => [],
    chipSearch: false,
    chipSearchPath: "/search",
    previewUrl: null,
    thumbLayout: "portrait",
    previewMode: "cover",
    placeholderIcon: "bi-file-earmark-text",
    readingMinutes: null,
    pageCount: null,
    fileBytes: null,
    lessonId: null,
    bookmarked: false,
    isFree: null,
    avgRating: null,
    ratingCount: null,
    likeCount: null,
  },
);

const emit = defineEmits<{
  "update:bookmarked": [value: boolean];
}>();

const { session } = useCurrentUser();
const { openLogin } = useAuthModal();
const storedImageSrc = useStoredImageSrc();
const bookmarkBusy = ref(false);
const saved = ref(props.bookmarked);

watch(
  () => props.bookmarked,
  (value) => {
    saved.value = value;
  },
);

const imageSrc = computed(() => {
  if (!props.previewUrl) return "";
  // Lesson teasers are already small PNGs/JPEGs in lesson-previews/ — use as stored.
  // (Supabase render/image is not enabled here and breaks <img>.)
  if (props.thumbLayout === "portrait" || props.previewMode === "contain") {
    return props.previewUrl;
  }
  return storedImageSrc(props.previewUrl);
});

const pageCountLabel = computed(() => {
  if (props.pageCount == null || props.pageCount <= 0) return "";
  return lessonPageCountLabel(props.pageCount);
});

const fileSizeLabel = computed(() => {
  if (props.fileBytes == null || props.fileBytes <= 0) return "";
  return lessonFileSizeLabel(props.fileBytes);
});

const showBookmark = computed(() => Boolean(props.lessonId));
const showPaid = computed(() => props.isFree === false);
const bookmarkLabel = computed(() =>
  saved.value ? "Αφαίρεση από το υλικό μου" : "Αποθήκευση στο υλικό μου",
);

const showAvgRating = computed(
  () =>
    props.ratingCount != null &&
    props.ratingCount > 0 &&
    props.avgRating != null,
);
const avgRatingLabel = computed(() =>
  showAvgRating.value ? Number(props.avgRating).toFixed(1) : "",
);
const showLikeCount = computed(
  () => props.likeCount != null && props.likeCount > 0,
);

async function toggleBookmark() {
  if (!props.lessonId || bookmarkBusy.value) return;
  if (!session.value.user?.id) {
    openLogin();
    return;
  }
  bookmarkBusy.value = true;
  const previous = saved.value;
  saved.value = !previous;
  try {
    const result = await $fetch<{ saved: boolean }>(
      `/api/lessons/${props.lessonId}/bookmark`,
      {
        method: "POST",
        credentials: "include",
      },
    );
    saved.value = result.saved;
    emit("update:bookmarked", result.saved);
    toast.success(
      result.saved
        ? "Αποθηκεύτηκε στο υλικό μου"
        : "Αφαιρέθηκε από το υλικό μου",
    );
  } catch {
    saved.value = previous;
    toast.error("Κάτι πήγε στραβά");
  } finally {
    bookmarkBusy.value = false;
  }
}
</script>

<template>
  <article
    class="flex w-full flex-col gap-4 rounded-3xl border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-stretch sm:gap-5 sm:p-5"
  >
    <div
      class="relative flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-muted"
      :class="
        thumbLayout === 'landscape'
          ? 'aspect-4/3 w-full max-w-56 sm:w-44 sm:max-w-none'
          : 'aspect-210/297 w-22 sm:w-28'
      "
      aria-hidden="true"
    >
      <img
        v-if="imageSrc"
        :src="imageSrc"
        alt=""
        class="size-full"
        :class="
          previewMode === 'contain' ? 'object-contain p-1' : 'object-cover'
        "
        loading="lazy"
      />
      <VIcon
        v-else
        :name="placeholderIcon"
        class="size-8 text-muted-foreground/70"
      />
      <span
        v-if="fileSizeLabel"
        class="pointer-events-none absolute right-1 bottom-1 rounded-md bg-card/95 px-1.5 py-0.5 text-[10px] font-semibold text-foreground shadow-sm tabular-nums"
      >
        {{ fileSizeLabel }}
      </span>
    </div>

    <div class="min-w-0 flex-1">
      <div v-if="chips.length" class="mb-2 flex flex-wrap gap-2">
        <template v-if="chipSearch">
          <a
            v-for="chip in chips"
            :key="chip"
            :href="`${chipSearchPath}?q=${encodeURIComponent(chip)}`"
            target="_blank"
            rel="noopener noreferrer"
            class="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground transition-colors hover:bg-muted/80 hover:text-foreground"
            @click.stop
          >
            {{ chip }}
          </a>
        </template>
        <template v-else>
          <span
            v-for="chip in chips"
            :key="chip"
            class="rounded-md bg-muted px-2 py-0.5 text-xs text-muted-foreground"
          >
            {{ chip }}
          </span>
        </template>
      </div>

      <div class="flex items-start gap-2">
        <NuxtLink
          :to="to"
          class="min-w-0 cursor-pointer font-heading text-lg font-semibold text-foreground transition-colors hover:text-primary"
        >
          {{ title }}
        </NuxtLink>
        <VIcon
          v-if="showPaid"
          name="bi-gem"
          class="mt-1 size-4 shrink-0 text-muted-foreground"
          aria-label="Πληρωμένο υλικό"
          title="Πληρωμένο υλικό"
        />
      </div>

      <p
        v-if="description"
        class="mt-1 line-clamp-2 text-sm leading-relaxed text-muted-foreground"
      >
        {{ description }}
      </p>

      <div class="mt-3">
        <ContentReadingTime
          v-if="readingMinutes != null"
          class="text-start"
          :minutes="readingMinutes"
        />
        <p v-else-if="pageCountLabel" class="text-sm text-muted-foreground">
          {{ pageCountLabel }}
          <span v-if="fileSizeLabel" class="sr-only"> · {{ fileSizeLabel }}</span>
        </p>
        <span v-else-if="fileSizeLabel" class="sr-only">{{ fileSizeLabel }}</span>
      </div>
    </div>

    <div
      class="flex shrink-0 flex-col items-stretch gap-2 sm:justify-center sm:self-center"
    >
      <div class="flex items-center gap-2 sm:justify-end lg:flex-row">
        <UiButton
          v-if="showBookmark"
          type="button"
          variant="outline"
          size="icon"
          class="rounded-full"
          :disabled="bookmarkBusy"
          :aria-pressed="saved"
          :aria-label="bookmarkLabel"
          :title="bookmarkLabel"
          @click="toggleBookmark"
        >
          <VIcon
            :name="saved ? 'bi-bookmark-fill' : 'bi-bookmark'"
            class="size-4"
          />
        </UiButton>
        <NuxtLink
          :to="to"
          class="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <VIcon name="bi-eye" class="size-4" aria-hidden="true" />
          Άνοιγμα
        </NuxtLink>
      </div>
      <p
        v-if="showAvgRating"
        class="flex items-center justify-end gap-1 text-sm tabular-nums text-muted-foreground"
        :aria-label="`Μέση βαθμολογία ${avgRatingLabel}`"
      >
        <VIcon
          name="bi-star-fill"
          class="size-3.5 text-amber-500"
          aria-hidden="true"
        />
        <span>{{ avgRatingLabel }}</span>
      </p>
      <p
        v-else-if="showLikeCount"
        class="flex items-center justify-end gap-1 text-sm tabular-nums text-muted-foreground"
        :aria-label="`${likeCount} επισημάνσεις`"
      >
        <VIcon name="bi-heart" class="size-3.5" aria-hidden="true" />
        <span>{{ likeCount }}</span>
      </p>
    </div>
  </article>
</template>
