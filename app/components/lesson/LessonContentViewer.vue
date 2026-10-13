<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import LessonPdfViewer from '~/components/lesson/PdfViewer.vue'
import UiButton from '~/components/ui/Button.vue'
import UiDialog from '~/components/ui/dialog/Dialog.vue'
import UiDialogClose from '~/components/ui/dialog/DialogClose.vue'
import UiDialogContent from '~/components/ui/dialog/DialogContent.vue'
import UiDialogDescription from '~/components/ui/dialog/DialogDescription.vue'
import UiDialogOverlay from '~/components/ui/dialog/DialogOverlay.vue'
import UiDialogPortal from '~/components/ui/dialog/DialogPortal.vue'
import UiDialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import { downloadRemoteFile } from '~/lib/downloadFile'
import { loadPdfjs } from '~/lib/pdfjs'
import { contentLengthFromHeaders, lessonFileSizeLabel, lessonImagePreviewUrl, lessonPageCountLabel } from '#shared/utils/lessonPreviewUrl.mjs'

const THUMB_BITMAP_WIDTH = 280

const props = defineProps<{ src: string; lessonId?: string; title: string }>()

const open = ref(false)
const downloading = ref(false)
const thumbLoading = ref(true)
const thumbFailed = ref(false)
const pageCount = ref(0)
const fileSizeLabel = ref('')
const bookPage = ref<HTMLElement | null>(null)
let bookTween: { kill: () => void } | null = null
const thumbCanvas = ref<HTMLCanvasElement | null>(null)
const imagePreviewFailed = ref(false)
const zoomPercent = ref(100)
const viewerPage = ref(1)
const viewerTotal = ref(0)

const pathPart = computed(() => (props.src || '').split('?')[0] ?? '')
const isPdf = computed(() => /\.pdf$/i.test(pathPart.value))
const isImage = computed(() => /\.(jpg|jpeg|png)$/i.test(pathPart.value))
const zoom = computed(() => zoomPercent.value / 100)
const imageSrc = computed(() => (
  imagePreviewFailed.value ? props.src : String(lessonImagePreviewUrl(props.src))
))

let thumbToken = 0
let sizeToken = 0

async function loadFileSize() {
  if (!import.meta.client || !props.src) return
  const token = ++sizeToken
  fileSizeLabel.value = ''
  try {
    let bytes = 0
    try {
      const head = await fetch(props.src, { method: 'HEAD' })
      if (token !== sizeToken) return
      bytes = contentLengthFromHeaders(head.headers.get('content-length'), null)
    } catch {
      bytes = 0
    }
    if (!bytes) {
      const ranged = await fetch(props.src, { headers: { Range: 'bytes=0-0' } })
      await ranged.body?.cancel().catch(() => {})
      if (token !== sizeToken) return
      bytes = contentLengthFromHeaders(
        ranged.status === 200 ? ranged.headers.get('content-length') : null,
        ranged.headers.get('content-range'),
      )
    }
    if (token !== sizeToken) return
    fileSizeLabel.value = String(lessonFileSizeLabel(bytes))
  } catch {
    if (token === sizeToken) fileSizeLabel.value = ''
  }
}

function onImageError() {
  if (!imagePreviewFailed.value) imagePreviewFailed.value = true
}

async function loadThumb() {
  if (!import.meta.client || !isPdf.value) return
  const token = ++thumbToken
  thumbLoading.value = true
  thumbFailed.value = false
  pageCount.value = 0
  let pdf: import('pdfjs-dist').PDFDocumentProxy | null = null
  try {
    const pdfjs = await loadPdfjs()
    if (token !== thumbToken) return
    // Range-fetch only the objects for page 1, then paint a small bitmap.
    // Streaming has to stay off or pdf.js keeps pulling the rest of the file.
    const task = pdfjs.getDocument({
      url: props.src,
      disableAutoFetch: true,
      disableStream: true,
    })
    pdf = await task.promise
    if (token !== thumbToken) return
    pageCount.value = pdf.numPages
    const page = await pdf.getPage(1)
    await nextTick()
    const canvas = thumbCanvas.value
    if (!canvas || token !== thumbToken) return
    const unscaled = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: THUMB_BITMAP_WIDTH / unscaled.width })
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    canvas.style.aspectRatio = `${canvas.width} / ${canvas.height}`
    await page.render({ canvas, viewport }).promise
    page.cleanup()
    if (token !== thumbToken) return
    thumbLoading.value = false
  } catch (error) {
    if (token !== thumbToken) return
    console.error('PDF thumbnail error', error)
    thumbFailed.value = true
    thumbLoading.value = false
  } finally {
    await pdf?.destroy().catch(() => {})
  }
}

function showFile() {
  zoomPercent.value = 100
  viewerPage.value = 1
  open.value = true
}

let bookToken = 0

async function playBook(opening: boolean) {
  if (!import.meta.client || !bookPage.value) return
  const token = ++bookToken
  const { default: gsap } = await import('gsap')
  if (token !== bookToken || !bookPage.value) return
  bookTween?.kill()
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const timeline = gsap.timeline({
    defaults: {
      duration: reduce ? 0 : opening ? 0.45 : 0.32,
      ease: opening ? 'power2.out' : 'power2.inOut',
    },
  })
  bookTween = timeline
  timeline.to(bookPage.value, {
    rotateY: opening ? -14 : 0,
    scaleX: opening ? 0.96 : 1,
    transformOrigin: 'left center',
    transformPerspective: 720,
    boxShadow: opening ? '6px 8px 16px rgba(90, 42, 12, 0.12)' : '0 0 0 rgba(90, 42, 12, 0)',
  }, 0)
}

function onOpenChange(next: boolean) {
  open.value = next
  if (next) {
    zoomPercent.value = 100
    viewerPage.value = 1
  }
}

function zoomOut() {
  zoomPercent.value = Math.max(50, zoomPercent.value - 25)
}

function zoomIn() {
  zoomPercent.value = Math.min(200, zoomPercent.value + 25)
}

async function download() {
  downloading.value = true
  try {
    await downloadRemoteFile(props.src, props.title)
    if (!props.lessonId) return
    try {
      await $fetch(`/api/lessons/${props.lessonId}/record-download`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      toast.error('Το αρχείο κατέβηκε, αλλά η καταγραφή της λήψης απέτυχε.')
    }
  } catch {
    toast.error('Η λήψη απέτυχε')
  } finally {
    downloading.value = false
  }
}

watch(() => props.src, () => {
  imagePreviewFailed.value = false
  void loadThumb()
  void loadFileSize()
})

onMounted(() => {
  void loadThumb()
  void loadFileSize()
})

onUnmounted(() => {
  thumbToken++
  sizeToken++
  bookToken++
  bookTween?.kill()
})
</script>

<template>
  <div v-if="isPdf || isImage">
    <button
      type="button"
      class="group w-56 cursor-pointer rounded-3xl border border-border bg-card p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      :aria-label="`Άνοιγμα: ${title}`"
      @click="showFile"
      @pointerenter="playBook(true)"
      @pointerleave="playBook(false)"
    >
      <span class="relative block">
        <span
          ref="bookPage"
          class="relative block origin-left overflow-hidden rounded-sm bg-white"
        >
          <span
            v-if="isPdf && thumbLoading"
            class="block aspect-[1/1.414] animate-pulse bg-muted"
          />
          <canvas
            v-show="isPdf && !thumbFailed"
            ref="thumbCanvas"
            class="block h-auto w-full"
            :class="thumbLoading ? 'invisible absolute inset-x-0 top-0' : ''"
          />
          <span
            v-if="isPdf && thumbFailed"
            class="flex aspect-[1/1.414] items-center justify-center text-muted-foreground"
          >
            <VIcon name="bi-journal-text" class="size-8" aria-hidden="true" />
          </span>
          <img
            v-if="isImage"
            :src="imageSrc"
            alt=""
            class="block max-h-72 w-full object-cover object-top"
            @error="onImageError"
          >
          <span class="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-[11px] font-bold text-foreground shadow-sm">
            <VIcon name="bi-eye" class="size-3.5" aria-hidden="true" />
            Άνοιγμα
          </span>
        </span>
      </span>
      <span
        v-if="(isPdf && pageCount) || isImage || fileSizeLabel"
        class="mt-3 flex items-center justify-between gap-2"
      >
        <span class="text-sm font-semibold text-foreground">
          <template v-if="isPdf && pageCount">{{ lessonPageCountLabel(pageCount) }}</template>
          <template v-else-if="isImage">Εικόνα</template>
        </span>
        <span v-if="fileSizeLabel" class="text-xs font-semibold text-muted-foreground tabular-nums">
          {{ fileSizeLabel }}
        </span>
      </span>
    </button>

    <UiDialog :open="open" @update:open="onOpenChange">
      <UiDialogPortal>
        <UiDialogOverlay class="z-60 bg-foreground/40 backdrop-blur-sm" />
        <UiDialogContent class="z-60 flex h-[min(92vh,56rem)] min-h-0 w-[min(96vw,72rem)] max-w-none flex-col gap-0 overflow-hidden p-0 sm:rounded-3xl">
          <UiDialogDescription class="sr-only">
            Προβολή και λήψη του υλικού
          </UiDialogDescription>
          <div class="flex flex-wrap items-center gap-2 border-b border-border bg-card px-3 py-3 sm:px-4">
            <div class="min-w-0 flex-1 basis-full sm:basis-auto">
              <UiDialogTitle class="truncate font-heading">
                {{ title }}
              </UiDialogTitle>
            </div>
            <span v-if="isPdf" class="shrink-0 text-sm text-muted-foreground tabular-nums">
              {{ viewerPage }} / {{ viewerTotal || pageCount }}
            </span>
            <div v-if="isPdf" class="flex shrink-0 items-center">
              <UiButton
                variant="ghost"
                size="icon"
                aria-label="Σμίκρυνση"
                :disabled="zoomPercent <= 50"
                @click="zoomOut"
              >
                <VIcon name="bi-zoom-out" aria-hidden="true" />
              </UiButton>
              <span class="w-12 text-center text-xs font-semibold text-foreground tabular-nums">
                {{ zoomPercent }}%
              </span>
              <UiButton
                variant="ghost"
                size="icon"
                aria-label="Μεγέθυνση"
                :disabled="zoomPercent >= 200"
                @click="zoomIn"
              >
                <VIcon name="bi-zoom-in" aria-hidden="true" />
              </UiButton>
            </div>
            <UiButton variant="outline" size="sm" :disabled="downloading" @click="download">
              <VIcon name="bi-download" aria-hidden="true" />
              Λήψη
            </UiButton>
            <UiDialogClose as-child>
              <button
                type="button"
                class="inline-flex size-10 cursor-pointer items-center justify-center rounded-md text-foreground transition-colors hover:bg-accent"
                aria-label="Κλείσιμο"
              >
                <VIcon name="bi-x" class="size-4" aria-hidden="true" />
              </button>
            </UiDialogClose>
          </div>
          <LessonPdfViewer
            v-if="open && isPdf"
            :src="src"
            :zoom="zoom"
            @ready="viewerTotal = $event"
            @page="viewerPage = $event"
          />
          <div v-else-if="isImage" class="min-h-0 flex-1 overflow-auto bg-muted/40 p-4">
            <img :src="src" alt="" class="mx-auto max-w-full rounded-xl bg-white shadow-md">
          </div>
        </UiDialogContent>
      </UiDialogPortal>
    </UiDialog>
  </div>
  <div
    v-else
    class="rounded-3xl border border-border bg-muted/30 p-8 text-center text-muted-foreground"
  >
    Αυτή η μορφή περιεχομένου δεν υποστηρίζεται
  </div>
</template>
