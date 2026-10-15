import { loadPdfjs } from '~/lib/pdfjs'

export const LESSON_PREVIEW_BITMAP_WIDTH = 280

export type LessonPreviewRaster = {
  blob: Blob
  mime: 'image/png' | 'image/jpeg'
  pageCount: number | null
  fileBytes: number
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  mime: 'image/png' | 'image/jpeg',
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Preview render failed'))
      },
      mime,
      quality,
    )
  })
}

async function rasterFromPdf(source: string | ArrayBuffer): Promise<Omit<LessonPreviewRaster, 'fileBytes'>> {
  const pdfjs = await loadPdfjs()
  const task = pdfjs.getDocument({
    ...(typeof source === 'string' ? { url: source } : { data: source }),
    disableAutoFetch: true,
    disableStream: true,
  })
  const pdf = await task.promise
  try {
    const pageCount = pdf.numPages
    const page = await pdf.getPage(1)
    const unscaled = page.getViewport({ scale: 1 })
    const viewport = page.getViewport({ scale: LESSON_PREVIEW_BITMAP_WIDTH / unscaled.width })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    await page.render({ canvas, viewport }).promise
    page.cleanup()
    const blob = await canvasToBlob(canvas, 'image/png')
    return { blob, mime: 'image/png', pageCount }
  } finally {
    await pdf.destroy().catch(() => {})
  }
}

async function rasterFromImage(source: Blob): Promise<Omit<LessonPreviewRaster, 'fileBytes'>> {
  const objectUrl = URL.createObjectURL(source)
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      el.onerror = () => reject(new Error('Preview render failed'))
      el.src = objectUrl
    })
    const scale = LESSON_PREVIEW_BITMAP_WIDTH / Math.max(image.naturalWidth, 1)
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.floor(image.naturalWidth * scale))
    canvas.height = Math.max(1, Math.floor(image.naturalHeight * scale))
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Preview render failed')
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
    const blob = await canvasToBlob(canvas, 'image/jpeg', 0.82)
    return { blob, mime: 'image/jpeg', pageCount: null }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

/** Fetch a remote lesson file as a Blob so canvas export is not cross-origin tainted. */
async function blobFromUrl(url: string): Promise<Blob> {
  const response = await fetch(url)
  if (!response.ok) throw new Error('Preview download failed')
  return response.blob()
}

function isPdfPath(path: string): boolean {
  return /\.pdf$/i.test(path.split('?')[0] ?? '')
}

function isImagePath(path: string): boolean {
  return /\.(jpe?g|png)$/i.test(path.split('?')[0] ?? '')
}

/** Build a catalog thumbnail from a local File just uploaded in admin. */
export async function lessonPreviewFromFile(file: File): Promise<LessonPreviewRaster> {
  const fileBytes = file.size
  if (file.type === 'application/pdf' || isPdfPath(file.name)) {
    const buffer = await file.arrayBuffer()
    const raster = await rasterFromPdf(buffer)
    return { ...raster, fileBytes }
  }
  if (file.type === 'image/jpeg' || file.type === 'image/png' || isImagePath(file.name)) {
    const raster = await rasterFromImage(file)
    return { ...raster, fileBytes }
  }
  throw new Error('Unsupported lesson file')
}

/** Build a catalog thumbnail from a public content URL (admin backfill). */
export async function lessonPreviewFromUrl(
  contentUrl: string,
  fileBytesHint?: number | null,
): Promise<LessonPreviewRaster> {
  let fileBytes = Number.isFinite(fileBytesHint) && (fileBytesHint as number) > 0
    ? Number(fileBytesHint)
    : 0
  if (isPdfPath(contentUrl)) {
    if (!fileBytes) {
      try {
        const head = await fetch(contentUrl, { method: 'HEAD' })
        const length = Number(head.headers.get('content-length'))
        if (Number.isFinite(length) && length > 0) fileBytes = length
      } catch {
        fileBytes = 0
      }
    }
    const raster = await rasterFromPdf(contentUrl)
    return { ...raster, fileBytes: fileBytes || 0 }
  }
  if (isImagePath(contentUrl)) {
    // Must fetch first: drawing a cross-origin <img> taints the canvas and toBlob throws.
    const file = await blobFromUrl(contentUrl)
    const raster = await rasterFromImage(file)
    return { ...raster, fileBytes: fileBytes || file.size || 0 }
  }
  throw new Error('Unsupported lesson file')
}

export function previewFileFromRaster(raster: LessonPreviewRaster, baseName = 'preview'): File {
  const ext = raster.mime === 'image/png' ? 'png' : 'jpg'
  return new File([raster.blob], `${baseName}.${ext}`, { type: raster.mime })
}
