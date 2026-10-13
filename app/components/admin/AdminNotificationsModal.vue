<script setup lang="ts">
import { toast } from 'vue-sonner'
import UiButton from '~/components/ui/Button.vue'
import UiDialog from '~/components/ui/dialog/Dialog.vue'
import UiDialogPortal from '~/components/ui/dialog/DialogPortal.vue'
import UiDialogOverlay from '~/components/ui/dialog/DialogOverlay.vue'
import UiDialogContent from '~/components/ui/dialog/DialogContent.vue'
import UiDialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import UiDialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import UiDialogDescription from '~/components/ui/dialog/DialogDescription.vue'
import UiLabel from '~/components/ui/Label.vue'
import { Switch } from '~/components/ui/switch'
import type { AdminNotificationItem, AdminNotificationKind } from '~/types/database'

const PAGE_SIZE = 10

interface NotificationsPage {
  items: AdminNotificationItem[]
  unreadCount: number
  total: number
  page: number
  pageSize: number
}

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: []; refresh: [] }>()

const adminFetch = useAdminFetch()

const kindLabels: Record<AdminNotificationKind, string> = {
  purchase: 'Αγορά',
  download: 'Λήψη',
  rating: 'Αξιολόγηση',
  comment: 'Σχόλιο',
  contact: 'Επικοινωνία',
  article_like: 'Προτίμηση άρθρου',
  article_comment: 'Σχόλιο άρθρου',
}

const loading = ref(false)
const prefsLoading = ref(false)
const prefsOpen = ref(false)
const deletingId = ref<string | null>(null)
const items = ref<AdminNotificationItem[]>([])
const unreadCount = ref(0)
const total = ref(0)
const page = ref(1)

const pageCount = computed(() => Math.max(1, Math.ceil(total.value / PAGE_SIZE)))

const prefs = ref({
  notify_purchase: true,
  notify_download: true,
  notify_rating: true,
  notify_comment: true,
  notify_contact: true,
  notify_article_like: true,
  notify_article_comment: true,
})

async function loadPrefs() {
  prefsLoading.value = true
  try {
    const p = await adminFetch<typeof prefs.value>('/api/admin/notification-preferences')
    prefs.value = { ...prefs.value, ...p }
  } catch {
    toast.error('Δεν ήταν δυνατή η φόρτωση των ειδοποιήσεων.')
  } finally {
    prefsLoading.value = false
  }
}

async function savePrefs() {
  try {
    await adminFetch('/api/admin/notification-preferences', {
      method: 'PUT',
      body: prefs.value,
    })
    page.value = 1
    await loadList()
    emit('refresh')
  } catch {
    toast.error('Δεν ήταν δυνατή η αποθήκευση των προτιμήσεων.')
  }
}

async function loadList() {
  loading.value = true
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await adminFetch<NotificationsPage>('/api/admin/notifications', {
        query: { page: page.value, limit: PAGE_SIZE },
      })
      const nextTotal = res.total ?? 0
      const pages = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE))
      if (page.value > pages) {
        page.value = pages
        continue
      }
      items.value = res.items ?? []
      unreadCount.value = res.unreadCount ?? 0
      total.value = nextTotal
      return
    }
  } catch {
    toast.error('Δεν ήταν δυνατή η φόρτωση των ειδοποιήσεων.')
  } finally {
    loading.value = false
  }
}

watch(
  () => props.open,
  async (open) => {
    if (!open) {
      prefsOpen.value = false
      return
    }
    page.value = 1
    await Promise.all([loadPrefs(), loadList()])
  },
)

function displayName(payload: Record<string, unknown>) {
  const name = typeof payload.user_name === 'string' ? payload.user_name : ''
  const email = typeof payload.user_email === 'string' ? payload.user_email : ''
  return name || email || 'Χρήστης'
}

function lineForKind(item: AdminNotificationItem): string {
  const p = item.payload
  const lesson = typeof p.lesson_title === 'string' ? p.lesson_title : ''
  switch (item.kind) {
    case 'purchase':
      return `Ο/Η ${displayName(p)} αγόρασε "${lesson}".`
    case 'download':
      return `Ο/Η ${displayName(p)} έκανε λήψη του "${lesson}".`
    case 'rating': {
      const r = typeof p.rating === 'number' ? p.rating : ''
      return `Ο/Η ${displayName(p)} αξιολόγησε "${lesson}" (${String(r)}/5).`
    }
    case 'comment': {
      const ex = typeof p.excerpt === 'string' ? p.excerpt : ''
      return `Ο/Η ${displayName(p)} στο "${lesson}": ${ex}`
    }
    case 'article_like': {
      const at = typeof p.article_title === 'string' ? p.article_title : ''
      return `Ο/Η ${displayName(p)} εξέφρασε προτίμηση στο "${at}".`
    }
    case 'article_comment': {
      const at = typeof p.article_title === 'string' ? p.article_title : ''
      const ex = typeof p.excerpt === 'string' ? p.excerpt : ''
      return `Ο/Η ${displayName(p)} στο "${at}": ${ex}`
    }
    case 'contact':
      return ''
    default:
      return item.kind
  }
}

function kindLabel(kind: AdminNotificationKind) {
  return kindLabels[kind]
}

async function markRead(id: string) {
  try {
    await adminFetch(`/api/admin/notifications/${id}/read`, { method: 'POST' })
    await loadList()
    emit('refresh')
  } catch {
    toast.error('Δεν ήταν δυνατή η ενημέρωση της κατάστασης ανάγνωσης.')
  }
}

async function markAllRead() {
  try {
    await adminFetch('/api/admin/notifications/read-all', { method: 'POST' })
    await loadList()
    emit('refresh')
  } catch {
    toast.error('Δεν ήταν δυνατή η ενημέρωση της κατάστασης ανάγνωσης.')
  }
}

async function removeItem(id: string) {
  if (deletingId.value) return
  deletingId.value = id
  try {
    await adminFetch(`/api/admin/notifications/${id}`, { method: 'DELETE' })
    toast.success('Η ειδοποίηση διαγράφηκε.')
    if (items.value.length === 1 && page.value > 1) page.value -= 1
    await loadList()
    emit('refresh')
  } catch {
    toast.error('Δεν ήταν δυνατή η διαγραφή της ειδοποίησης.')
  } finally {
    deletingId.value = null
  }
}

function goToPage(next: number) {
  if (loading.value || next < 1 || next > pageCount.value || next === page.value) return
  page.value = next
  void loadList()
}

function togglePref(
  key:
    | 'notify_purchase'
    | 'notify_download'
    | 'notify_rating'
    | 'notify_comment'
    | 'notify_contact'
    | 'notify_article_like'
    | 'notify_article_comment',
  v: boolean,
) {
  prefs.value[key] = v
  void savePrefs()
}
</script>

<template>
  <UiDialog :open="props.open" @update:open="(v: boolean) => !v && emit('close')">
    <UiDialogPortal>
      <UiDialogOverlay />
      <UiDialogContent class="flex! max-h-[min(85vh,40rem)] max-w-lg flex-col gap-0 overflow-hidden p-0">
        <UiDialogHeader class="shrink-0 gap-3 border-b border-border px-6 py-4">
          <div class="flex flex-wrap items-start justify-between gap-3">
            <div class="min-w-0">
              <UiDialogTitle>Ειδοποιήσεις</UiDialogTitle>
              <UiDialogDescription class="sr-only">
                Δραστηριότητα διαχειριστή και μηνύματα φόρμας επικοινωνίας.
              </UiDialogDescription>
              <p v-if="prefsOpen" class="text-xs text-muted-foreground">
                Εμφάνιση στην εφαρμογή
              </p>
              <p v-else class="text-xs text-muted-foreground">
                {{ `${unreadCount} μη αναγνωσμένα` }}
              </p>
            </div>
            <div class="flex shrink-0 items-center gap-1">
              <UiButton
                v-if="prefsOpen"
                variant="ghost"
                size="sm"
                class="text-xs"
                @click="prefsOpen = false"
              >
                <VIcon name="bi-arrow-left" aria-hidden="true" />
                Πίσω
              </UiButton>
              <template v-else>
                <UiButton
                  v-if="unreadCount > 0"
                  variant="outline"
                  size="sm"
                  class="text-xs"
                  @click="markAllRead"
                >
                  Σήμανση όλων ως αναγνωσμένων
                </UiButton>
                <UiButton
                  variant="ghost"
                  size="icon"
                  class="size-9"
                  aria-label="Ρυθμίσεις ειδοποιήσεων"
                  @click="prefsOpen = true"
                >
                  <VIcon name="bi-gear" aria-hidden="true" />
                </UiButton>
              </template>
            </div>
          </div>
        </UiDialogHeader>

        <div class="min-h-0 overflow-y-auto overscroll-contain px-6 py-4">
          <div v-if="prefsOpen" class="space-y-3">
            <div v-if="prefsLoading" class="text-xs text-muted-foreground">Φόρτωση...</div>
            <template v-else>
              <div class="flex items-center justify-between gap-3">
                <UiLabel class="text-sm">Αγορές</UiLabel>
                <Switch
                  class="cursor-pointer"
                  :model-value="prefs.notify_purchase"
                  @update:model-value="(v: boolean) => togglePref('notify_purchase', v)"
                />
              </div>
              <div class="flex items-center justify-between gap-3">
                <UiLabel class="text-sm">Λήψεις</UiLabel>
                <Switch
                  class="cursor-pointer"
                  :model-value="prefs.notify_download"
                  @update:model-value="(v: boolean) => togglePref('notify_download', v)"
                />
              </div>
              <div class="flex items-center justify-between gap-3">
                <UiLabel class="text-sm">Αξιολογήσεις</UiLabel>
                <Switch
                  class="cursor-pointer"
                  :model-value="prefs.notify_rating"
                  @update:model-value="(v: boolean) => togglePref('notify_rating', v)"
                />
              </div>
              <div class="flex items-center justify-between gap-3">
                <UiLabel class="text-sm">Σχόλια</UiLabel>
                <Switch
                  class="cursor-pointer"
                  :model-value="prefs.notify_comment"
                  @update:model-value="(v: boolean) => togglePref('notify_comment', v)"
                />
              </div>
              <div class="flex items-center justify-between gap-3">
                <UiLabel class="text-sm">Φόρμα επικοινωνίας</UiLabel>
                <Switch
                  class="cursor-pointer"
                  :model-value="prefs.notify_contact"
                  @update:model-value="(v: boolean) => togglePref('notify_contact', v)"
                />
              </div>
              <div class="flex items-center justify-between gap-3">
                <UiLabel class="text-sm">Προτιμήσεις σε άρθρα</UiLabel>
                <Switch
                  class="cursor-pointer"
                  :model-value="prefs.notify_article_like"
                  @update:model-value="(v: boolean) => togglePref('notify_article_like', v)"
                />
              </div>
              <div class="flex items-center justify-between gap-3">
                <UiLabel class="text-sm">Σχόλια σε άρθρα</UiLabel>
                <Switch
                  class="cursor-pointer"
                  :model-value="prefs.notify_article_comment"
                  @update:model-value="(v: boolean) => togglePref('notify_article_comment', v)"
                />
              </div>
            </template>
          </div>

          <template v-else>
            <div v-if="loading" class="py-8 text-center text-sm text-muted-foreground">
              Φόρτωση...
            </div>
            <p v-else-if="!items.length" class="py-8 text-center text-sm text-muted-foreground">
              Δεν υπάρχουν ειδοποιήσεις ακόμα.
            </p>
            <ul v-else class="space-y-2">
              <li
                v-for="item in items"
                :key="item.id"
                class="rounded-lg border border-border p-3 text-sm transition-colors"
                :class="item.read ? 'bg-card opacity-80' : 'bg-primary/5 border-primary/20'"
              >
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0 flex-1">
                    <span class="text-xs font-medium text-primary">{{ kindLabel(item.kind) }}</span>
                    <template v-if="item.kind === 'contact'">
                      <p class="mt-1 font-medium text-foreground break-all">
                        {{ String(item.payload.email ?? '') }}
                      </p>
                      <p v-if="item.payload.name" class="mt-1 text-foreground">
                        {{ String(item.payload.name) }}
                      </p>
                      <p v-if="item.payload.phone || item.payload.gradeName" class="mt-1 text-muted-foreground">
                        {{ [item.payload.phone, item.payload.gradeName].filter(Boolean).join(' · ') }}
                      </p>
                      <p class="mt-1 text-foreground wrap-break-word whitespace-pre-wrap">
                        {{ String(item.payload.message ?? '') }}
                      </p>
                    </template>
                    <p v-else class="mt-1 text-foreground wrap-break-word whitespace-pre-wrap">
                      {{ lineForKind(item) }}
                    </p>
                    <p class="mt-1 text-xs text-muted-foreground">
                      {{ new Date(item.created_at).toLocaleString('el-GR') }}
                    </p>
                  </div>
                  <div class="flex shrink-0 items-center gap-1">
                    <UiButton
                      v-if="!item.read"
                      variant="ghost"
                      size="sm"
                      class="text-xs"
                      @click="markRead(item.id)"
                    >
                      Ανάγνωση
                    </UiButton>
                    <UiButton
                      variant="ghost"
                      size="icon"
                      class="size-8 text-destructive hover:text-destructive"
                      aria-label="Διαγραφή ειδοποίησης"
                      :disabled="deletingId === item.id"
                      @click="removeItem(item.id)"
                    >
                      <VIcon name="bi-trash" class="size-4" aria-hidden="true" />
                    </UiButton>
                  </div>
                </div>
              </li>
            </ul>
          </template>
        </div>

        <div
          v-if="!prefsOpen && pageCount > 1"
          class="flex shrink-0 items-center justify-between gap-2 border-t border-border px-6 py-3"
        >
          <UiButton
            variant="outline"
            size="sm"
            class="text-xs"
            :disabled="page <= 1 || loading"
            @click="goToPage(page - 1)"
          >
            Προηγούμενη
          </UiButton>
          <span class="text-xs text-muted-foreground tabular-nums">
            {{ `Σελίδα ${page} από ${pageCount}` }}
          </span>
          <UiButton
            variant="outline"
            size="sm"
            class="text-xs"
            :disabled="page >= pageCount || loading"
            @click="goToPage(page + 1)"
          >
            Επόμενη
          </UiButton>
        </div>
      </UiDialogContent>
    </UiDialogPortal>
  </UiDialog>
</template>
