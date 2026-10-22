<script setup lang="ts">
const tutorPoints = [
  "Σημειώσεις και υλικό για όλες τις τάξεις",
  "Κατηγορίες και άρθρα πέρα από το σχολικό πρόγραμμα",
  "Ιδιαίτερα μαθήματα μέσα από τη φόρμα επικοινωνίας",
];

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}
</script>

<template>
  <section id="welcome" class="relative isolate scroll-mt-40 overflow-hidden bg-background">
    <img
      src="/imgs/animated-class.jpg"
      alt=""
      width="832"
      height="448"
      class="pointer-events-none absolute inset-0 size-full object-cover object-center brightness-110 saturate-75 dark:brightness-105 dark:saturate-70"
      aria-hidden="true"
    />
    <div
      class="hero-scrim pointer-events-none absolute inset-0"
      aria-hidden="true"
    />
    <div class="relative z-10 mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.25fr_0.75fr] lg:px-12 lg:py-20">
      <div>
        <h1
          id="hero-title"
          class="font-heading text-4xl leading-[0.95] tracking-tight text-foreground sm:text-6xl lg:text-7xl lg:leading-[0.92]"
        >
          Μάθε Παιδί μου<br />
          Αρχαία και σύγχρονα
        </h1>
        <p id="hero-lead" class="mt-6 max-w-xl text-lg leading-relaxed text-foreground">
          Ολοκληρωμένος χώρος για σημειώσεις, κεφάλαια και επιπλέον περιεχόμενο.
          Το υλικό μένει οργανωμένο, ώστε κάθε μαθητής να βρίσκει αυτό που
          χρειάζεται.
        </p>
        <div id="hero-cta" class="mt-8">
          <button
            type="button"
            class="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[10px] bg-primary px-5 text-[15px] font-semibold text-primary-foreground transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97] [@media(hover:hover)]:hover:bg-primary/90"
            @click="scrollTo('grades')"
          >
            <VIcon name="bi-book" class="size-4" aria-hidden="true" />
            Εξερεύνησε το υλικό
          </button>
        </div>
      </div>
      <div class="w-full max-w-md justify-self-end rounded-[10px] border border-border bg-card px-6 pt-0 pb-6 text-center">
        <div class="relative -mt-10 mb-4 flex justify-center">
          <img
            src="/imgs/mathe_archaia_logo.jpg"
            alt=""
            width="96"
            height="96"
            class="size-24 rounded-full object-cover ring-4 ring-card"
          />
        </div>
        <p class="mb-2 inline-flex items-center gap-1.5 rounded-[10px] border border-primary/30 bg-primary/15 px-3 py-1 text-sm text-foreground">
          <VIcon name="bi-mortarboard" class="size-3.5 text-primary" aria-hidden="true" />
          Η δική σου φιλόλογος
        </p>
        <h2 class="mb-4 font-heading text-xl text-foreground">
          Εύκολη κατάκτηση της ύλης
        </h2>
        <ul class="mb-3 space-y-2.5 rounded-[10px] bg-sky p-4 text-left text-sm">
          <li
            v-for="point in tutorPoints"
            :key="point"
            class="flex items-start gap-2.5"
          >
            <VIcon
              name="bi-check2-circle"
              class="mt-0.5 size-4 shrink-0 text-primary"
              aria-hidden="true"
            />
            <span>{{ point }}</span>
          </li>
        </ul>
        <div class="flex items-start gap-3 rounded-[10px] bg-amethyst-fixed p-3.5 text-left">
          <VIcon
            name="bi-lightbulb"
            class="mt-0.5 size-5 shrink-0 text-amethyst"
            aria-hidden="true"
          />
          <div>
            <p class="text-sm text-foreground">Σημείωση από τη φιλόλογο</p>
            <p class="font-brand text-lg leading-snug text-foreground">
              «Στον Αόριστο Β΄ βρίσκουμε πρώτα το θέμα του Ενεστώτα και
              αφαιρούμε την κατάληξη.»
            </p>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.hero-scrim {
  background-color: color-mix(in oklab, var(--background) 78%, transparent);
}

html.dark .hero-scrim {
  background-color: color-mix(in oklab, var(--background) 72%, transparent);
}
</style>
