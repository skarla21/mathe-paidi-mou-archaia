<script setup lang="ts">
import { toast } from 'vue-sonner'
import UiDialog from '~/components/ui/dialog/Dialog.vue'
import UiDialogPortal from '~/components/ui/dialog/DialogPortal.vue'
import UiDialogOverlay from '~/components/ui/dialog/DialogOverlay.vue'
import UiDialogContent from '~/components/ui/dialog/DialogContent.vue'
import UiDialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import UiDialogFooter from '~/components/ui/dialog/DialogFooter.vue'
import UiDialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import UiDialogDescription from '~/components/ui/dialog/DialogDescription.vue'
import AdminImageDropzone from '~/components/admin/AdminImageDropzone.vue'
import AdminExistingImagePicker from '~/components/admin/AdminExistingImagePicker.vue'
import UiButton from '~/components/ui/Button.vue'
import UiInput from '~/components/ui/Input.vue'
import UiLabel from '~/components/ui/Label.vue'
import UiTextarea from '~/components/ui/Textarea.vue'

const props = defineProps<{
  open: boolean
  category: { id: string; name: string; description?: string | null; image_url?: string | null; order: number } | null
}>()
const emit = defineEmits<{ close: []; saved: [] }>()

const name = ref('')
const description = ref('')
const loading = ref(false)
const attempted = ref(false)
const pickerOpen = ref(false)
const adminFetch = useAdminFetch()
const {
  imageUrl,
  uploading,
  progress: uploadProgress,
  statusLabel: uploadStatusLabel,
  preserveExisting,
  persistedImage,
  resetImage,
  closeImage,
  keepImage,
  releaseUnsaved,
  uploadImage,
  useExistingImage,
  clearImage,
  removePersistedImage,
  imageFields,
} = useAdminImageDraft('category')

const nameMissing = computed(() => attempted.value && !name.value.trim())

watch(() => props.open, (val) => {
  if (!val) {
    pickerOpen.value = false
    closeImage(loading.value)
    return
  }
  attempted.value = false
  name.value = props.category?.name ?? ''
  description.value = props.category?.description ?? ''
  resetImage(props.category?.image_url)
})

function onImageFile(file: File) {
  void uploadImage(file, loading.value)
}

function onImagePick(url: string) {
  useExistingImage(url)
  pickerOpen.value = false
}

async function onImageClear() {
  if (persistedImage.value && props.category) {
    const removed = await removePersistedImage(props.category.id)
    if (removed) emit('saved')
    return
  }
  clearImage()
}

async function onSubmit() {
  if (uploading.value) return
  attempted.value = true
  if (nameMissing.value) return
  loading.value = true
  try {
    const body = {
      name: name.value,
      description: description.value || null,
      ...imageFields(!props.category),
    }
    if (props.category) {
      await adminFetch(`/api/admin/categories/${props.category.id}`, { method: 'PATCH', body })
    } else {
      await adminFetch('/api/admin/categories', { method: 'POST', body: { ...body, order: 0 } })
    }
    keepImage()
    emit('saved')
    emit('close')
  } catch (e: unknown) {
    if (!props.open) releaseUnsaved()
    const err = e as { data?: { message?: string } }
    toast.error(err?.data?.message ?? 'Κάτι πήγε στραβά')
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <UiDialog :open="props.open" @update:open="(v: boolean) => !v && emit('close')">
    <UiDialogPortal>
      <UiDialogOverlay />
      <UiDialogContent class="max-w-lg">
        <UiDialogHeader>
          <UiDialogTitle>{{ props.category ? 'Επεξεργασία' : 'Δημιουργία' }} — Κατηγορίες</UiDialogTitle>
          <UiDialogDescription class="sr-only">Δημιουργία ή επεξεργασία κατηγορίας υλικού.</UiDialogDescription>
        </UiDialogHeader>
        <form class="space-y-4" @submit.prevent="onSubmit">
          <div class="space-y-1.5">
            <UiLabel for="category-name">Όνομα</UiLabel>
            <UiInput id="category-name" v-model="name" :aria-invalid="nameMissing || undefined" :class="nameMissing ? 'border-destructive' : ''" />
            <p v-if="nameMissing" class="text-xs text-destructive">Το πεδίο «Όνομα» είναι υποχρεωτικό</p>
          </div>
          <div class="space-y-1.5">
            <UiLabel>Περιγραφή (προαιρετικό)</UiLabel>
            <UiTextarea v-model="description" :rows="3" />
          </div>
          <AdminImageDropzone
            :model-value="imageUrl"
            :uploading="uploading"
            :progress="uploadProgress"
            :status-label="uploadStatusLabel"
            :disabled="loading"
            :preserved="preserveExisting"
            :persisted="persistedImage"
            @file="onImageFile"
            @clear="onImageClear"
            @pick="pickerOpen = true"
          />
          <AdminExistingImagePicker
            :open="pickerOpen"
            except-type="category"
            :except-id="props.category?.id"
            @close="pickerOpen = false"
            @select="onImagePick"
          />
          <UiDialogFooter>
            <UiButton type="button" variant="cancel" @click="emit('close')">Ακύρωση</UiButton>
            <UiButton type="submit" :disabled="loading || uploading">{{ loading ? 'Φόρτωση...' : 'Αποθήκευση' }}</UiButton>
          </UiDialogFooter>
        </form>
      </UiDialogContent>
    </UiDialogPortal>
  </UiDialog>
</template>
