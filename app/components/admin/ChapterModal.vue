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
import UiButton from '~/components/ui/Button.vue'
import UiInput from '~/components/ui/Input.vue'
import UiLabel from '~/components/ui/Label.vue'
import UiTextarea from '~/components/ui/Textarea.vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'

const props = defineProps<{
  open: boolean
  chapter: {
    id: string; title: string; description: string | null
    subject_id: string; image_url: string | null
  } | null
}>()
const emit = defineEmits<{ close: []; saved: [] }>()
const adminFetch = useAdminFetch()

const title = ref('')
const description = ref('')
const gradeId = ref('')
const subjectId = ref('')
const grades = ref<{ id: string; name: string }[]>([])
const subjects = ref<{ id: string; name: string; grade_id: string }[]>([])
const loading = ref(false)
const attempted = ref(false)
const initializing = ref(false)

const filteredSubjects = computed(() =>
  gradeId.value ? subjects.value.filter(s => s.grade_id === gradeId.value) : [],
)
const {
  imageUrl,
  preserveExisting,
  persistedImage,
  uploading,
  progress: uploadProgress,
  statusLabel: uploadStatusLabel,
  resetImage,
  closeImage,
  keepImage,
  releaseUnsaved,
  uploadImage,
  clearImage,
  removePersistedImage,
  imageFields,
} = useAdminImageDraft('chapter')

const titleMissing = computed(() => attempted.value && !title.value.trim())
const gradeMissing = computed(() => attempted.value && !gradeId.value)
const subjectMissing = computed(() => attempted.value && !!gradeId.value && !subjectId.value)

watch(() => props.open, async (val) => {
  if (!val) {
    closeImage(loading.value)
    return
  }
  attempted.value = false
  initializing.value = true
  title.value = props.chapter?.title ?? ''
  description.value = props.chapter?.description ?? ''
  gradeId.value = ''
  subjectId.value = props.chapter?.subject_id ?? ''
  resetImage(props.chapter?.image_url)
  try {
    const [gr, sub] = await Promise.all([
      adminFetch<{ id: string; name: string }[]>('/api/admin/grades'),
      adminFetch<{ id: string; name: string; grade_id: string }[]>('/api/admin/subjects'),
    ])
    grades.value = gr
    subjects.value = sub
    if (props.chapter?.subject_id) {
      const s = subjects.value.find(x => x.id === props.chapter!.subject_id)
      if (s) gradeId.value = s.grade_id
    }
  } catch {
    toast.error('Κάτι πήγε στραβά')
    grades.value = []
    subjects.value = []
  } finally {
    nextTick(() => { initializing.value = false })
  }
})

watch(gradeId, () => {
  if (initializing.value) return
  subjectId.value = ''
})

function onImageFile(file: File) {
  void uploadImage(file, loading.value)
}

async function onImageClear() {
  if (persistedImage.value && props.chapter) {
    const removed = await removePersistedImage(props.chapter.id)
    if (removed) emit('saved')
    return
  }
  clearImage()
}

async function onSubmit() {
  if (uploading.value) return
  attempted.value = true
  if (titleMissing.value || !gradeId.value || !subjectId.value) return
  loading.value = true
  try {
    const body = {
      title: title.value, description: description.value || null,
      subject_id: subjectId.value,
      ...imageFields(!props.chapter),
    }
    if (props.chapter) {
      await adminFetch(`/api/admin/chapters/${props.chapter.id}`, { method: 'PATCH', body })
    } else {
      await adminFetch('/api/admin/chapters', { method: 'POST', body })
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
      <UiDialogContent class="max-w-lg max-h-[90vh] overflow-y-auto">
        <UiDialogHeader>
          <UiDialogTitle>{{ props.chapter ? 'Επεξεργασία' : 'Δημιουργία' }} — Κεφάλαια</UiDialogTitle>
          <UiDialogDescription class="sr-only">Δημιουργία ή επεξεργασία κεφαλαίου και ανάθεσή του σε μάθημα.</UiDialogDescription>
        </UiDialogHeader>
        <form class="space-y-4" @submit.prevent="onSubmit">
          <div class="space-y-1.5">
            <UiLabel>Τίτλος</UiLabel>
            <UiInput v-model="title" :aria-invalid="titleMissing || undefined" :class="titleMissing ? 'border-destructive' : ''" />
            <p v-if="titleMissing" class="text-xs text-destructive">Το πεδίο «Τίτλος» είναι υποχρεωτικό</p>
          </div>
          <div class="space-y-1.5">
            <UiLabel>Περιγραφή</UiLabel>
            <UiTextarea v-model="description" :rows="3" />
          </div>
          <div class="space-y-1.5">
            <UiLabel>Τάξη</UiLabel>
            <Select v-model="gradeId">
              <SelectTrigger :aria-invalid="gradeMissing || undefined">
                <SelectValue placeholder="Επιλογή τάξης…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="g in grades" :key="g.id" :value="g.id">{{ g.name }}</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="gradeMissing" class="text-xs text-destructive">Το πεδίο «Τάξη» είναι υποχρεωτικό</p>
          </div>
          <div v-if="gradeId" class="space-y-1.5">
            <UiLabel>Μάθημα</UiLabel>
            <Select v-model="subjectId">
              <SelectTrigger :aria-invalid="subjectMissing || undefined">
                <SelectValue placeholder="Επιλογή μαθήματος…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="s in filteredSubjects" :key="s.id" :value="s.id">{{ s.name }}</SelectItem>
              </SelectContent>
            </Select>
            <p v-if="subjectMissing" class="text-xs text-destructive">Το πεδίο «Μάθημα» είναι υποχρεωτικό</p>
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
