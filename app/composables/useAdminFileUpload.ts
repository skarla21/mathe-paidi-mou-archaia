import { toast } from 'vue-sonner'
import {
  IMAGE_MIMES,
  LESSON_MIMES,
  formatUploadStatus,
  maxBytesForMime,
  uploadPercent,
} from '#shared/utils/uploadProgress.mjs'

type UploadKind = 'lesson' | 'image' | 'preview'
type ImageEntity = 'category' | 'chapter' | 'subject' | 'article'

interface SignResponse {
  signedUrl: string
  path: string
  exp: number
  sig: string
  mime: string
}

function rejectionMessage(file: File, kind: UploadKind): string | null {
  const allowed = kind === 'lesson' ? LESSON_MIMES : IMAGE_MIMES
  if (!allowed.includes(file.type)) {
    return kind === 'lesson'
      ? 'Επιτρέπονται μόνο αρχεία PDF, JPG και PNG'
      : 'Επιτρέπονται μόνο εικόνες JPEG και PNG'
  }
  if (file.size > maxBytesForMime(file.type)) {
    return file.type === 'application/pdf'
      ? 'Το αρχείο πρέπει να είναι μικρότερο από 50MB'
      : 'Η εικόνα πρέπει να είναι μικρότερη από 20MB'
  }
  return null
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError'
}

export function useAdminFileUpload() {
  const adminFetch = useAdminFetch()
  const anonKey = String(useRuntimeConfig().public.supabaseAnonKey || '')
  const uploading = ref(false)
  const progress = ref(0)
  const loaded = ref(0)
  const total = ref(0)
  const checking = ref(false)
  let request: XMLHttpRequest | null = null
  let generation = 0

  const statusLabel = computed(() => formatUploadStatus({
    checking: checking.value,
    progress: progress.value,
    loaded: loaded.value,
    total: total.value,
  }))

  function reset() {
    uploading.value = false
    checking.value = false
    progress.value = 0
    loaded.value = 0
    total.value = 0
  }

  function abort() {
    generation += 1
    request?.abort()
    request = null
    reset()
  }

  function putFile(url: string, file: File, current: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const body = new FormData()
      body.append('cacheControl', '3600')
      // Empty field name matches supabase-js uploadToSignedUrl for Blob bodies.
      body.append('', file)
      const xhr = new XMLHttpRequest()
      request = xhr
      xhr.open('PUT', url)
      xhr.setRequestHeader('apikey', anonKey)
      xhr.setRequestHeader('Authorization', `Bearer ${anonKey}`)
      xhr.setRequestHeader('x-upsert', 'false')
      xhr.upload.onprogress = (event) => {
        if (current !== generation || !event.lengthComputable) return
        loaded.value = event.loaded
        total.value = event.total
        progress.value = uploadPercent(event.loaded, event.total)
      }
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (current === generation) {
            loaded.value = file.size
            total.value = Math.max(file.size, total.value)
            progress.value = 100
          }
          resolve()
          return
        }
        reject(new Error(`Upload failed (${xhr.status})`))
      }
      xhr.onerror = () => reject(new Error('Upload failed'))
      xhr.onabort = () => reject(new DOMException('Aborted', 'AbortError'))
      if (current !== generation) {
        reject(new DOMException('Aborted', 'AbortError'))
        return
      }
      xhr.send(body)
    })
  }

  async function releaseSigned(signed: SignResponse | null) {
    if (!signed?.path || !signed.sig || !signed.mime) return
    await adminFetch('/api/admin/upload-discard', {
      method: 'POST',
      body: { path: signed.path, exp: signed.exp, sig: signed.sig, mime: signed.mime },
    }).catch(() => {
      // The next admin page load reaps this file once it is older than 15 minutes.
    })
  }

  async function upload(
    file: File,
    options: { kind: UploadKind; entity?: ImageEntity; announce?: boolean },
  ): Promise<{ url: string } | null> {
    const message = rejectionMessage(file, options.kind)
    if (message) {
      toast.error(message)
      return null
    }

    generation += 1
    const current = generation
    request?.abort()
    request = null
    uploading.value = true
    checking.value = false
    progress.value = 0
    loaded.value = 0
    total.value = file.size

    let signed: SignResponse | null = null
    let kept = false
    try {
      signed = await adminFetch<SignResponse>('/api/admin/upload-sign', {
        method: 'POST',
        body: {
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          target: options.kind,
          entity: options.entity,
        },
      })
      if (current !== generation) {
        await releaseSigned(signed)
        return null
      }
      if (!signed?.signedUrl || !signed.path || !signed.sig || !signed.mime) throw new Error('Upload failed')

      await putFile(signed.signedUrl, file, current)
      if (current !== generation) {
        await releaseSigned(signed)
        return null
      }

      checking.value = true
      progress.value = 100
      const done = await adminFetch<{ url: string }>('/api/admin/upload-finish', {
        method: 'POST',
        body: { path: signed.path, exp: signed.exp, sig: signed.sig, mime: signed.mime },
      })
      if (current !== generation) {
        await releaseSigned(signed)
        return null
      }
      if (!done?.url) {
        await releaseSigned(signed)
        return null
      }
      kept = true
      if (options.announce !== false) toast.success('Το αρχείο μεταφορτώθηκε επιτυχώς')
      return { url: done.url }
    } catch (error) {
      if (signed && !kept) await releaseSigned(signed)
      if (current !== generation || isAbortError(error)) return null
      toast.error('Η μεταφόρτωση απέτυχε')
      return null
    } finally {
      if (current === generation) {
        request = null
        reset()
      }
    }
  }

  return { uploading, progress, statusLabel, upload, abort }
}
