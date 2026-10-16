<script setup lang="ts">
import { toast } from 'vue-sonner'
import UiDialog from '~/components/ui/dialog/Dialog.vue'
import UiDialogPortal from '~/components/ui/dialog/DialogPortal.vue'
import UiDialogOverlay from '~/components/ui/dialog/DialogOverlay.vue'
import UiDialogContent from '~/components/ui/dialog/DialogContent.vue'
import UiDialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import UiDialogClose from '~/components/ui/dialog/DialogClose.vue'

const props = defineProps<{
  open: boolean
  title: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  shared: []
}>()

const url = ref('')
const copied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | null = null

watch(() => props.open, (open) => {
  if (!open) return
  copied.value = false
  if (import.meta.client) url.value = window.location.href
}, { immediate: true })

function close() {
  emit('update:open', false)
}

function shareViaNetwork() {
  emit('shared')
  close()
}

const networks = computed(() => {
  const shareUrl = encodeURIComponent(url.value)
  const text = encodeURIComponent(props.title)
  return [
    {
      name: 'WhatsApp',
      icon: 'bi-whatsapp',
      class: 'bg-[#25D366] text-white',
      href: `https://wa.me/?text=${text}%20${shareUrl}`,
    },
    {
      name: 'Facebook',
      icon: 'bi-facebook',
      class: 'bg-[#1877F2] text-white',
      href: `https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`,
    },
    {
      name: 'X',
      icon: 'bi-twitter',
      class: 'bg-foreground text-background',
      href: `https://twitter.com/intent/tweet?url=${shareUrl}&text=${text}`,
    },
    {
      name: 'Email',
      icon: 'bi-envelope',
      class: 'bg-secondary text-foreground',
      href: `mailto:?subject=${text}&body=${shareUrl}`,
    },
  ]
})

async function copyLink() {
  try {
    await navigator.clipboard.writeText(url.value)
    copied.value = true
    if (copiedTimer) clearTimeout(copiedTimer)
    copiedTimer = setTimeout(() => {
      copied.value = false
    }, 1600)
    toast.success('Ο σύνδεσμος αντιγράφηκε στο πρόχειρο.')
    emit('shared')
  } catch {
    toast.error('Κάτι πήγε στραβά')
  }
}

onBeforeUnmount(() => {
  if (copiedTimer) clearTimeout(copiedTimer)
})
</script>

<template>
  <UiDialog :open="open" @update:open="emit('update:open', $event)">
    <UiDialogPortal>
      <UiDialogOverlay />
      <UiDialogContent class="w-[min(32rem,calc(100vw-2rem))] max-w-none gap-5 overflow-hidden p-6 *:min-w-0 sm:rounded-3xl">
        <div class="flex min-w-0 items-center justify-between gap-3">
          <UiDialogTitle class="font-heading">Κοινοποίηση</UiDialogTitle>
          <UiDialogClose
            class="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            aria-label="Κλείσιμο"
          >
            <VIcon name="bi-x" class="size-4" aria-hidden="true" />
          </UiDialogClose>
        </div>
        <div class="flex min-w-0 items-center gap-2 rounded-full border border-border bg-secondary py-1.5 pr-1.5 pl-4">
          <span class="min-w-0 flex-1 truncate text-sm text-foreground">{{ url }}</span>
          <button
            type="button"
            class="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-foreground transition-colors hover:bg-card"
            :aria-label="copied ? 'Ο σύνδεσμος αντιγράφηκε' : 'Αντιγραφή συνδέσμου'"
            @click="copyLink"
          >
            <VIcon :name="copied ? 'bi-check2-circle' : 'bi-clipboard'" class="size-4" aria-hidden="true" />
          </button>
        </div>
        <div class="grid min-w-0 grid-cols-4 gap-3 pt-1">
          <a
            v-for="network in networks"
            :key="network.name"
            :href="network.href"
            :target="network.href.startsWith('mailto:') ? undefined : '_blank'"
            rel="noopener noreferrer"
            class="flex min-w-0 cursor-pointer flex-col items-center gap-2 text-center"
            @click="shareViaNetwork"
          >
            <span
              class="flex size-12 items-center justify-center rounded-full"
              :class="network.class"
            >
              <VIcon :name="network.icon" class="size-5" aria-hidden="true" />
            </span>
            <span class="text-xs font-medium text-muted-foreground">{{ network.name }}</span>
          </a>
        </div>
      </UiDialogContent>
    </UiDialogPortal>
  </UiDialog>
</template>
