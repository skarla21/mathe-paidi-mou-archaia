<script setup lang="ts">
import { onMounted, onUnmounted, ref, watch } from 'vue'
import { toast } from 'vue-sonner'
import { loadPdfjs, releasePdfWorker, waitForPdfWorker } from '~/lib/pdfjs'
import { strongestVisiblePage } from '#shared/utils/lessonPreviewUrl.mjs'

const props = defineProps<{ src: string; zoom: number }>()
const emit = defineEmits<{
  ready: [total: number]
  page: [page: number]
}>()

const scroller = ref<HTMLElement | null>(null)
const loading = ref(true)

type PdfDoc = import('pdfjs-dist').PDFDocumentProxy
type PdfPage = import('pdfjs-dist').PDFPageProxy
type LoadingTask = import('pdfjs-dist').PDFDocumentLoadingTask
type RenderTask = import('pdfjs-dist').RenderTask

type Shell = {
  page: number
  wrap: HTMLElement
  scale: number
  cssWidth: number
  cssHeight: number
  keep: boolean
  painted: boolean
  failed: boolean
  task: RenderTask | null
  painting: Promise<void> | null
}

let pdfDoc: PdfDoc | null = null
let loadingTask: LoadingTask | null = null
let generation = 0
let loadToken = 0
let resizeObserver: ResizeObserver | null = null
let lastWidth = 0
let lastHeight = 0
let reportedRenderError = false
let shells: Shell[] = []
let pageObserver: IntersectionObserver | null = null
let renderObserver: IntersectionObserver | null = null
const pageRatios = new Map<number, number>()
const tasks: RenderTask[] = []
const cancelledTasks = new WeakSet<RenderTask>()

function contentBox(host: HTMLElement) {
  const style = getComputedStyle(host)
  const padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0)
  const padY = (parseFloat(style.paddingTop) || 0) + (parseFloat(style.paddingBottom) || 0)
  return {
    width: Math.max(120, host.clientWidth - padX),
    height: Math.max(120, host.clientHeight - padY),
  }
}

function isCancelled(error: unknown) {
  return typeof error === 'object' && error !== null && 'name' in error
    && (error as { name?: string }).name === 'RenderingCancelledException'
}

function cancelTask(task: RenderTask | null) {
  if (!task || cancelledTasks.has(task)) return
  cancelledTasks.add(task)
  const index = tasks.indexOf(task)
  if (index >= 0) tasks.splice(index, 1)
  task.cancel()
}

function cancelTasks() {
  for (const task of tasks.splice(0)) cancelTask(task)
}

function dropCanvas(node: ParentNode) {
  const canvas = node.querySelector('canvas')
  if (!canvas) return
  canvas.width = 0
  canvas.height = 0
  canvas.remove()
}

function release(nodes: HTMLElement[]) {
  for (const node of nodes) dropCanvas(node)
}

function cleanupPage(page: PdfPage | null) {
  try {
    page?.cleanup()
  } catch {
    // A cancelled render can still be releasing the page.
  }
}

function disconnectObservers() {
  pageObserver?.disconnect()
  renderObserver?.disconnect()
  pageObserver = null
  renderObserver = null
  pageRatios.clear()
}

async function abandonTask(task: LoadingTask | null) {
  if (!task || task.destroyed) return
  void task.promise.then(
    (doc) => doc.destroy().catch(() => {}),
    () => {},
  )
  await task.destroy().catch(() => {})
}

function clearPages() {
  disconnectObservers()
  cancelTasks()
  const host = scroller.value
  const previous = Array.from(host?.children ?? []) as HTMLElement[]
  host?.replaceChildren()
  release(previous)
  shells = []
}

function releaseShell(shell: Shell) {
  shell.keep = false
  shell.painted = false
  cancelTask(shell.task)
  shell.task = null
  if (!shell.painting) dropCanvas(shell.wrap)
}

function markPageFailed(shell: Shell) {
  shell.failed = true
  shell.keep = false
  shell.painted = false
  dropCanvas(shell.wrap)
  const note = document.createElement('p')
  note.className = 'flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground'
  note.textContent = 'Η σελίδα δεν φορτώθηκε'
  shell.wrap.replaceChildren(note)
}

function reportRenderError(error: unknown) {
  console.error('PDF render error', error)
  if (reportedRenderError) return
  reportedRenderError = true
  toast.error('Αποτυχία φόρτωσης PDF')
}

function currentPage(host: HTMLElement) {
  if (!shells.length) return 0
  const root = host.getBoundingClientRect()
  const mid = root.top + root.height / 2
  let best = shells[0]!.page
  let bestDist = Number.POSITIVE_INFINITY
  for (const shell of shells) {
    const rect = shell.wrap.getBoundingClientRect()
    const pageMid = rect.top + rect.height / 2
    const dist = Math.abs(pageMid - mid)
    if (dist < bestDist) {
      bestDist = dist
      best = shell.page
    }
  }
  return best
}

async function drawPage(shell: Shell, token: number) {
  const doc = pdfDoc
  if (!doc || token !== generation || !shell.keep || shell.failed) return
  let page: PdfPage | null = null
  let canvas: HTMLCanvasElement | null = null
  try {
    page = await doc.getPage(shell.page)
    if (token !== generation || !shell.keep) return
    const viewport = page.getViewport({ scale: shell.scale })
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
    canvas = document.createElement('canvas')
    canvas.className = 'block h-full w-full'
    canvas.width = Math.floor(shell.cssWidth * pixelRatio)
    canvas.height = Math.floor(shell.cssHeight * pixelRatio)
    const task = page.render({
      canvas,
      viewport,
      transform: pixelRatio === 1 ? undefined : [pixelRatio, 0, 0, pixelRatio, 0, 0],
    })
    shell.task = task
    tasks.push(task)
    void task.promise.then(() => {
      const index = tasks.indexOf(task)
      if (index >= 0) tasks.splice(index, 1)
    }, () => {
      const index = tasks.indexOf(task)
      if (index >= 0) tasks.splice(index, 1)
    })
    if (token !== generation || !shell.keep) {
      cancelTask(task)
      shell.task = null
      return
    }
    await task.promise
    if (token !== generation || !shell.keep) return
    dropCanvas(shell.wrap)
    shell.wrap.appendChild(canvas)
    canvas = null
    shell.painted = true
  } catch (error) {
    if (token !== generation || isCancelled(error)) return
    reportRenderError(error)
    markPageFailed(shell)
  } finally {
    shell.task = null
    if (canvas) {
      canvas.width = 0
      canvas.height = 0
    }
    cleanupPage(page)
  }
}

function paintPage(shell: Shell, token: number) {
  if (shell.failed || shell.painted || !shell.keep) return Promise.resolve()
  if (shell.painting) return shell.painting
  const job = drawPage(shell, token).finally(() => {
    if (shell.painting === job) shell.painting = null
    if (!shell.keep) dropCanvas(shell.wrap)
  })
  shell.painting = job
  return job
}

function watchPages() {
  disconnectObservers()
  const root = scroller.value
  if (!root) return
  pageObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const page = Number((entry.target as HTMLElement).dataset.page)
      if (!page) continue
      pageRatios.set(page, entry.isIntersecting ? entry.intersectionRatio : 0)
    }
    const page = strongestVisiblePage(pageRatios)
    if (page) emit('page', page)
  }, { root, threshold: [0, 0.25, 0.5, 0.75, 1] })

  renderObserver = new IntersectionObserver((entries) => {
    const token = generation
    for (const entry of entries) {
      const page = Number((entry.target as HTMLElement).dataset.page)
      const shell = shells.find((item) => item.page === page)
      if (!shell || shell.failed) continue
      if (entry.isIntersecting) {
        shell.keep = true
        void paintPage(shell, token)
      } else {
        releaseShell(shell)
      }
    }
  }, { root, rootMargin: '100% 0px', threshold: 0 })

  for (const shell of shells) {
    pageObserver.observe(shell.wrap)
    renderObserver.observe(shell.wrap)
  }
}

async function layout() {
  const host = scroller.value
  const doc = pdfDoc
  if (!host || !doc) return
  const token = ++generation
  cancelTasks()

  let box = contentBox(host)
  for (let wait = 0; wait < 8 && (host.clientWidth < 40 || host.clientHeight < 40); wait++) {
    await new Promise((resolve) => requestAnimationFrame(() => resolve(undefined)))
    if (token !== generation) return
    box = contentBox(host)
  }
  if (token !== generation || host.clientWidth < 40 || host.clientHeight < 40) return
  lastWidth = host.clientWidth
  lastHeight = host.clientHeight

  const next: Shell[] = []
  try {
    for (let i = 1; i <= doc.numPages; i++) {
      if (token !== generation) return
      const page = await doc.getPage(i)
      if (token !== generation) {
        cleanupPage(page)
        return
      }
      const unscaled = page.getViewport({ scale: 1 })
      const gap = 16
      const fit = Math.min(
        box.width / unscaled.width,
        Math.max(80, box.height - gap) / unscaled.height,
      )
      const scale = fit * props.zoom
      const viewport = page.getViewport({ scale })
      const wrap = document.createElement('div')
      wrap.dataset.page = String(i)
      wrap.className = 'mx-auto mb-4 overflow-hidden bg-white shadow-[0_8px_24px_rgba(0,0,0,0.12)]'
      const cssWidth = Math.floor(viewport.width)
      const cssHeight = Math.floor(viewport.height)
      wrap.style.width = `${cssWidth}px`
      wrap.style.height = `${cssHeight}px`
      next.push({
        page: i,
        wrap,
        scale,
        cssWidth,
        cssHeight,
        keep: false,
        painted: false,
        failed: false,
        task: null,
        painting: null,
      })
      cleanupPage(page)
    }
  } catch (error) {
    if (token !== generation) return
    reportRenderError(error)
    loading.value = false
    return
  }

  if (token !== generation) return
  const ratio = host.scrollHeight > 0 ? host.scrollTop / host.scrollHeight : 0
  const previous = Array.from(host.children) as HTMLElement[]
  shells = next
  host.replaceChildren(...next.map((shell) => shell.wrap))
  release(previous)
  host.scrollTop = ratio * host.scrollHeight
  lastWidth = host.clientWidth
  lastHeight = host.clientHeight
  const visible = currentPage(host)
  if (visible) emit('page', visible)
  watchPages()
  const visibleShell = next.find((shell) => shell.page === visible)
  if (visibleShell) {
    visibleShell.keep = true
    await paintPage(visibleShell, token)
  }
  if (token !== generation) return
  loading.value = false
}

async function load() {
  const token = ++loadToken
  loading.value = true
  reportedRenderError = false
  generation++
  const previousTask = loadingTask
  loadingTask = null
  const previousDoc = pdfDoc
  pdfDoc = null
  clearPages()
  releasePdfWorker(async () => {
    await abandonTask(previousTask)
    await previousDoc?.destroy().catch(() => {})
  })
  await waitForPdfWorker()
  if (token !== loadToken) return
  if (!props.src || import.meta.server) {
    loading.value = false
    return
  }
  try {
    const pdfjs = await loadPdfjs()
    if (token !== loadToken) return
    const task = pdfjs.getDocument(props.src)
    loadingTask = task
    const doc = await task.promise
    if (loadingTask === task) loadingTask = null
    if (token !== loadToken) {
      await doc.destroy().catch(() => {})
      return
    }
    pdfDoc = doc
    emit('ready', doc.numPages)
    await layout()
  } catch (error) {
    if (token !== loadToken) return
    console.error('PDF load error', error)
    loading.value = false
    toast.error('Αποτυχία φόρτωσης PDF')
  }
}

function onResize() {
  const width = scroller.value?.clientWidth ?? 0
  const height = scroller.value?.clientHeight ?? 0
  if (Math.abs(width - lastWidth) < 16 && Math.abs(height - lastHeight) < 16) return
  void layout()
}

function onKeydown(event: KeyboardEvent) {
  if (event.altKey || event.ctrlKey || event.metaKey) return
  const host = scroller.value
  if (!host || event.target !== host) return
  const line = 48
  const pageStep = Math.max(80, host.clientHeight - 32)
  if (event.key === 'ArrowDown') host.scrollBy({ top: line })
  else if (event.key === 'ArrowUp') host.scrollBy({ top: -line })
  else if (event.key === 'ArrowRight') host.scrollBy({ left: line })
  else if (event.key === 'ArrowLeft') host.scrollBy({ left: -line })
  else if (event.key === 'PageDown' || (event.key === ' ' && !event.shiftKey)) host.scrollBy({ top: pageStep })
  else if (event.key === 'PageUp' || (event.key === ' ' && event.shiftKey)) host.scrollBy({ top: -pageStep })
  else if (event.key === 'Home') host.scrollTo({ top: 0 })
  else if (event.key === 'End') host.scrollTo({ top: host.scrollHeight })
  else return
  event.preventDefault()
}

onMounted(() => {
  void load()
  if (!scroller.value) return
  resizeObserver = new ResizeObserver(() => onResize())
  resizeObserver.observe(scroller.value)
})

watch(() => props.zoom, () => {
  void layout()
})

watch(() => props.src, () => {
  void load()
})

onUnmounted(() => {
  loadToken++
  generation++
  const task = loadingTask
  loadingTask = null
  const doc = pdfDoc
  pdfDoc = null
  clearPages()
  releasePdfWorker(async () => {
    await abandonTask(task)
    await doc?.destroy().catch(() => {})
  })
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<template>
  <div class="relative h-full min-h-0 w-full min-w-0 flex-1">
    <p
      v-if="loading"
      class="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-muted-foreground"
    >
      Φόρτωση PDF…
    </p>
    <div
      ref="scroller"
      tabindex="0"
      role="region"
      class="h-full max-w-full bg-muted/40 px-4 py-4 outline-none [scrollbar-gutter:stable] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
      :class="zoom > 1 ? 'overflow-auto' : 'overflow-x-hidden overflow-y-auto'"
      :aria-busy="loading"
      aria-label="Σελίδες υλικού"
      @keydown="onKeydown"
    />
  </div>
</template>
