<script setup lang="ts">
interface ArticleCard {
  id: string;
  title: string;
  tags: string[] | null;
  reading_time_minutes: number | null;
}

const { categories, ensureCategories, categoriesFailed } = useCatalogNav();
const articles = ref<ArticleCard[]>([]);
const articlesFailed = ref(false);

const storedImageSrc = useStoredImageSrc();
const shownArticles = computed(() => articles.value.slice(0, 3));

await ensureCategories();
try {
  articles.value = (await $fetch<ArticleCard[]>("/api/articles")) ?? [];
} catch {
  articlesFailed.value = true;
}
</script>

<template>
  <section id="categories" class="scroll-mt-24 py-16">
    <div class="mb-10">
      <span
        class="inline-flex rounded-full bg-laurel-fixed px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-laurel-fixed-foreground"
      >
        Κατηγορίες
      </span>
      <h2
        class="mt-2 font-heading text-3xl font-extrabold text-foreground sm:text-4xl"
      >
        Υλικό έξω από την τάξη
      </h2>
      <p class="text-muted-foreground">
        Κατηγορίες με επιπλέον υλικό, οργανωμένες όπως τις έχει η διδάσκουσα.
      </p>
    </div>

    <p
      v-if="categoriesFailed && categories.length === 0"
      class="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground"
    >
      Οι κατηγορίες δεν φορτώθηκαν. Δοκίμασε ξανά σε λίγο.
    </p>
    <p
      v-else-if="categories.length === 0"
      class="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground"
    >
      Δεν υπάρχουν ακόμη κατηγορίες.
    </p>
    <div
      v-else
      id="categories-grid"
      class="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
    >
      <article
        v-for="category in categories"
        :key="category.id"
        class="flex flex-col overflow-hidden rounded-3xl bg-card shadow-sm transition-shadow hover:shadow-md"
      >
        <div class="h-40 bg-laurel-fixed/50">
          <img
            v-if="storedImageSrc(category.image_url)"
            :src="storedImageSrc(category.image_url)"
            alt=""
            class="h-full w-full object-cover"
          />
          <div
            v-else
            class="flex h-full items-center justify-center text-laurel"
          >
            <VIcon name="bi-collection" class="size-10" aria-hidden="true" />
          </div>
        </div>
        <div class="flex flex-1 flex-col p-6">
          <h3 class="font-heading text-xl font-bold">{{ category.name }}</h3>
          <p
            v-if="category.description"
            class="mt-2 line-clamp-3 text-sm text-muted-foreground"
          >
            {{ category.description }}
          </p>
          <NuxtLink
            :to="`/category/${category.slug}`"
            class="mt-4 inline-flex items-center gap-1 text-sm font-bold text-laurel"
          >
            Άνοιγμα κατηγορίας
            <VIcon name="bi-arrow-right" class="size-3.5" aria-hidden="true" />
          </NuxtLink>
        </div>
      </article>
    </div>
  </section>

  <section id="articles" class="scroll-mt-24 py-16">
    <div
      class="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <span
          class="inline-flex rounded-full bg-amethyst-fixed px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amethyst-fixed-foreground"
        >
          Άρθρα
        </span>
        <h2
          class="mt-2 font-heading text-3xl font-extrabold text-foreground sm:text-4xl"
        >
          Κείμενα της διδάσκουσας
        </h2>
        <p class="text-muted-foreground">
          Άρθρα με σχόλια και αντιδράσεις, ξεχωριστά από τα μαθήματα.
        </p>
      </div>
      <NuxtLink
        v-if="shownArticles.length"
        to="/articles"
        class="inline-flex w-fit shrink-0 items-center gap-2 rounded-full border-2 border-border bg-card px-4 py-2 font-ui text-sm font-semibold text-foreground shadow-sm transition-all hover:border-primary/40 hover:bg-secondary"
      >
        Όλα τα άρθρα
        <VIcon
          name="bi-arrow-right"
          class="size-4 shrink-0"
          aria-hidden="true"
        />
      </NuxtLink>
    </div>

    <p
      v-if="articlesFailed && shownArticles.length === 0"
      class="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground"
    >
      Τα άρθρα δεν φορτώθηκαν. Δοκίμασε ξανά σε λίγο.
    </p>
    <p
      v-else-if="shownArticles.length === 0"
      class="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground"
    >
      Δεν υπάρχουν ακόμη άρθρα.
    </p>
    <div
      v-else
      id="articles-grid"
      class="grid gap-6 md:grid-cols-2 xl:grid-cols-3"
    >
      <article
        v-for="article in shownArticles"
        :key="article.id"
        class="flex flex-col overflow-hidden rounded-3xl bg-card shadow-sm transition-shadow hover:shadow-md"
      >
        <div
          class="flex h-40 items-center justify-center bg-amethyst-fixed/70 text-amethyst"
        >
          <VIcon name="bi-newspaper" class="size-10" aria-hidden="true" />
        </div>
        <div class="flex flex-1 flex-col p-6">
          <span
            v-if="article.reading_time_minutes"
            class="mb-2 text-xs text-muted-foreground"
          >
            {{ `${article.reading_time_minutes} λεπτά ανάγνωσης` }}
          </span>
          <h3 class="font-heading text-xl font-bold">{{ article.title }}</h3>
          <NuxtLink
            :to="`/articles/${article.id}`"
            class="mt-4 inline-flex items-center gap-1 text-sm font-bold text-amethyst"
          >
            Ανάγνωση άρθρου
            <VIcon name="bi-book" class="size-3.5" aria-hidden="true" />
          </NuxtLink>
        </div>
      </article>
    </div>
  </section>
</template>
