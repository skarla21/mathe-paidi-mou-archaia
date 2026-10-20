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
</script>

<template>
  <section>
    <h2 class="mb-4 flex items-center gap-2 font-heading text-2xl font-semibold">
      <span class="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <VIcon name="bi-info-circle" class="size-4" aria-hidden="true" />
      </span>
      Συχνές ερωτήσεις
    </h2>
    <p class="mb-4 font-heading leading-relaxed text-muted-foreground">
      Σύντομες απαντήσεις για το υλικό, τις σχολικές τάξεις και τα ιδιαίτερα.
    </p>
    <div class="rounded-3xl border border-border bg-card px-5 shadow-sm sm:px-6">
      <details
        v-for="(item, index) in questions"
        :key="item.question"
        class="group border-b border-border last:border-b-0"
        :open="index === 0"
      >
        <summary class="flex cursor-pointer list-none items-center justify-between gap-4 py-4 outline-none focus-visible:rounded-lg focus-visible:ring-2 focus-visible:ring-primary/40 [&::-webkit-details-marker]:hidden">
          <h3 class="font-heading text-base font-semibold text-foreground">
            {{ item.question }}
          </h3>
          <VIcon
            name="bi-chevron-down"
            class="size-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
            aria-hidden="true"
          />
        </summary>
        <p class="pb-4 font-heading leading-relaxed text-muted-foreground">
          {{ item.answer }}
        </p>
      </details>
    </div>
  </section>
</template>
