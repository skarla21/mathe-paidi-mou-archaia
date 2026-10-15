<script setup lang="ts">
import { toast } from 'vue-sonner'
import UiButton from '~/components/ui/Button.vue'
import UiLabel from '~/components/ui/Label.vue'
import UiDialog from '~/components/ui/dialog/Dialog.vue'
import UiDialogPortal from '~/components/ui/dialog/DialogPortal.vue'
import UiDialogOverlay from '~/components/ui/dialog/DialogOverlay.vue'
import UiDialogContent from '~/components/ui/dialog/DialogContent.vue'
import UiDialogHeader from '~/components/ui/dialog/DialogHeader.vue'
import UiDialogFooter from '~/components/ui/dialog/DialogFooter.vue'
import UiDialogTitle from '~/components/ui/dialog/DialogTitle.vue'
import UiDialogDescription from '~/components/ui/dialog/DialogDescription.vue'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '~/components/ui/select'
import { useDragReorderList } from '~/composables/useDragReorderList'

export type AdminSortModalMode = 'subjects' | 'chapters' | 'lessons' | 'categories'

type SortRow = { id: string; label: string }

type LessonSortKind = 'category' | 'chapter' | 'subject'

const props = defineProps<{ open: boolean; mode: AdminSortModalMode }>()
const emit = defineEmits<{ close: []; saved: [] }>()

const adminFetch = useAdminFetch()

const loading = ref(false)
const listLoading = ref(false)
const saveLoading = ref(false)
const selGrade = ref('')
const selSubject = ref('')
const selChapter = ref('')
const selCategory = ref('')
const lessonKind = ref<LessonSortKind>('chapter')

const grades = ref<{ id: string; name: string }[]>([])
const subjects = ref<{ id: string; name: string; grade_id: string; order: number }[]>([])
const chapters = ref<{ id: string; title: string; grade_id: string; subject_id: string; order: number }[]>([])
const categories = ref<{ id: string; name: string; order: number }[]>([])

const orderedRows = ref<SortRow[]>([])
const { onDragStart, onDragEnd, onDragOver, onDrop } = useDragReorderList(orderedRows)

let lessonFetchGen = 0

const filteredSubjects = computed(() =>
  selGrade.value ? subjects.value.filter(s => s.grade_id === selGrade.value) : [],
)
const filteredChapters = computed(() =>
  selSubject.value ? chapters.value.filter(c => c.subject_id === selSubject.value) : [],
)

const modalTitle = computed(() => {
  switch (props.mode) {
    case 'subjects': return 'Ταξινόμηση μαθημάτων'
    case 'chapters': return 'Ταξινόμηση κεφαλαίων'
    case 'lessons': return 'Ταξινόμηση υλικού'
    case 'categories': return 'Ταξινόμηση κατηγοριών'
    default: return 'Ταξινόμηση'
  }
})

const lessonTargetReady = computed(() => {
  if (lessonKind.value === 'category') return !!selCategory.value
  if (lessonKind.value === 'subject') return !!selSubject.value
  return !!selChapter.value
})

const showList = computed(() => {
  if (props.mode === 'categories') return true
  if (props.mode === 'subjects') return !!selGrade.value
  if (props.mode === 'chapters') return !!selGrade.value && !!selSubject.value
  return lessonTargetReady.value || listLoading.value
})

function resetState() {
  lessonFetchGen++
  listLoading.value = false
  selGrade.value = ''
  selSubject.value = ''
  selChapter.value = ''
  selCategory.value = ''
  lessonKind.value = 'chapter'
  orderedRows.value = []
}

function syncSubjectRows() {
  if (!selGrade.value) {
    orderedRows.value = []
    return
  }
  orderedRows.value = subjects.value
    .filter(s => s.grade_id === selGrade.value)
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
    .map(s => ({ id: s.id, label: s.name }))
}

function syncChapterRows() {
  if (!selSubject.value) {
    orderedRows.value = []
    return
  }
  orderedRows.value = chapters.value
    .filter(c => c.subject_id === selSubject.value)
    .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
    .map(c => ({ id: c.id, label: c.title }))
}

function onLessonTypeChange(next: LessonSortKind) {
  lessonFetchGen++
  listLoading.value = false
  orderedRows.value = []
  selGrade.value = ''
  selSubject.value = ''
  selChapter.value = ''
  selCategory.value = ''
  lessonKind.value = next
}

async function loadLessons() {
  const kind = lessonKind.value
  const categoryId = selCategory.value
  const subjectId = selSubject.value
  const chapterId = selChapter.value
  if (kind === 'category' && !categoryId) return
  if (kind === 'subject' && !subjectId) return
  if (kind === 'chapter' && !chapterId) return

  const gen = ++lessonFetchGen
  listLoading.value = true
  try {
    const query = kind === 'category'
      ? { category_id: categoryId }
      : kind === 'subject'
        ? { subject_id: subjectId }
        : { chapter_id: chapterId }
    const page = await adminFetch<{
      items: { id: string; title: string; order: number }[]
      total?: number
      truncated?: boolean
    }>('/api/lessons', {
      query: { ...query, all: '1' },
    })
    if (gen !== lessonFetchGen) return
    orderedRows.value = [...(page.items ?? [])]
      .sort((a, b) => a.order - b.order || a.title.localeCompare(b.title))
      .map(l => ({ id: l.id, label: l.title }))
    if (page.truncated) {
      toast.error('Φορτώθηκαν μόνο τα πρώτα 500 μαθήματα. Η αναδιάταξη είναι ελλιπής.')
    }
  } catch {
    if (gen !== lessonFetchGen) return
    orderedRows.value = []
    toast.error('Κάτι πήγε στραβά')
  } finally {
    if (gen === lessonFetchGen) listLoading.value = false
  }
}

watch(() => props.open, async (open) => {
  if (!open) {
    resetState()
    return
  }
  loading.value = true
  resetState()
  try {
    const [gr, sub, ch, cat] = await Promise.all([
      adminFetch<{ id: string; name: string }[]>('/api/admin/grades'),
      adminFetch<{ id: string; name: string; grade_id: string; order: number }[]>('/api/admin/subjects'),
      adminFetch<{ id: string; title: string; grade_id: string; subject_id: string; order: number }[]>('/api/admin/chapters'),
      adminFetch<{ id: string; name: string; order: number }[]>('/api/admin/categories'),
    ])
    grades.value = gr
    subjects.value = sub
    chapters.value = ch
    categories.value = cat

    if (props.mode === 'categories') {
      orderedRows.value = [...cat]
        .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name))
        .map(c => ({ id: c.id, label: c.name }))
    }
  } catch {
    toast.error('Κάτι πήγε στραβά')
    emit('close')
  } finally {
    loading.value = false
  }
})

watch(selGrade, () => {
  selSubject.value = ''
  selChapter.value = ''
  if (props.mode === 'subjects') syncSubjectRows()
  if (props.mode === 'chapters') orderedRows.value = []
})

watch(selSubject, () => {
  selChapter.value = ''
  if (props.mode === 'chapters') syncChapterRows()
  if (props.mode === 'lessons' && lessonKind.value === 'subject') {
    if (selSubject.value) loadLessons()
    else {
      lessonFetchGen++
      listLoading.value = false
      orderedRows.value = []
    }
  }
})

watch(selChapter, () => {
  if (props.mode !== 'lessons' || lessonKind.value !== 'chapter') return
  if (selChapter.value) loadLessons()
  else {
    lessonFetchGen++
    listLoading.value = false
    orderedRows.value = []
  }
})

watch(selCategory, () => {
  if (props.mode !== 'lessons' || lessonKind.value !== 'category') return
  if (selCategory.value) loadLessons()
  else {
    lessonFetchGen++
    listLoading.value = false
    orderedRows.value = []
  }
})

async function saveOrder() {
  if (!orderedRows.value.length) return
  saveLoading.value = true
  try {
    const ids = orderedRows.value.map(r => r.id)
    if (props.mode === 'subjects') {
      await adminFetch('/api/admin/subjects/reorder', {
        method: 'PATCH',
        body: { grade_id: selGrade.value, ids },
      })
    } else if (props.mode === 'chapters') {
      await adminFetch('/api/admin/chapters/reorder', {
        method: 'PATCH',
        body: { subject_id: selSubject.value, ids },
      })
    } else if (props.mode === 'categories') {
      await adminFetch('/api/admin/categories/reorder', {
        method: 'PATCH',
        body: { ids },
      })
    } else if (props.mode === 'lessons') {
      if (lessonKind.value === 'category') {
        await adminFetch('/api/admin/lessons/reorder', {
          method: 'PATCH',
          body: { category_id: selCategory.value, ids },
        })
      } else if (lessonKind.value === 'chapter') {
        await adminFetch('/api/admin/lessons/reorder', {
          method: 'PATCH',
          body: { chapter_id: selChapter.value, ids },
        })
      } else if (lessonKind.value === 'subject') {
        await adminFetch('/api/admin/lessons/reorder', {
          method: 'PATCH',
          body: { subject_id: selSubject.value, ids },
        })
      }
    }
    toast.success('Η σειρά αποθηκεύτηκε')
    emit('saved')
    emit('close')
  } catch {
    toast.error('Αποτυχία αποθήκευσης σειράς')
  } finally {
    saveLoading.value = false
  }
}
</script>

<template>
  <UiDialog :open="props.open" @update:open="(v: boolean) => !v && emit('close')">
    <UiDialogPortal>
      <UiDialogOverlay />
      <UiDialogContent
        class="max-h-[90vh] overflow-y-auto"
        :class="mode === 'lessons' ? 'max-w-5xl' : 'max-w-lg'"
      >
        <UiDialogHeader>
          <UiDialogTitle>{{ modalTitle }}</UiDialogTitle>
          <UiDialogDescription class="sr-only">Αναδιάταξη στοιχείων και αποθήκευση.</UiDialogDescription>
        </UiDialogHeader>

        <div v-if="loading" class="py-12 text-center text-muted-foreground">
          Φόρτωση...
        </div>

        <template v-else>
          <div v-if="mode === 'subjects'" class="space-y-1.5 py-2">
            <UiLabel>Επίλεξε τάξη.</UiLabel>
            <Select v-model="selGrade">
              <SelectTrigger>
                <SelectValue placeholder="Επιλογή τάξης…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="g in grades" :key="g.id" :value="g.id">{{ g.name }}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div v-else-if="mode === 'chapters'" class="flex flex-col gap-3 py-2 sm:flex-row sm:items-end">
            <div class="min-w-0 flex-1 space-y-1.5">
              <UiLabel>Επίλεξε τάξη.</UiLabel>
              <Select v-model="selGrade">
                <SelectTrigger>
                  <SelectValue placeholder="Επιλογή τάξης…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="g in grades" :key="g.id" :value="g.id">{{ g.name }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="min-w-0 flex-1 space-y-1.5">
              <UiLabel>Επίλεξε μάθημα.</UiLabel>
              <Select v-model="selSubject">
                <SelectTrigger>
                  <SelectValue placeholder="Επιλογή μαθήματος…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="s in filteredSubjects" :key="s.id" :value="s.id">{{ s.name }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div v-else-if="mode === 'lessons'" class="flex items-end gap-3 py-2">
            <div class="min-w-0 flex-1 space-y-1.5">
              <UiLabel>Τύπος</UiLabel>
              <Select
                :model-value="lessonKind"
                @update:model-value="(v) => onLessonTypeChange(String(v) as LessonSortKind)"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="subject">Μάθημα</SelectItem>
                  <SelectItem value="chapter">Κεφάλαιο</SelectItem>
                  <SelectItem value="category">Κατηγορία</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <template v-if="lessonKind === 'subject'">
              <div class="min-w-0 flex-1 space-y-1.5">
                <UiLabel>Τάξη</UiLabel>
                <Select v-model="selGrade">
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλογή τάξης…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="g in grades" :key="g.id" :value="g.id">{{ g.name }}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div v-if="selGrade" class="min-w-0 flex-1 space-y-1.5">
                <UiLabel>Μάθημα</UiLabel>
                <Select v-model="selSubject">
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλογή μαθήματος…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="s in filteredSubjects" :key="s.id" :value="s.id">{{ s.name }}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </template>

            <template v-else-if="lessonKind === 'chapter'">
              <div class="min-w-0 flex-1 space-y-1.5">
                <UiLabel>Τάξη</UiLabel>
                <Select v-model="selGrade">
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλογή τάξης…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="g in grades" :key="g.id" :value="g.id">{{ g.name }}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div v-if="selGrade" class="min-w-0 flex-1 space-y-1.5">
                <UiLabel>Μάθημα</UiLabel>
                <Select v-model="selSubject">
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλογή μαθήματος…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="s in filteredSubjects" :key="s.id" :value="s.id">{{ s.name }}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div v-if="selSubject" class="min-w-0 flex-1 space-y-1.5">
                <UiLabel>Κεφάλαιο</UiLabel>
                <Select v-model="selChapter">
                  <SelectTrigger>
                    <SelectValue placeholder="Επιλογή κεφαλαίου…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="c in filteredChapters" :key="c.id" :value="c.id">{{ c.title }}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </template>

            <div v-else class="min-w-0 flex-1 space-y-1.5">
              <UiLabel>Κατηγορία</UiLabel>
              <Select v-model="selCategory">
                <SelectTrigger>
                  <SelectValue placeholder="Επιλογή κατηγορίας…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="c in categories" :key="c.id" :value="c.id">{{ c.name }}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div v-if="showList" class="space-y-3 py-2">
            <p v-if="listLoading" class="py-6 text-center text-sm text-muted-foreground">
              Φόρτωση...
            </p>
            <template v-else-if="orderedRows.length">
              <p class="text-sm text-muted-foreground">Σύρε τις γραμμές για νέα σειρά και αποθήκευσε.</p>
              <div
                v-for="(row, index) in orderedRows"
                :key="row.id"
                class="flex items-center gap-3 rounded-lg border border-border bg-card p-3 transition-opacity"
                draggable="true"
                @dragstart="onDragStart($event, index)"
                @dragend="onDragEnd"
                @dragover="onDragOver"
                @drop="onDrop($event, index)"
              >
                <div class="cursor-grab active:cursor-grabbing shrink-0 rounded p-1 text-muted-foreground hover:bg-muted" aria-hidden="true">
                  <VIcon name="bi-grip-vertical" class="size-5" />
                </div>
                <span class="min-w-0 flex-1 font-medium">{{ row.label }}</span>
              </div>
            </template>
            <div v-else class="py-6 text-center text-sm text-muted-foreground">
              Δεν υπάρχει κάτι για ταξινόμηση.
            </div>
          </div>
        </template>

        <UiDialogFooter class="gap-2 sm:gap-0">
          <UiButton variant="cancel" @click="emit('close')">Ακύρωση</UiButton>
          <UiButton
            v-if="!loading && !listLoading && orderedRows.length > 0"
            :disabled="saveLoading"
            @click="saveOrder"
          >
            {{ saveLoading ? 'Φόρτωση...' : 'Αποθήκευση σειράς' }}
          </UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialogPortal>
  </UiDialog>
</template>
