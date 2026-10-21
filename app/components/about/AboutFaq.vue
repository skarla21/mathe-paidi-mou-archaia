<script setup lang="ts">
import { faqPageNode, jsonLdGraph, jsonLdScript } from '~/utils/jsonLd'

const questions = [
  {
    question: 'Τι είναι το Μάθε Παιδί Μου Αρχαία;',
    answer: 'Ψηφιακό διδακτικό υλικό που γράφει και οργανώνει η φιλόλογος της πλατφόρμας. Περιλαμβάνει σημειώσεις, κεφάλαια και άρθρα για τα Αρχαία Ελληνικά και την υπόλοιπη σχολική ύλη.',
  },
  {
    question: 'Για ποιες σχολικές τάξεις είναι το υλικό;',
    answer: 'Για τις τάξεις του δημοτικού, του γυμνασίου και του λυκείου. Κάθε τάξη έχει τα δικά της μαθήματα και κεφάλαια, στη σειρά που τα έχει οργανώσει η διδάσκουσα.',
  },
  {
    question: 'Τι μπορώ να διαβάσω χωρίς λογαριασμό;',
    answer: 'Τις τάξεις, τα κεφάλαια, τις κατηγορίες, τα άρθρα και τις σημειώσεις κάθε μαθήματος. Το αρχείο PDF ανοίγει με επιβεβαιωμένο λογαριασμό. Το επί πληρωμή υλικό ανοίγει μόνο μετά την αγορά.',
  },
  {
    question: 'Ποιος ετοιμάζει το διδακτικό περιεχόμενο;',
    answer: 'Η φιλόλογος αυτής της πλατφόρμας. Το υλικό δεν συγκεντρώνεται από αλλού: το γράφει η ίδια, το χωρίζει ανά τάξη και το ενημερώνει όταν αλλάζει η ύλη.',
  },
  {
    question: 'Πώς ζητάω ιδιαίτερα μαθήματα;',
    answer: 'Από τη φόρμα επικοινωνίας στην αρχική σελίδα. Οι συνεδρίες είναι διαδικτυακές, καθημερινές και Σαββατοκύριακα. Η φιλόλογος απαντά στο μήνυμα. Η εξειδίκευση καλύπτει Αρχαία, έκθεση και ειδική αγωγή.',
  },
  {
    question: 'Τι είναι τα άρθρα;',
    answer: 'Κείμενα της διδάσκουσας, πέρα από τα κεφάλαια της σχολικής ύλης. Δημοσιεύονται στη σελίδα Άρθρα και διαβάζονται ελεύθερα.',
  },
]

useHead({
  script: [jsonLdScript(jsonLdGraph([faqPageNode(questions)]), 'ld-json-faq')],
})

const openIndex = ref(0)

function onToggle(index: number, event: Event) {
  const details = event.currentTarget
  if (!(details instanceof HTMLDetailsElement)) return
  if (details.open) {
    openIndex.value = index
    return
  }
  if (openIndex.value === index) openIndex.value = -1
}
</script>

<template>
  <section class="grid gap-6 lg:grid-cols-[180px_1fr]">
    <p class="text-sm font-semibold text-muted-foreground">Ερωτήσεις</p>
    <div>
      <h2 class="font-heading text-4xl text-foreground sm:text-5xl">Συχνές ερωτήσεις</h2>
      <p class="mt-3 max-w-xl text-lg text-foreground">
        Σύντομες απαντήσεις για το υλικό, τις σχολικές τάξεις και τα ιδιαίτερα.
      </p>
      <div class="mt-8 border-t border-border">
        <details
          v-for="(item, index) in questions"
          :key="item.question"
          class="group border-b border-border"
          :open="openIndex === index"
          @toggle="onToggle(index, $event)"
        >
          <summary class="flex cursor-pointer list-none items-center justify-between gap-4 py-5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring [&::-webkit-details-marker]:hidden">
            <h3 class="font-heading text-xl text-foreground sm:text-2xl">
              {{ item.question }}
            </h3>
            <VIcon
              name="bi-chevron-down"
              class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] group-open:rotate-180"
              aria-hidden="true"
            />
          </summary>
          <p class="max-w-[52ch] pb-5 text-base leading-relaxed text-muted-foreground">
            {{ item.answer }}
          </p>
        </details>
      </div>
    </div>
  </section>
</template>
