import { toast } from 'vue-sonner'
import { acceptedEntityImageUrl, borrowEntityImage, entityImageDraft, entityImageSaveFields } from '#shared/utils/entityImageUrl.mjs'
import { canStartUpload, imageToDiscard } from '#shared/utils/lessonAttachment.mjs'

type ImageEntity = 'category' | 'chapter' | 'subject' | 'article'

const IMAGE_COLLECTION: Record<ImageEntity, string> = {
  category: 'categories',
  chapter: 'chapters',
  subject: 'subjects',
  article: 'articles',
}

export function useAdminImageDraft(entity: ImageEntity) {
  const adminFetch = useAdminFetch()
  const imageUrl = ref('')
  const savedUrl = ref('')
  const sessionUrl = ref('')
  const preserveExisting = ref(false)
  const imageRemoved = ref(false)
  const busy = ref(false)
  let keepSession = false
  const fileUpload = useAdminFileUpload()
  const uploading = computed(() => fileUpload.uploading.value || busy.value)
  const persistedImage = computed(() =>
    preserveExisting.value || (imageUrl.value !== '' && imageUrl.value === savedUrl.value && sessionUrl.value === ''),
  )

  function storageUrl() {
    return String(useRuntimeConfig().public.supabaseUrl || '')
  }

  function resetImage(url: string | null | undefined) {
    keepSession = false
    const next = entityImageDraft(url ?? '', storageUrl())
    savedUrl.value = next.draft
    imageUrl.value = next.draft
    preserveExisting.value = next.preserveExisting
    imageRemoved.value = false
    sessionUrl.value = ''
  }

  function discard(url: string) {
    if (!url) return
    void adminFetch('/api/admin/upload-discard', {
      method: 'POST',
      body: { url },
    }).catch(() => {})
  }

  function releaseUnsaved() {
    const url = imageToDiscard({
      sessionUrl: sessionUrl.value,
      savedUrl: savedUrl.value,
      keepSession,
    })
    sessionUrl.value = ''
    if (url) discard(url)
  }

  function closeImage(saving: boolean) {
    fileUpload.abort()
    if (saving) return
    releaseUnsaved()
  }

  function keepImage() {
    if (sessionUrl.value && sessionUrl.value !== imageUrl.value) discard(sessionUrl.value)
    keepSession = true
    sessionUrl.value = ''
  }

  async function uploadImage(file: File, saving: boolean) {
    if (!canStartUpload({ loading: saving, uploading: uploading.value })) return
    busy.value = true
    const previous = sessionUrl.value
    try {
      const res = await fileUpload.upload(file, { kind: 'image', entity })
      if (!res?.url) return
      const accepted = acceptedEntityImageUrl(res.url, storageUrl())
      if (typeof accepted !== 'string') {
        discard(res.url)
        return
      }
      if (previous && previous !== accepted) discard(previous)
      imageUrl.value = accepted
      preserveExisting.value = false
      imageRemoved.value = false
      sessionUrl.value = accepted === savedUrl.value ? '' : accepted
    } finally {
      busy.value = false
    }
  }

  function useExistingImage(url: string) {
    if (uploading.value) return
    const next = borrowEntityImage({
      chosen: url,
      sessionUrl: sessionUrl.value,
      supabaseUrl: storageUrl(),
    })
    if (!next) return
    if (next.discardUrl) discard(next.discardUrl)
    imageUrl.value = next.imageUrl
    preserveExisting.value = next.preserveExisting
    imageRemoved.value = next.imageRemoved
    sessionUrl.value = next.sessionUrl
  }

  function clearImage() {
    const current = imageUrl.value
    imageUrl.value = ''
    preserveExisting.value = false
    imageRemoved.value = true
    if (!sessionUrl.value || sessionUrl.value !== current) return
    const url = sessionUrl.value
    sessionUrl.value = ''
    discard(url)
  }

  async function removePersistedImage(id: string) {
    busy.value = true
    try {
      await adminFetch(`/api/admin/${IMAGE_COLLECTION[entity]}/${id}`, {
        method: 'PATCH',
        body: { image_url: null },
      })
      imageUrl.value = ''
      savedUrl.value = ''
      preserveExisting.value = false
      imageRemoved.value = false
      sessionUrl.value = ''
      return true
    } catch (error: unknown) {
      const err = error as { data?: { message?: string } }
      toast.error(err?.data?.message ?? 'Κάτι πήγε στραβά')
      return false
    } finally {
      busy.value = false
    }
  }

  function imageFields(creating: boolean) {
    return entityImageSaveFields({
      creating,
      draft: imageUrl.value,
      preserveExisting: preserveExisting.value,
      removed: imageRemoved.value,
    })
  }

  return {
    imageUrl,
    preserveExisting,
    persistedImage,
    uploading,
    progress: fileUpload.progress,
    statusLabel: fileUpload.statusLabel,
    resetImage,
    closeImage,
    keepImage,
    releaseUnsaved,
    uploadImage,
    useExistingImage,
    clearImage,
    removePersistedImage,
    imageFields,
  }
}
