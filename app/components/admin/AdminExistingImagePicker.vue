<script setup lang="ts">
import { includesFolded } from '#shared/utils/foldGreekSearch.mjs'
import { toast } from 'vue-sonner'
import UiDialog from '~/components/ui/dialog/Dialog.vue'
import UiDialogPortal from '~/components/ui/dialog/DialogPortal.vue'
import UiDialogOverlay from '~/components/ui/dialog/DialogOverlay.vue'
import UiDialogContent from '~/components/ui/dialog/DialogContent.vue'
import UiDialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import UiDialogFooter from '~/components/ui/dialog/DialogFooter.vue'
import UiDialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import UiDialogDescription from '~/components/ui/dialog/DialogDescription.vue'
import UiButton from '~/components/ui/Button.vue'
import UiInput from '~/components/ui/Input.vue'

type ImageKind = 'subject' | 'chapter' | 'category' | 'article'
type ExistingImage = {
  url: string
  usedBy: { type: ImageKind; id: string; label: string }[]
}

const props = defineProps<{
  open: boolean
  exceptType: ImageKind
  exceptId?: string
}>()

const emit = defineEmits<{
  close: []
  select: [url: string]
}>()

const TYPE_LABEL: Record<ImageKind, string> = {
  subject: 'Μάθημα',
  chapter: 'Κεφάλαιο',
  category: 'Κατηγορία',
  article: 'Άρθρο',
}

const adminFetch = useAdminFetch()
const images = ref<ExistingImage[]>([])
const search = ref('')
const loading = ref(false)
const failed = ref(false)
let loadId = 0

function caption(image: ExistingImage) {
  return image.usedBy
    .map(use => (use.label ? `${TYPE_LABEL[use.type]}: ${use.label}` : TYPE_LABEL[use.type]))
    .join(' · ')
}

const filteredImages = computed(() => {
  if (!search.value) return images.value
  return images.value.filter(image => includesFolded(caption(image), search.value))
})

async function load() {
  const id = ++loadId
  loading.value = true
  failed.value = false
  images.value = []
  try {
    const params = new URLSearchParams()
    if (props.exceptId) {
      params.set('exceptType', props.exceptType)
      params.set('exceptId', props.exceptId)
    }
    const query = params.toString()
    const path = query ? `/api/admin/entity-images?${query}` : '/api/admin/entity-images'
    const res = await adminFetch<{ images: ExistingImage[] }>(path)
    if (id !== loadId) return
    images.value = res.images
  } catch {
    if (id !== loadId) return
    images.value = []
    failed.value = true
    toast.error('Κάτι πήγε στραβά')
  } finally {
    if (id === loadId) loading.value = false
  }
}

watch(() => props.open, (open) => {
  if (!open) {
    loadId += 1
    loading.value = false
    search.value = ''
    return
  }
  void load()
})
</script>

<template>
  <UiDialog :open="props.open" @update:open="(open: boolean) => !open && emit('close')">
    <UiDialogPortal>
      <UiDialogOverlay class="z-60" />
      <UiDialogContent class="z-60 flex max-h-[90vh] max-w-lg flex-col overflow-hidden">
        <UiDialogHeader class="shrink-0">
          <UiDialogTitle>Υπάρχουσες εικόνες</UiDialogTitle>
          <UiDialogDescription class="sr-only">
            Επιλογή εικόνας που χρησιμοποιείται ήδη από μάθημα, κεφάλαιο, κατηγορία ή άρθρο.
          </UiDialogDescription>
        </UiDialogHeader>
        <div v-if="!loading && !failed && images.length" class="relative shrink-0">
          <VIcon name="bi-search" class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <UiInput v-model="search" placeholder="Αναζήτηση..." class="pl-9" />
        </div>
        <div class="min-h-0 overflow-y-auto">
          <p v-if="loading" class="py-8 text-center text-sm text-muted-foreground">Φόρτωση...</p>
          <p v-else-if="failed" class="py-8 text-center text-sm text-muted-foreground">
            Οι εικόνες δεν φορτώθηκαν.
          </p>
          <p v-else-if="!images.length" class="py-8 text-center text-sm text-muted-foreground">
            Δεν υπάρχουν άλλες εικόνες.
          </p>
          <p v-else-if="!filteredImages.length" class="py-8 text-center text-sm text-muted-foreground">
            Δεν βρέθηκαν εικόνες.
          </p>
          <div v-else class="grid grid-cols-2 gap-3">
            <button
              v-for="image in filteredImages"
              :key="image.url"
              type="button"
              class="flex cursor-pointer flex-col gap-2 rounded-xl border border-border bg-card p-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              @click="emit('select', image.url)"
            >
              <img :src="image.url" alt="" class="aspect-square w-full rounded-lg object-cover">
              <span class="line-clamp-3 text-xs text-muted-foreground">{{ caption(image) }}</span>
            </button>
          </div>
        </div>
        <UiDialogFooter class="shrink-0">
          <UiButton type="button" variant="cancel" @click="emit('close')">Ακύρωση</UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialogPortal>
  </UiDialog>
</template>
