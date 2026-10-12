<script setup lang="ts">
import { acceptedEntityImageUrl } from '#shared/utils/entityImageUrl.mjs'

interface ArticleCard {
  id: string
  title: string
  tags: string[] | null
  reading_time_minutes: number | null
}

const { categories, ensureCategories, categoriesFailed } = useCatalogNav()
const articles = ref<ArticleCard[]>([])
const articlesFailed = ref(false)

const supabaseUrl = String(useRuntimeConfig().public.supabaseUrl || '')

function storedImageSrc(url: string | null | undefined) {
  const accepted = acceptedEntityImageUrl(url ?? '', supabaseUrl)
  return typeof accepted === 'string' ? accepted : ''
}

const shownCategories = computed(() => categories.value.slice(0, 3))
const shownArticles = computed(() => articles.value.slice(0, 3))
const hasCards = computed(() => shownCategories.value.length > 0 || shownArticles.value.length > 0)
const failed = computed(() => categoriesFailed.value || articlesFailed.value)

await ensureCategories()
try {
  articles.value = (await $fetch<ArticleCard[]>('/api/articles')) ?? []
} catch {
  articlesFailed.value = true
}
</script>

<template>
  <section id="more" class="scroll-mt-24 py-16">
    <div class="mb-10">
      <span class="inline-flex rounded-full bg-amethyst-fixed px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-amethyst-fixed-foreground">
        Έξτρα ύλη
      </span>
      <h2 class="mt-2 font-heading text-3xl font-extrabold text-foreground sm:text-4xl">Πέρα από το μάθημα της τάξης</h2>
      <p class="text-muted-foreground">Κατηγορίες με επιπλέον μαθήματα και άρθρα, ό,τι έχει δημοσιεύσει η διδάσκουσα.</p>
    </div>

    <p v-if="failed && !hasCards" class="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
      Το έξτρα υλικό δεν φορτώθηκε. Δοκίμασε ξανά σε λίγο.
    </p>
    <p v-else-if="!hasCards" class="rounded-3xl border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
      Δεν υπάρχει ακόμη έξτρα υλικό.
    </p>
    <div v-else id="extras-grid" class="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
      <p v-if="failed" class="text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
        Το έξτρα υλικό δεν φορτώθηκε. Δοκίμασε ξανά σε λίγο.
      </p>
      <article
        v-for="category in shownCategories"
        :key="category.id"
        class="flex flex-col overflow-hidden rounded-3xl bg-card shadow-sm transition-shadow hover:shadow-md"
      >
        <div class="h-40 bg-laurel-fixed/50">
          <img
            v-if="storedImageSrc(category.image_url)"
            :src="storedImageSrc(category.image_url)"
            :alt="category.name"
            class="h-full w-full object-cover"
          >
          <div v-else class="flex h-full items-center justify-center text-laurel">
            <VIcon name="bi-collection" class="size-10" aria-hidden="true" />
          </div>
        </div>
        <div class="flex flex-1 flex-col p-6">
          <span class="mb-2 w-fit rounded-full bg-laurel-fixed px-2.5 py-0.5 text-[11px] font-bold text-laurel-fixed-foreground">
            Κατηγορίες
          </span>
          <h3 class="font-heading text-xl font-bold">{{ category.name }}</h3>
          <p v-if="category.description" class="mt-2 text-sm text-muted-foreground">{{ category.description }}</p>
          <NuxtLink :to="`/category/${category.slug}`" class="mt-4 inline-flex items-center gap-1 text-sm font-bold text-laurel">
            Άνοιγμα κατηγορίας
            <VIcon name="bi-arrow-right" class="size-3.5" aria-hidden="true" />
          </NuxtLink>
        </div>
      </article>
      <article
        v-for="article in shownArticles"
        :key="article.id"
        class="flex flex-col overflow-hidden rounded-3xl bg-card shadow-sm transition-shadow hover:shadow-md"
      >
        <div class="flex h-40 items-center justify-center bg-amethyst-fixed/70 text-amethyst">
          <VIcon name="bi-newspaper" class="size-10" aria-hidden="true" />
        </div>
        <div class="flex flex-1 flex-col p-6">
          <div class="mb-2 flex items-center justify-between gap-2">
            <span class="rounded-full bg-amethyst-fixed px-2.5 py-0.5 text-[11px] font-bold text-amethyst-fixed-foreground">
              Άρθρα
            </span>
            <span v-if="article.reading_time_minutes" class="text-xs text-muted-foreground">
              {{ `${article.reading_time_minutes} λεπτά ανάγνωσης` }}
            </span>
          </div>
          <h3 class="font-heading text-xl font-bold">{{ article.title }}</h3>
          <NuxtLink :to="`/articles/${article.id}`" class="mt-4 inline-flex items-center gap-1 text-sm font-bold text-amethyst">
            Ανάγνωση άρθρου
            <VIcon name="bi-book" class="size-3.5" aria-hidden="true" />
          </NuxtLink>
        </div>
      </article>
    </div>
  </section>
</template>
