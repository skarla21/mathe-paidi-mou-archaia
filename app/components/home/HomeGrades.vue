<script setup lang="ts">
const { grades, failed, ensure, subjectsForGrade } = useCatalogNav()

const washes = ['bg-header-bg', 'bg-secondary', 'bg-accent', 'bg-amethyst-fixed', 'bg-muted']

function wash(index: number) {
  return washes[index % washes.length]!
}

function subjectLine(gradeId: string) {
  const names = subjectsForGrade(gradeId).map((subject) => subject.name)
  return names.length ? names.join(', ') : 'Θα εμφανιστούν μόλις προστεθούν'
}

await ensure()
</script>

<template>
  <section id="grades" class="scroll-mt-40 py-16">
    <div class="mx-auto mb-10 max-w-7xl px-4 sm:px-6 lg:px-12">
      <h2 class="font-heading text-4xl text-foreground sm:text-5xl">Διάλεξε την τάξη σου</h2>
      <p class="mt-3 max-w-xl text-muted-foreground">Σημειώσεις και κεφάλαια ανά βαθμίδα, όπως τα έχει οργανώσει η διδάσκουσα.</p>
    </div>

    <div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-12">
      <p v-if="failed && grades.length === 0" class="rounded-[10px] border border-dashed border-border bg-card p-8 text-center text-muted-foreground">
        Οι τάξεις δεν φορτώθηκαν. Δοκίμασε ξανά σε λίγο.
      </p>
      <p v-else-if="grades.length === 0" class="rounded-[10px] border border-dashed border-border bg-card p-8 text-center">
        <span class="block font-heading text-lg">Δεν υπάρχουν ακόμη διαθέσιμες τάξεις.</span>
        <span class="mt-1 block text-sm text-muted-foreground">Οι τάξεις θα εμφανίζονται εδώ μόλις προστεθούν.</span>
      </p>
      <div v-else id="grades-grid" class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <article v-for="(grade, index) in grades" :key="grade.id" class="flex">
          <NuxtLink
            :to="`/${grade.slug}`"
            class="flex flex-1 flex-col rounded-[10px] p-5 text-foreground transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:scale-[0.97]"
            :class="wash(index)"
          >
            <p class="w-fit rounded-[10px] bg-card px-2.5 py-1 text-sm">Τάξη</p>
            <h3 class="mt-4 font-heading text-3xl">{{ grade.name }}</h3>
            <p class="mt-3 text-sm leading-relaxed">
              <span class="font-semibold">Μαθήματα: </span>{{ subjectLine(grade.id) }}
            </p>
            <div class="mt-auto pt-6">
              <span class="inline-flex h-10 w-fit items-center gap-2 rounded-[10px] bg-primary px-4 text-[15px] font-semibold text-primary-foreground">
                Άνοιγμα ύλης
                <VIcon name="bi-arrow-right" class="size-4" aria-hidden="true" />
              </span>
            </div>
          </NuxtLink>
        </article>
      </div>
    </div>
  </section>
</template>
