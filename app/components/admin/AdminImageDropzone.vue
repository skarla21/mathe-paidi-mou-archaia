<script setup lang="ts">
import {
  dialogPasteHost,
  pasteClipboardImage,
  pointerLeftDropzone,
} from '#shared/utils/clipboardImage.mjs'
import UiAlertDialogAction from '~/components/ui/alert-dialog/AlertDialogAction.vue'
import UiAlertDialogCancel from '~/components/ui/alert-dialog/AlertDialogCancel.vue'
import UiAlertDialogContent from '~/components/ui/alert-dialog/AlertDialogContent.vue'
import UiAlertDialogDescription from '~/components/ui/alert-dialog/AlertDialogDescription.vue'
import UiAlertDialogFooter from '~/components/ui/alert-dialog/AlertDialogFooter.vue'
import UiAlertDialogHeader from '~/components/ui/alert-dialog/AlertDialogHeader.vue'
import UiAlertDialogOverlay from '~/components/ui/alert-dialog/AlertDialogOverlay.vue'
import UiAlertDialogPortal from '~/components/ui/alert-dialog/AlertDialogPortal.vue'
import UiAlertDialogRoot from '~/components/ui/alert-dialog/AlertDialogRoot.vue'
import UiAlertDialogTitle from '~/components/ui/alert-dialog/AlertDialogTitle.vue'
import UiButton from '~/components/ui/Button.vue'
import UiLabel from '~/components/ui/Label.vue'
import UiProgress from '~/components/ui/Progress.vue'

const props = defineProps<{
  modelValue: string
  uploading: boolean
  progress: number
  statusLabel: string
  disabled: boolean
  preserved: boolean
  persisted: boolean
}>()

const emit = defineEmits<{
  file: [file: File]
  clear: []
}>()

const root = ref<HTMLElement | null>(null)
const zone = ref<HTMLElement | null>(null)
const dragActive = ref(false)
const fileInput = ref<HTMLInputElement | null>(null)
const busy = computed(() => props.disabled || props.uploading)
const confirmOpen = ref(false)
let pasteHost: HTMLElement | null = null

function requestClear() {
  if (busy.value) return
  if (props.persisted) {
    confirmOpen.value = true
    return
  }
  emit('clear')
}

function confirmClear() {
  confirmOpen.value = false
  emit('clear')
}

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files?.[0]) emit('file', input.files[0])
  input.value = ''
}

function onDrop(e: DragEvent) {
  e.preventDefault()
  dragActive.value = false
  const file = e.dataTransfer?.files?.[0]
  if (file) emit('file', file)
}

function onDragOver(e: DragEvent) {
  e.preventDefault()
  dragActive.value = true
}

function onDragLeave(event: DragEvent) {
  if (!pointerLeftDropzone(zone.value, event.relatedTarget)) return
  dragActive.value = false
}

function onPaste(event: ClipboardEvent) {
  const file = pasteClipboardImage(event.clipboardData, {
    busy: busy.value,
    target: event.target,
    zone: zone.value,
  })
  if (!file) return
  event.preventDefault()
  event.stopImmediatePropagation()
  emit('file', file)
}

onMounted(() => {
  const dialog = dialogPasteHost(root.value)
  if (!(dialog instanceof HTMLElement)) return
  pasteHost = dialog
  dialog.addEventListener('paste', onPaste)
})

onUnmounted(() => {
  pasteHost?.removeEventListener('paste', onPaste)
  pasteHost = null
})
</script>

<template>
  <div ref="root" class="space-y-1.5">
    <UiLabel>Εικόνα</UiLabel>
    <div
      ref="zone"
      class="rounded-lg border-2 border-dashed p-4 text-center transition-colors"
      :class="dragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'"
      @drop="onDrop"
      @dragover="onDragOver"
      @dragleave="onDragLeave"
    >
      <template v-if="modelValue">
        <div class="relative">
          <img :src="modelValue" alt="" class="h-auto max-h-80 w-full rounded-md object-contain">
          <button
            type="button"
            class="absolute top-2 right-2 z-10 flex size-8 cursor-pointer appearance-none items-center justify-center rounded-full bg-foreground text-background shadow-md ring-2 ring-card transition-colors hover:bg-[color-mix(in_oklab,var(--color-foreground),black_18%)] disabled:pointer-events-none disabled:opacity-70"
            aria-label="Αφαίρεση"
            :disabled="busy"
            @click.stop="requestClear"
          >
            <VIcon name="bi-x" class="size-5" aria-hidden="true" />
          </button>
        </div>
        <UiButton type="button" variant="outline" size="sm" class="mt-3" :disabled="busy" @click="fileInput?.click()">
          Επιλογή αρχείου
        </UiButton>
        <p class="mt-2 text-xs text-muted-foreground">Σύρε νέα εικόνα για αντικατάσταση, ή κάνε κλικ για επιλογή ή κάνε paste</p>
      </template>
      <div v-else class="flex flex-col items-center gap-2">
        <VIcon name="bi-cloud-arrow-up" class="size-8 text-muted-foreground" />
        <p class="text-sm font-medium">Σύρε και άφησε εικόνα εδώ, ή κάνε κλικ για επιλογή ή κάνε paste</p>
        <p class="text-xs text-muted-foreground">Εικόνες μέγ. 20MB</p>
        <p v-if="preserved" class="max-w-sm text-xs text-muted-foreground">
          Η αποθηκευμένη εικόνα δεν προέρχεται από μεταφόρτωση και δεν εμφανίζεται.
        </p>
        <UiButton v-if="preserved" type="button" variant="ghost" size="sm" :disabled="busy" @click="requestClear">
          Αφαίρεση εικόνας
        </UiButton>
        <UiButton type="button" variant="outline" size="sm" :disabled="busy" @click="fileInput?.click()">
          Επιλογή αρχείου
        </UiButton>
      </div>
      <input ref="fileInput" type="file" accept="image/jpeg,image/png" class="hidden" @change="onFileSelect">
      <UiProgress v-if="uploading" :model-value="progress" class="mt-3 h-2" />
      <p v-if="uploading" class="mt-2 text-xs text-muted-foreground" aria-live="polite">{{ statusLabel }}</p>
    </div>
  </div>
  <UiAlertDialogRoot v-model:open="confirmOpen">
    <UiAlertDialogPortal>
      <UiAlertDialogOverlay class="z-60" />
      <UiAlertDialogContent class="z-60">
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>Αφαίρεση εικόνας</UiAlertDialogTitle>
          <UiAlertDialogDescription>
            Η εικόνα θα αφαιρεθεί αμέσως. Το κλείσιμο της φόρμας δεν την επαναφέρει.
          </UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel>
            <UiButton type="button" variant="cancel">Ακύρωση</UiButton>
          </UiAlertDialogCancel>
          <UiAlertDialogAction as-child>
            <UiButton type="button" variant="destructive" @click="confirmClear">
              Αφαίρεση
            </UiButton>
          </UiAlertDialogAction>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialogPortal>
  </UiAlertDialogRoot>
</template>
