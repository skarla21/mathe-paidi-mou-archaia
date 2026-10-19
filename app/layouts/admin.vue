<script setup lang="ts">
import 'vue-sonner/style.css'
import { Toaster } from 'vue-sonner'
import { NuxtLink } from '#components'
import { resetAdminMainScroll } from '#shared/utils/adminShell.mjs'
import AdminNotificationsModal from '~/components/admin/AdminNotificationsModal.vue'
import UiBadge from '~/components/ui/Badge.vue'

const route = useRoute()
useHead({
  meta: [{ name: 'description', content: 'Διαχείριση του διδακτικού υλικού.' }],
})
const adminFetch = useAdminFetch()
const mainEl = ref<HTMLElement | null>(null)
const mobileMenuOpen = ref(false)

watch(() => route.path, () => {
  mobileMenuOpen.value = false
  resetAdminMainScroll(mainEl.value)
})

const notificationsOpen = ref(false)
const unreadCount = ref(0)

const badgeText = computed(() => (unreadCount.value > 9 ? '9+' : String(unreadCount.value)))

async function fetchUnreadCount() {
  try {
    const res = await adminFetch<{ unreadCount: number }>('/api/admin/notifications', {
      query: { summary: '1' },
    })
    unreadCount.value = res.unreadCount ?? 0
  } catch {
    /* ignore */
  }
}

onMounted(() => {
  fetchUnreadCount()
  void adminFetch('/api/admin/uploads/reap', { method: 'POST' }).catch(() => {})
  if (import.meta.client) {
    const id = window.setInterval(fetchUnreadCount, 60_000)
    onUnmounted(() => clearInterval(id))
  }
})

watch(notificationsOpen, (open) => {
  if (open) fetchUnreadCount()
})

const contentLinks = computed(() => [
  { to: '/admin/grades', label: 'Τάξεις', icon: 'bi-mortarboard' },
  { to: '/admin/subjects', label: 'Μαθήματα', icon: 'bi-journal-text' },
  { to: '/admin/chapters', label: 'Κεφάλαια', icon: 'bi-journal-bookmark' },
  { to: '/admin/categories', label: 'Κατηγορίες', icon: 'bi-folder' },
  { to: '/admin/lessons', label: 'Υλικό', icon: 'bi-list-check' },
])

const peopleLinks = computed(() => [
  { to: '/admin/users', label: 'Χρήστες', icon: 'bi-people' },
  { to: '/admin/downloads', label: 'Λήψεις', icon: 'bi-download' },
  { to: '/admin/purchases', label: 'Αγορές', icon: 'bi-cart' },
])

const publishingLinks = computed(() => [
  { to: '/admin/articles', label: 'Άρθρα', icon: 'bi-newspaper' },
])

function isActive(to: string) {
  return route.path === to
}

function onNotificationsRefresh() {
  fetchUnreadCount()
}
</script>

<template>
  <div class="flex h-dvh flex-col overflow-hidden bg-muted/30">
    <Toaster />
    <AuthModal />
    <EditProfileModal />
    <AdminNotificationsModal
      :open="notificationsOpen"
      @close="notificationsOpen = false"
      @refresh="onNotificationsRefresh"
    />

    <!-- Mobile top bar -->
    <header class="flex shrink-0 items-center gap-2 border-b border-border/60 bg-card px-4 py-3 md:hidden">
      <NuxtLink to="/admin" class="font-heading font-semibold text-lg flex-1 min-w-0">Διαχείριση</NuxtLink>
      <button
        type="button"
        class="relative p-2 rounded-md hover:bg-muted shrink-0 cursor-pointer"
        aria-label="Άνοιγμα ειδοποιήσεων"
        @click="notificationsOpen = true"
      >
        <VIcon name="bi-bell" class="size-5 text-foreground" />
        <UiBadge
          v-if="unreadCount > 0"
          variant="destructive"
          class="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-0.5 flex items-center justify-center rounded-full p-0 text-[10px] leading-none border-0"
        >
          {{ badgeText }}
        </UiBadge>
      </button>
      <button
        class="p-1 rounded-md hover:bg-muted shrink-0"
        :aria-label="mobileMenuOpen ? 'Κλείσιμο μενού πλοήγησης' : 'Άνοιγμα μενού πλοήγησης'"
        @click="mobileMenuOpen = !mobileMenuOpen"
      >
        <VIcon :name="mobileMenuOpen ? 'bi-x' : 'bi-list'" class="size-5" />
      </button>
    </header>

    <!-- Mobile drawer -->
    <div v-if="mobileMenuOpen" class="min-h-0 flex-1 space-y-1 overflow-y-auto border-b border-border/60 bg-card px-4 py-3 md:hidden">
      <NuxtLink
        to="/admin"
        class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-heading hover:bg-muted"
        :class="isActive('/admin') ? 'bg-primary/10 text-primary font-medium' : ''"
        @click="mobileMenuOpen = false"
      >
        <VIcon name="bi-bar-chart-line" class="size-4" />
        Επισκόπηση
      </NuxtLink>
      <p class="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Περιεχόμενο</p>
      <NuxtLink
        v-for="link in contentLinks"
        :key="link.to"
        :to="link.to"
        class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-heading hover:bg-muted"
        :class="isActive(link.to) ? 'bg-primary/10 text-primary font-medium' : ''"
        @click="mobileMenuOpen = false"
      >
        <VIcon :name="link.icon" class="size-4" />
        {{ link.label }}
      </NuxtLink>
      <p class="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Χρήστες</p>
      <NuxtLink
        v-for="link in peopleLinks"
        :key="link.to"
        :to="link.to"
        class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-heading hover:bg-muted"
        :class="isActive(link.to) ? 'bg-primary/10 text-primary font-medium' : ''"
        @click="mobileMenuOpen = false"
      >
        <VIcon :name="link.icon" class="size-4" />
        {{ link.label }}
      </NuxtLink>
      <p class="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Δημοσιεύσεις</p>
      <NuxtLink
        v-for="link in publishingLinks"
        :key="link.to"
        :to="link.to"
        class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-heading hover:bg-muted"
        :class="isActive(link.to) ? 'bg-primary/10 text-primary font-medium' : ''"
        @click="mobileMenuOpen = false"
      >
        <VIcon :name="link.icon" class="size-4" />
        {{ link.label }}
      </NuxtLink>
      <NuxtLink
        to="/"
        class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-heading hover:bg-muted"
        @click="mobileMenuOpen = false"
      >
        <VIcon name="bi-arrow-left" class="size-4" />
        Πίσω στην εφαρμογή
      </NuxtLink>
    </div>

    <!-- Desktop layout -->
    <div class="min-h-0 flex-1" :class="mobileMenuOpen ? 'hidden md:flex' : 'flex'">
      <aside class="hidden h-full min-h-0 w-56 shrink-0 flex-col border-r border-border/60 bg-card md:flex">
        <div class="flex shrink-0 items-center justify-between gap-2 border-b border-border/60 p-4">
          <NuxtLink to="/admin" class="font-heading font-semibold text-lg flex items-center gap-2 min-w-0">
            <VIcon name="bi-shield-check" class="size-5 text-primary shrink-0" />
            <span class="truncate">Διαχείριση</span>
          </NuxtLink>
          <button
            type="button"
            class="relative p-2 rounded-md hover:bg-muted shrink-0 cursor-pointer"
            aria-label="Άνοιγμα ειδοποιήσεων"
            @click="notificationsOpen = true"
          >
            <VIcon name="bi-bell" class="size-5 text-foreground" />
            <UiBadge
              v-if="unreadCount > 0"
              variant="destructive"
              class="absolute -top-0.5 -right-0.5 min-w-[1.1rem] h-[1.1rem] px-0.5 flex items-center justify-center rounded-full p-0 text-[10px] leading-none border-0"
            >
              {{ badgeText }}
            </UiBadge>
          </button>
        </div>
        <nav aria-label="Πλοήγηση διαχείρισης" class="min-h-0 flex-1 space-y-4 overflow-y-auto p-2">
          <div>
            <NuxtLink
              to="/admin"
              class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-heading hover:bg-muted transition-colors"
              :class="isActive('/admin') ? 'bg-primary/10 text-primary font-medium' : ''"
            >
              <VIcon name="bi-bar-chart-line" class="size-4" />
              Επισκόπηση
            </NuxtLink>
          </div>
          <div>
            <p class="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Περιεχόμενο</p>
            <NuxtLink
              v-for="link in contentLinks"
              :key="link.to"
              :to="link.to"
              class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-heading hover:bg-muted transition-colors"
              :class="isActive(link.to) ? 'bg-primary/10 text-primary font-medium' : ''"
            >
              <VIcon :name="link.icon" class="size-4" />
              {{ link.label }}
            </NuxtLink>
          </div>
          <div>
            <p class="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Χρήστες</p>
            <NuxtLink
              v-for="link in peopleLinks"
              :key="link.to"
              :to="link.to"
              class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-heading hover:bg-muted transition-colors"
              :class="isActive(link.to) ? 'bg-primary/10 text-primary font-medium' : ''"
            >
              <VIcon :name="link.icon" class="size-4" />
              {{ link.label }}
            </NuxtLink>
          </div>
          <div>
            <p class="px-3 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wider">Δημοσιεύσεις</p>
            <NuxtLink
              v-for="link in publishingLinks"
              :key="link.to"
              :to="link.to"
              class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-heading hover:bg-muted transition-colors"
              :class="isActive(link.to) ? 'bg-primary/10 text-primary font-medium' : ''"
            >
              <VIcon :name="link.icon" class="size-4" />
              {{ link.label }}
            </NuxtLink>
          </div>
        </nav>
        <div class="shrink-0 border-t border-border/60 p-2">
          <NuxtLink to="/" class="flex items-center gap-2.5 px-3 py-2 rounded-md text-sm font-heading hover:bg-muted transition-colors">
            <VIcon name="bi-arrow-left" class="size-4" />
            Πίσω στην εφαρμογή
          </NuxtLink>
        </div>
      </aside>
      <main ref="mainEl" class="min-h-0 flex-1 overflow-y-auto p-6">
        <slot />
      </main>
    </div>
  </div>
</template>
