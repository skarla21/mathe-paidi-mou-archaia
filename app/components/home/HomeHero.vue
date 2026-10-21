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
  <section id="welcome" class="scroll-mt-40 bg-header-bg">
    <div class="mx-auto grid max-w-7xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1.25fr_0.75fr] lg:px-12 lg:py-20">
      <div>
        <h1
          id="hero-title"
          class="font-heading text-5xl leading-[0.92] tracking-tight text-foreground sm:text-7xl"
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
            class="inline-flex h-11 cursor-pointer items-center gap-2 rounded-[10px] bg-primary px-5 text-[15px] font-semibold text-primary-foreground transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97] [@media(hover:hover)]:hover:bg-primary/90"
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
        <p class="mb-2 inline-flex items-center gap-1.5 rounded-[10px] bg-amethyst-fixed px-3 py-1 text-sm text-foreground">
          <VIcon name="bi-mortarboard" class="size-3.5" aria-hidden="true" />
          Η δική σου φιλόλογος
        </p>
        <h2 class="mb-4 font-heading text-xl text-foreground">
          Εύκολη κατάκτηση της ύλης
        </h2>
        <ul class="mb-3 space-y-2.5 rounded-[10px] bg-secondary p-4 text-left text-sm">
          <li
            v-for="point in tutorPoints"
            :key="point"
            class="flex items-start gap-2.5"
          >
            <VIcon
              name="bi-check2-circle"
              class="mt-0.5 size-4 shrink-0 text-laurel"
              aria-hidden="true"
            />
            <span>{{ point }}</span>
          </li>
        </ul>
        <div class="flex items-start gap-3 rounded-[10px] bg-accent p-3.5 text-left">
          <VIcon
            name="bi-lightbulb"
            class="mt-0.5 size-5 shrink-0 text-amber"
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
