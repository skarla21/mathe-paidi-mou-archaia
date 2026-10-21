<script setup lang="ts">
definePageMeta({ layout: 'default' })

useHead(() => describedHead(
  'Σχετικά',
  'Η φιλόλογος γράφει και οργανώνει διδακτικό υλικό για Αρχαία, για κάθε σχολική τάξη. Ιδιαίτερα μαθήματα από τη φόρμα επικοινωνίας.',
  [],
  '/about',
))

const lead = 'Ό,τι χρειάζεσαι για να κατακτήσεις τα Αρχαία Ελληνικά στις εξετάσεις — δομημένες σημειώσεις, μαθήματα βήμα-βήμα και οργανωμένο υλικό εξάσκησης.'

const facts = [
  { label: 'Ποιος γράφει', value: 'Η φιλόλογος της πλατφόρμας' },
  { label: 'Τάξεις', value: 'Δημοτικό, γυμνάσιο, λύκειο' },
  { label: 'Ιδιαίτερα', value: 'Διαδικτυακά, καθημερινές και Σαββατοκύριακα' },
]

const mission = [
  'Πιστεύουμε ότι κάθε μαθητής αξίζει ξεκάθαρο και οργανωμένο υλικό για τις εξετάσεις. Αυτή η πλατφόρμα φτιάχτηκε για να κάνει τα Αρχαία Ελληνικά προσιτά — μετατρέποντας ένα δύσκολο μάθημα σε έναν δομημένο, εφικτό στόχο.',
  'Το διδακτικό υλικό το γράφει και το οργανώνει η φιλόλογος αυτής της πλατφόρμας, χωρισμένο ανά σχολική τάξη. Για διαδικτυακά ιδιαίτερα μαθήματα, στέλνεις μήνυμα από τη φόρμα επικοινωνίας.',
]

const access = [
  { label: 'Χωρίς λογαριασμό', value: 'Τάξεις, κεφάλαια, κατηγορίες, άρθρα και σημειώσεις' },
  { label: 'Με λογαριασμό', value: 'Τα αρχεία PDF' },
  { label: 'Με αγορά', value: 'Το επί πληρωμή υλικό' },
]

const platformPoints = [
  { text: 'Οργανωμένες σημειώσεις ανά τάξη και μάθημα', wash: 'bg-header-bg', shape: 'h-44 w-44' },
  { text: 'Μαθήματα βήμα-βήμα στο ρυθμό σου', wash: 'bg-secondary', shape: 'h-40 w-60' },
  { text: 'Ξεκάθαρη διάταξη προσαρμοσμένη στις εξετάσεις — εστίασε στην ύλη, όχι στην αναζήτηση', wash: 'bg-accent', shape: 'h-52 w-36' },
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
  <div>
    <section id="about-title" class="mx-auto grid max-w-7xl items-end gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[42%_1fr] lg:px-12 lg:py-24">
      <p class="max-w-[32ch] text-lg leading-relaxed text-foreground">{{ lead }}</p>
      <div>
        <h1 class="font-heading text-6xl leading-none text-foreground sm:text-7xl lg:text-8xl">Σχετικά</h1>
        <NuxtLink
          to="/#communication"
          class="mt-7 inline-flex h-10 items-center rounded-[10px] bg-primary px-4 text-[15px] font-semibold text-primary-foreground transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
        >
          Στείλε μήνυμα
        </NuxtLink>
      </div>
    </section>

    <section id="about-mission" class="mx-auto grid max-w-7xl gap-x-10 gap-y-8 px-4 py-8 sm:px-6 lg:grid-cols-[34%_1fr] lg:px-12 lg:py-16">
      <div>
        <p v-for="fact in facts" :key="fact.label" class="mb-5">
          <span class="block text-sm text-muted-foreground">{{ fact.label }}</span>
          <strong class="mt-1 block text-base font-semibold text-foreground">{{ fact.value }}</strong>
        </p>
      </div>
      <div>
        <p v-for="paragraph in mission" :key="paragraph" class="mb-5 max-w-[42ch] text-xl leading-snug text-foreground sm:text-2xl">
          {{ paragraph }}
        </p>
      </div>
      <p class="text-sm text-muted-foreground lg:mt-8">Πρόσβαση</p>
      <ul class="grid gap-4 sm:grid-cols-2 lg:mt-8">
        <li v-for="item in access" :key="item.label">
          <strong class="block text-base font-semibold text-foreground">{{ item.label }}</strong>
          <span class="mt-1 block text-base text-muted-foreground">{{ item.value }}</span>
        </li>
      </ul>
    </section>

    <section id="about-platform" class="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-12 lg:py-20">
      <h2 class="font-heading text-4xl text-foreground sm:text-5xl lg:ml-[35%] lg:text-6xl">Τι Προσφέρουμε</h2>
      <article
        v-for="point in platformPoints"
        :key="point.text"
        class="mt-12 grid items-start gap-6 lg:mt-16 lg:grid-cols-[35%_1fr_auto]"
      >
        <h3 class="font-heading text-3xl text-foreground lg:col-start-2 lg:text-4xl">{{ point.text }}</h3>
        <div class="rounded-[10px] lg:col-start-3" :class="[point.wash, point.shape]" aria-hidden="true" />
      </article>
    </section>

    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-12 lg:py-16">
      <AboutFaq id="about-faq" />
    </div>

    <section id="about-contact" class="mx-auto grid max-w-7xl items-start gap-8 px-4 py-16 sm:px-6 lg:grid-cols-[1.3fr_160px_0.8fr] lg:px-12 lg:py-28">
      <p class="max-w-[18ch] font-heading text-3xl leading-tight text-foreground sm:text-4xl">
        Έχεις απορία, πρόταση ή χρειάζεσαι βοήθεια; Χαιρόμαστε πάντα να ακούμε τους μαθητές.
      </p>
      <img
        src="/imgs/mathe_archaia_logo.jpg"
        alt=""
        width="160"
        height="160"
        class="size-40 rounded-[10px] object-cover"
      />
      <div class="flex flex-col gap-3 text-lg font-semibold">
        <NuxtLink to="/#communication" class="text-foreground underline underline-offset-4">Στείλε μήνυμα</NuxtLink>
        <NuxtLink to="/#grades" class="text-foreground underline underline-offset-4">Δες τις τάξεις</NuxtLink>
      </div>
    </section>
  </div>
</template>
