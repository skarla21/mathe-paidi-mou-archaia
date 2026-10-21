<script setup lang="ts">
interface ArticleCard {
  id: string;
  title: string;
  slug: string;
  tags: string[] | null;
  reading_time_minutes: number | null;
  image_url?: string | null;
}

const { categories, ensureCategories, categoriesFailed } = useCatalogNav();
const articles = ref<ArticleCard[]>([]);
const articlesFailed = ref(false);

const storedImageSrc = useStoredImageSrc();
const shownArticles = computed(() => articles.value);
const washes = ['bg-secondary', 'bg-accent', 'bg-header-bg', 'bg-amethyst-fixed', 'bg-muted'];

function wash(index: number) {
  return washes[index % washes.length]!;
}

await ensureCategories();
try {
  const page = await $fetch<{ items: ArticleCard[] }>("/api/articles", {
    query: { limit: 3 },
  });
  articles.value = page?.items ?? [];
} catch {
  articlesFailed.value = true;
}
</script>

<template>
  <section id="categories" class="mx-auto max-w-7xl scroll-mt-40 px-4 py-16 sm:px-6 lg:px-12">
    <div class="mb-10">
      <h2
        class="font-heading text-4xl text-foreground sm:text-5xl"
      >
        Υλικό έξω από την τάξη
      </h2>
      <p class="text-muted-foreground">
        Κατηγορίες με επιπλέον υλικό, οργανωμένες όπως τις έχει η διδάσκουσα.
      </p>
    </div>

    <p
      v-if="categoriesFailed && categories.length === 0"
      class="rounded-[10px] border border-dashed border-border bg-card p-8 text-center text-muted-foreground"
    >
      Οι κατηγορίες δεν φορτώθηκαν. Δοκίμασε ξανά σε λίγο.
    </p>
    <p
      v-else-if="categories.length === 0"
      class="rounded-[10px] border border-dashed border-border bg-card p-8 text-center text-muted-foreground"
    >
      Δεν υπάρχουν ακόμη κατηγορίες.
    </p>
    <div
      v-else
      id="categories-grid"
      class="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      <article v-for="(category, index) in categories" :key="category.id" class="flex">
        <NuxtLink
          :to="`/category/${category.slug}`"
          class="flex flex-1 flex-col rounded-[10px] border border-border bg-card p-3 text-foreground transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] [@media(hover:hover)]:hover:bg-muted"
        >
          <div class="h-40 overflow-hidden rounded-[10px]" :class="wash(index)">
            <img
              v-if="storedImageSrc(category.image_url)"
              :src="storedImageSrc(category.image_url)"
              alt=""
              class="h-full w-full object-cover"
            />
            <div v-else class="flex h-full items-center justify-center">
              <VIcon name="bi-collection" class="size-8" aria-hidden="true" />
            </div>
          </div>
          <h3 class="mt-4 font-heading text-2xl">{{ category.name }}</h3>
          <p
            v-if="category.description"
            class="mt-2 line-clamp-3 text-sm leading-relaxed text-muted-foreground"
          >
            {{ category.description }}
          </p>
          <div class="mt-auto pt-5">
            <span class="inline-flex h-10 w-fit items-center gap-2 rounded-[10px] bg-primary px-4 text-[15px] font-semibold text-primary-foreground">
              Άνοιγμα κατηγορίας
              <VIcon name="bi-arrow-right" class="size-4" aria-hidden="true" />
            </span>
          </div>
        </NuxtLink>
      </article>
    </div>
  </section>

  <section id="articles" class="mx-auto max-w-7xl scroll-mt-40 px-4 py-16 sm:px-6 lg:px-12">
    <div
      class="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"
    >
      <div>
        <h2
          class="font-heading text-4xl text-foreground sm:text-5xl"
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
        active-class=""
        exact-active-class=""
        class="inline-flex h-11 w-fit shrink-0 items-center gap-2 rounded-[10px] border border-border bg-card px-4 text-[15px] font-semibold text-foreground"
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
      class="rounded-[10px] border border-dashed border-border bg-card p-8 text-center text-muted-foreground"
    >
      Τα άρθρα δεν φορτώθηκαν. Δοκίμασε ξανά σε λίγο.
    </p>
    <p
      v-else-if="shownArticles.length === 0"
      class="rounded-[10px] border border-dashed border-border bg-card p-8 text-center text-muted-foreground"
    >
      Δεν υπάρχουν ακόμη άρθρα.
    </p>
    <div
      v-else
      id="articles-grid"
      class="grid gap-4 md:grid-cols-2 xl:grid-cols-3"
    >
      <article v-for="(article, index) in shownArticles" :key="article.id" class="flex">
        <NuxtLink
          :to="`/articles/${article.slug}`"
          class="flex flex-1 flex-col rounded-[10px] border border-border bg-card p-3 text-foreground transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] [@media(hover:hover)]:hover:bg-muted"
        >
          <div class="h-40 overflow-hidden rounded-[10px]" :class="wash(index + 1)">
            <img
              v-if="storedImageSrc(article.image_url)"
              :src="storedImageSrc(article.image_url)"
              alt=""
              class="h-full w-full object-cover"
            />
            <div v-else class="flex h-full items-center justify-center">
              <VIcon name="bi-newspaper" class="size-8" aria-hidden="true" />
            </div>
          </div>
          <p v-if="article.reading_time_minutes" class="mt-4 text-sm text-muted-foreground">
            {{ `${article.reading_time_minutes} λεπτά ανάγνωσης` }}
          </p>
          <h3 class="font-heading text-2xl" :class="article.reading_time_minutes ? 'mt-2' : 'mt-4'">{{ article.title }}</h3>
          <div class="mt-auto pt-5">
            <span class="inline-flex h-10 w-fit items-center gap-2 rounded-[10px] bg-primary px-4 text-[15px] font-semibold text-primary-foreground">
              Ανάγνωση άρθρου
              <VIcon name="bi-book" class="size-4" aria-hidden="true" />
            </span>
          </div>
        </NuxtLink>
      </article>
    </div>
  </section>
</template>
