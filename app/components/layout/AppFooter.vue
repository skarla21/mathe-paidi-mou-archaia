<script setup lang="ts">
const { grades, loaded, failed, ensure } = useCatalogNav();
const year = new Date().getFullYear();

onMounted(() => {
  void ensure();
});
</script>

<template>
  <footer
    class="relative mt-16 w-full overflow-hidden border-t border-border bg-secondary pt-16 pb-10"
  >
    <div
      class="pointer-events-none absolute -bottom-10 -right-8 hidden h-28 w-56 opacity-40 md:block"
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 160 80"
        class="h-full w-full text-primary/30"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
      >
        <path d="M8 60c20-28 40-28 60 0s40 28 60 0" />
        <path d="M20 20h24v28H20z" />
        <path d="M28 20V8" />
      </svg>
    </div>
    <div
      class="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-6 md:grid-cols-2 lg:grid-cols-12 lg:px-12"
    >
      <div class="space-y-4 lg:col-span-4">
        <div class="flex items-center gap-2">
          <span class="size-9 shrink-0 overflow-hidden rounded-full">
            <img
              src="/imgs/mathe_archaia_logo.jpg"
              alt=""
              class="size-full object-cover"
            />
          </span>
          <span class="font-brand text-lg font-bold text-foreground"
            >Μάθε Παιδί Μου Αρχαία</span
          >
        </div>
        <p class="max-w-sm text-sm leading-relaxed text-muted-foreground">
          Το ψηφιακό σου σχολείο με κλασική σοφία και σύγχρονο παλμό. Μαθήματα,
          σημειώσεις και οργανωμένο υλικό για όλες τις τάξεις.
        </p>
        <div class="rounded-2xl bg-muted/80 p-4">
          <p class="font-brand text-lg font-bold leading-snug text-foreground">
            «Χαλεπὰ τὰ καλά — τα σπουδαία κερδίζονται με χαρά και
            δημιουργικότητα.»
          </p>
        </div>
      </div>

      <div class="space-y-3 lg:col-span-2">
        <h2 class="font-heading text-base font-semibold text-foreground">
          Τάξεις
        </h2>
        <ul class="space-y-2 text-sm text-muted-foreground">
          <li v-for="grade in grades" :key="grade.id">
            <NuxtLink
              :to="`/${grade.slug}`"
              class="transition-colors hover:text-primary"
            >
              {{ grade.name }}
            </NuxtLink>
          </li>
          <li v-if="failed && grades.length === 0">
            <span>Κάτι πήγε στραβά</span>
          </li>
          <li v-else-if="!loaded && grades.length === 0">
            <span>Φόρτωση...</span>
          </li>
          <li v-else-if="grades.length === 0">
            <span>Δεν υπάρχουν ακόμη τάξεις.</span>
          </li>
        </ul>
      </div>

      <div class="space-y-3 lg:col-span-3">
        <h2 class="font-heading text-base font-semibold text-foreground">
          Υλικό και μαθήματα
        </h2>
        <ul class="space-y-2 text-sm text-muted-foreground">
          <li>
            <a href="/#grades" class="transition-colors hover:text-primary"
              >Τάξεις</a
            >
          </li>
          <li>
            <a href="/#categories" class="transition-colors hover:text-primary"
              >Κατηγορίες</a
            >
          </li>
          <li>
            <NuxtLink
              to="/articles"
              class="transition-colors hover:text-primary"
              >Άρθρα</NuxtLink
            >
          </li>
          <li>
            <NuxtLink to="/about" class="transition-colors hover:text-primary"
              >Σχετικά</NuxtLink
            >
          </li>
        </ul>
      </div>

      <div class="space-y-3 lg:col-span-3">
        <h2 class="font-heading text-base font-semibold text-foreground">
          Επικοινωνία
        </h2>
        <p class="text-sm leading-relaxed text-muted-foreground">
          Έχεις απορίες ή θέλεις ιδιαίτερα; Στείλε μήνυμα και θα απαντήσουμε.
        </p>
        <a
          href="/#communication"
          class="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          Στείλε μήνυμα
          <VIcon name="bi-arrow-right" class="size-3.5" aria-hidden="true" />
        </a>
      </div>
    </div>
    <div
      class="mx-auto mt-12 flex max-w-7xl flex-col items-center justify-between gap-3 border-t border-border px-6 pt-6 text-xs text-muted-foreground md:flex-row lg:px-12"
    >
      <p>
        {{ `© ${year} Μάθε Παιδί Μου Αρχαία. Όλα τα δικαιώματα διατηρούνται.` }}
        <NuxtLink
          to="/oroi"
          class="ml-2 font-medium text-foreground transition-colors hover:text-primary"
        >
          Όροι χρήσης
        </NuxtLink>
      </p>
      <p>
        Designed by
        <a
          href="https://www.linkedin.com/in/antonis-skarlatos-a41781212/"
          target="_blank"
          rel="noopener noreferrer"
          class="font-medium text-foreground transition-colors hover:text-primary"
        >
          Antonis Skarlatos
        </a>
      </p>
    </div>
  </footer>
</template>
