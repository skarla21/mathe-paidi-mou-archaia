<script setup lang="ts">
const { openRegister } = useAuthModal();
const { session } = useCurrentUser();
const signedIn = computed(() => !!session.value.user?.id);

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
}

const activeKey = ref("guest");

const tiers = computed(() => [
  {
    key: "guest",
    icon: "bi-unlock",
    wash: "bg-header-bg",
    badgeText: "Χωρίς λογαριασμό",
    title: "Περιήγηση",
    lead: "Βλέπεις τάξεις, κεφάλαια, κατηγορίες, άρθρα και τους τίτλους των μαθημάτων.",
    bullets: [
      "Πλοήγηση σε όλη την ύλη",
      "Ανάγνωση δημοσιευμένων άρθρων",
      "Οι τίτλοι των μαθημάτων μένουν ορατοί",
    ],
    cta: "Δες τις τάξεις",
    action: () => scrollTo("grades"),
  },
  {
    key: "account",
    icon: signedIn.value ? "bi-person-badge" : "bi-person-plus",
    wash: "bg-accent",
    badgeText: signedIn.value ? "Ο λογαριασμός σου" : "Δωρεάν εγγραφή",
    title: "Με λογαριασμό",
    lead: signedIn.value
      ? "Συνέχισε από το υλικό που έχεις αποθηκεύσει ή αγοράσει."
      : "Επιβεβαιώνεις το email, αποκτάς πρόσβαση στα δωρεάν αρχεία.",
    bullets: [
      "Πρόσβαση στα δωρεάν αρχεία ανά πάσα στιγμή",
      "Αγορά επί πληρωμή μαθημάτων",
    ],
    cta: signedIn.value ? "Το υλικό μου" : "Δημιουργία λογαριασμού",
    action: () => {
      if (signedIn.value) {
        void navigateTo("/dashboard");
        return;
      }
      openRegister();
    },
  },
  {
    key: "tutor",
    icon: "bi-star",
    wash: "bg-secondary",
    badgeText: "Ιδιαίτερα",
    title: "Ιδιαίτερα μαθήματα",
    lead: "Ζήτησε προσωπική επικοινωνία με τη διδάσκουσα.",
    bullets: [
      "Στείλε μήνυμα για την τάξη και το μάθημα που σε νοιάζει",
      "Η φιλόλογος απαντά στο μήνυμα",
      "Συνεννόηση για εξ΄αποστάσεως συνεδρίες",
    ],
    cta: "Πήγαινε στη φόρμα",
    action: () => scrollTo("communication"),
  },
]);
</script>

<template>
  <section id="instructions" class="scroll-mt-40 bg-sky py-16">
    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
      <h2 class="max-w-3xl font-heading text-4xl text-foreground sm:text-5xl">
        Πώς λειτουργεί το «Μάθε Παιδί μου Αρχαία»
      </h2>
      <p class="mt-3 max-w-2xl text-muted-foreground">
        Τι μπορείς να δεις χωρίς λογαριασμό, τι ξεκλειδώνει η δωρεάν εγγραφή
        και πώς να επικοινωνήσεις με τη διδάσκουσα.
      </p>
      <div id="guide-grid" class="guide-row mt-8 flex flex-col gap-3 lg:min-h-80 lg:flex-row">
        <article
          v-for="tier in tiers"
          :key="tier.key"
          class="guide-card min-w-0 rounded-[10px] p-5"
          :class="[tier.wash, { 'is-open': tier.key === activeKey }]"
          @pointerenter="activeKey = tier.key"
        >
          <div class="mb-3 flex items-center justify-between gap-3">
            <VIcon :name="tier.icon" class="size-6 shrink-0 text-foreground" aria-hidden="true" />
            <p class="rounded-[10px] bg-card px-2.5 py-1 text-sm text-foreground">
              {{ tier.badgeText }}
            </p>
          </div>
          <h3 class="font-heading text-2xl text-foreground">{{ tier.title }}</h3>
          <div class="guide-more">
            <div>
              <p class="pt-3 text-base text-foreground">{{ tier.lead }}</p>
              <ul class="mt-4 space-y-2 text-sm text-foreground">
                <li v-for="item in tier.bullets" :key="item" class="flex items-start gap-2">
                  <VIcon name="bi-check2-circle" class="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden="true" />
                  <span>{{ item }}</span>
                </li>
              </ul>
              <button
                type="button"
                class="mt-6 inline-flex h-11 cursor-pointer items-center rounded-[10px] bg-primary px-4 text-[15px] font-semibold text-primary-foreground transition-[transform,background-color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.97]"
                @click="tier.action()"
              >
                {{ tier.cta }}
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
@media (hover: hover) and (min-width: 1024px) {
  .guide-card {
    flex: 1 1 0%;
    transition: flex-grow 280ms cubic-bezier(0.23, 1, 0.32, 1);
  }

  .guide-card.is-open {
    flex-grow: 2.6;
  }

  .guide-more {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 280ms cubic-bezier(0.23, 1, 0.32, 1);
  }

  .guide-more > div {
    overflow: hidden;
  }

  .guide-card.is-open .guide-more {
    grid-template-rows: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .guide-card,
  .guide-more {
    transition: none;
  }
}
</style>
