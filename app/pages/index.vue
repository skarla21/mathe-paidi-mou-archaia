<script setup lang="ts">
const route = useRoute()
useHead({ title: 'Μάθε Παιδί Μου Αρχαία — Προετοιμασία για Πανελλήνιες' })

const sections = [
  { id: 'welcome', label: 'Καλώς ήρθατε', icon: 'bi-stars' },
  { id: 'information', label: 'Πληροφορίες', icon: 'bi-mortarboard' },
  { id: 'grades', label: 'Τάξεις', icon: 'bi-journal-bookmark' },
  { id: 'instructions', label: 'Οδηγίες χρήσης', icon: 'bi-compass' },
  { id: 'categories', label: 'Κατηγορίες', icon: 'bi-collection' },
  { id: 'articles', label: 'Άρθρα', icon: 'bi-newspaper' },
  { id: 'communication', label: 'Επικοινωνία', icon: 'bi-chat-dots' },
]

const activeSection = ref('welcome')
const visibleHeight = new Map<string, number>()
let observer: IntersectionObserver | null = null

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

onMounted(() => {
  if (!import.meta.client) return
  const { revealSection, revealStagger, animateHero, animateBadge } = useGsapReveal()
  nextTick(() => {
    void animateBadge('#hero-badge')
    void animateHero('#hero-title', '#hero-lead', '#hero-cta')
    for (const section of sections) {
      if (section.id === 'welcome') continue
      void revealSection(`#${section.id}`)
    }
    void revealStagger('#info-grid', 'article')
    void revealStagger('#grades-grid', 'article')
    void revealStagger('#guide-grid', 'article')
    void revealStagger('#categories-grid', 'article')
    void revealStagger('#articles-grid', 'article')
  })

  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      visibleHeight.set(entry.target.id, entry.isIntersecting ? entry.intersectionRect.height : 0)
    }
    let bestId = ''
    let best = 0
    for (const section of sections) {
      const height = visibleHeight.get(section.id) ?? 0
      if (height > best) {
        best = height
        bestId = section.id
      }
    }
    if (bestId) activeSection.value = bestId
  }, {
    threshold: [0, 0.05, 0.1, 0.2, 0.35, 0.5, 0.75, 1],
    rootMargin: '-88px 0px -10% 0px',
  })

  for (const section of sections) {
    const el = document.getElementById(section.id)
    if (el) observer.observe(el)
  }

  const hash = route.hash.replace('#', '')
  if (hash) requestAnimationFrame(() => scrollTo(hash))
})

onBeforeUnmount(() => observer?.disconnect())
</script>

<template>
  <div>
    <HomeRoadmap :sections="sections" :active="activeSection" @select="scrollTo" />
    <div class="sticky top-20 z-30 border-b border-border bg-background/90 backdrop-blur xl:hidden">
      <div class="flex gap-2 overflow-x-auto px-4 py-2">
        <button
          v-for="section in sections"
          :key="section.id"
          type="button"
          class="shrink-0 rounded-full px-3 py-1.5 text-xs font-bold transition-colors"
          :class="activeSection === section.id ? 'bg-primary text-primary-foreground' : 'bg-secondary text-muted-foreground'"
          @click="scrollTo(section.id)"
        >
          {{ section.label }}
        </button>
      </div>
    </div>
    <div class="relative mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-12 xl:pl-28">
      <HomeHero />
      <HomeInfo />
      <HomeGrades />
      <HomeGuide />
      <HomeExtras />
      <HomeContact />
    </div>
  </div>
</template>
