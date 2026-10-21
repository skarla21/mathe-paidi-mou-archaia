<script setup lang="ts">
import { SITE_DESCRIPTION, SITE_TITLE } from '#shared/utils/siteMeta.mjs'

const route = useRoute()
useHead(() => describedHead(SITE_TITLE, SITE_DESCRIPTION, [], '/'))

const sections = [
  { id: 'welcome', label: 'Καλώς ήρθατε' },
  { id: 'information', label: 'Πληροφορίες' },
  { id: 'grades', label: 'Τάξεις' },
  { id: 'instructions', label: 'Οδηγίες χρήσης' },
  { id: 'categories', label: 'Κατηγορίες' },
  { id: 'articles', label: 'Άρθρα' },
  { id: 'communication', label: 'Επικοινωνία' },
]

function scrollTo(id: string) {
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

onMounted(() => {
  if (!import.meta.client) return
  const { revealSection, revealStagger, animateHero } = useGsapReveal()
  nextTick(() => {
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

  const hash = route.hash.replace('#', '')
  if (hash) requestAnimationFrame(() => scrollTo(hash))
})
</script>

<template>
  <div>
    <HomeHero />
    <HomeInfo />
    <HomeGrades />
    <HomeGuide />
    <HomeExtras />
    <HomeContact />
  </div>
</template>
