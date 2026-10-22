<script setup lang="ts">
const cards = [
  { wash: 'bg-secondary', wave: 'fill-secondary', title: 'Δομημένη γνώση βήμα-βήμα', body: 'Τάξεις, μαθήματα και κεφάλαια σε σειρά. Η θεωρία και οι σημειώσεις βρίσκονται εκεί που τις περιμένεις.', link: 'Μάθε περισσότερα', href: '/about' },
  { wash: 'bg-accent', wave: 'fill-accent', title: 'Ασφαλές ψηφιακό σχολείο', body: 'Χωρίς διαφημίσεις. Τα αρχεία ανοίγουν μόνο για επιβεβαιωμένο λογαριασμό, και το επί πληρωμή υλικό μόνο μετά την αγορά.', link: 'Δες τις τάξεις', href: '#grades' },
  { wash: 'bg-amethyst-fixed', wave: 'fill-amethyst-fixed', title: 'Η φιλόλογος δίπλα σου', body: 'Το υλικό το ανεβάζει και το οργανώνει η διδάσκουσα. Για ιδιαίτερα, στέλνεις μήνυμα από τη φόρμα.', link: 'Γνώρισε τη σελίδα', href: '/about' },
]
</script>

<template>
  <section id="information" class="scroll-mt-40">
    <div id="info-grid">
      <article
        v-for="(card, index) in cards"
        :key="card.title"
        class="relative grid min-h-80 items-end gap-8 px-4 pt-12 pb-20 sm:px-6 sm:pb-24 lg:grid-cols-2 lg:px-12"
        :class="card.wash"
      >
        <svg
          class="pointer-events-none absolute inset-x-0 top-0 h-12 w-full -translate-y-[calc(100%-1px)] sm:h-16"
          :class="[card.wave, index % 2 === 1 ? 'scale-x-[-1]' : '']"
          viewBox="0 0 1440 64"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path d="M0 32C160 32 240 4 400 4C560 4 640 60 800 60C960 60 1040 8 1200 8C1320 8 1380 32 1440 32V64H0Z" />
        </svg>
        <div class="max-w-[40ch]">
          <p class="text-base leading-relaxed text-foreground">{{ card.body }}</p>
          <NuxtLink :to="card.href" class="mt-4 inline-flex text-[15px] font-semibold text-foreground underline decoration-foreground/30 underline-offset-4">
            {{ card.link }}
          </NuxtLink>
        </div>
        <h2 class="font-heading text-4xl leading-[0.95] text-foreground sm:text-6xl">
          {{ card.title }}
        </h2>
      </article>
    </div>
  </section>
</template>
