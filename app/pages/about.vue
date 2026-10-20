<script setup lang="ts">
definePageMeta({ layout: 'default' })

useHead(() => describedHead(
  'Σχετικά',
  'Η φιλόλογος γράφει και οργανώνει διδακτικό υλικό για Αρχαία, για κάθε σχολική τάξη. Ιδιαίτερα μαθήματα από τη φόρμα επικοινωνίας.',
  [],
  '/about',
))

const platformPoints = [
  'Οργανωμένες σημειώσεις ανά τάξη και μάθημα',
  'Μαθήματα βήμα-βήμα στο ρυθμό σου',
  'Ξεκάθαρη διάταξη προσαρμοσμένη στις εξετάσεις — εστίασε στην ύλη, όχι στην αναζήτηση',
]

onMounted(() => {
  if (import.meta.client) {
    const { revealSection } = useGsapReveal()
    nextTick(() => {
      revealSection('#about-title')
      revealSection('#about-mission')
      revealSection('#about-platform')
      revealSection('#about-faq')
      revealSection('#about-contact')
    })
  }
})
</script>

<template>
  <div class="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6">
    <div id="about-title">
      <LayoutPageIntro title="Σχετικά" lead="Ό,τι χρειάζεσαι για να κατακτήσεις τα Αρχαία Ελληνικά στις εξετάσεις — δομημένες σημειώσεις, μαθήματα βήμα-βήμα και οργανωμένο υλικό εξάσκησης." />
    </div>

    <!-- Mission section -->
    <section id="about-mission" class="mb-10">
      <h2 class="font-heading text-2xl font-semibold flex items-center gap-2 mb-4">
        <span class="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <VIcon name="bi-stars" class="size-4" aria-hidden="true" />
        </span>
        Η Αποστολή Μας
      </h2>
      <p class="text-muted-foreground leading-relaxed font-heading">Πιστεύουμε ότι κάθε μαθητής αξίζει ξεκάθαρο και οργανωμένο υλικό για τις εξετάσεις. Αυτή η πλατφόρμα φτιάχτηκε για να κάνει τα Αρχαία Ελληνικά προσιτά — μετατρέποντας ένα δύσκολο μάθημα σε έναν δομημένο, εφικτό στόχο.</p>
      <p class="mt-4 text-muted-foreground leading-relaxed font-heading">Το διδακτικό υλικό το γράφει και το οργανώνει η φιλόλογος αυτής της πλατφόρμας, χωρισμένο ανά σχολική τάξη. Για διαδικτυακά ιδιαίτερα μαθήματα, στέλνεις μήνυμα από τη φόρμα επικοινωνίας.</p>
    </section>

    <!-- What we offer section -->
    <section id="about-platform" class="mb-10">
      <h2 class="font-heading text-2xl font-semibold flex items-center gap-2 mb-4">
        <span class="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <VIcon name="bi-journal-bookmark" class="size-4" aria-hidden="true" />
        </span>
        Τι Προσφέρουμε
      </h2>
      <ul class="space-y-3">
        <li
          v-for="point in platformPoints"
          :key="point"
          class="flex items-start gap-3"
        >
          <span class="mt-0.5 shrink-0 text-primary">
            <VIcon name="bi-check2-circle" class="size-5" />
          </span>
          <span class="text-muted-foreground leading-relaxed font-heading">
            {{ point }}
          </span>
        </li>
      </ul>
    </section>

    <AboutFaq id="about-faq" class="mb-10" />

    <!-- Contact section -->
    <section id="about-contact" class="rounded-3xl border border-border bg-card p-6 shadow-sm">
      <h2 class="font-heading text-xl font-semibold flex items-center gap-2 mb-3">
        <VIcon name="bi-chat-dots" class="size-5 text-primary" aria-hidden="true" />
        Επικοινωνία
      </h2>
      <p class="text-muted-foreground font-heading mb-4">Έχεις απορία, πρόταση ή χρειάζεσαι βοήθεια; Χαιρόμαστε πάντα να ακούμε τους μαθητές.</p>
      <NuxtLink
        to="/#communication"
        class="inline-flex items-center justify-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90"
      >
        <VIcon name="bi-envelope" class="size-4" aria-hidden="true" />
        Στείλε μήνυμα
      </NuxtLink>
    </section>

  </div>
</template>
