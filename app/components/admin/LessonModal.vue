<script setup lang="ts">
import { toast } from "vue-sonner";
import {
  dialogPasteHost,
  pasteLessonFile,
  pointerLeftDropzone,
} from "#shared/utils/clipboardImage.mjs";
import {
  attachmentAfterRemove,
  canStartUpload,
} from "#shared/utils/lessonAttachment.mjs";
import UiDialog from "~/components/ui/dialog/Dialog.vue";
import UiDialogPortal from "~/components/ui/dialog/DialogPortal.vue";
import UiDialogOverlay from "~/components/ui/dialog/DialogOverlay.vue";
import UiDialogContent from "~/components/ui/dialog/DialogContent.vue";
import UiDialogHeader from "~/components/ui/dialog/DialogHeader.vue";
import UiDialogFooter from "~/components/ui/dialog/DialogFooter.vue";
import UiDialogTitle from "~/components/ui/dialog/DialogTitle.vue";
import UiDialogDescription from "~/components/ui/dialog/DialogDescription.vue";
import UiButton from "~/components/ui/Button.vue";
import UiInput from "~/components/ui/Input.vue";
import UiLabel from "~/components/ui/Label.vue";
import UiTextarea from "~/components/ui/Textarea.vue";
import UiProgress from "~/components/ui/Progress.vue";
import { Checkbox } from "~/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

interface PlacementRow {
  key: number;
  type: "subject" | "chapter" | "category";
  gradeId: string;
  subjectId: string;
  chapterId: string;
  categoryId: string;
}

const props = defineProps<{
  open: boolean;
  lesson: {
    id: string;
    title: string;
    content: string | null;
    is_free: boolean;
    content_url: string | null;
    price: number;
    placements?: Array<{
      id: string;
      subject_id: string | null;
      chapter_id: string | null;
      category_id: string | null;
      subjects?: { name: string; grade_id?: string } | null;
      chapters?: {
        title: string;
        grade_id?: string;
        subject_id?: string;
      } | null;
      categories?: { name: string } | null;
    }>;
  } | null;
}>();
const emit = defineEmits<{ close: []; saved: [] }>();
const adminFetch = useAdminFetch();
const {
  uploading,
  progress: uploadProgress,
  statusLabel: uploadStatusLabel,
  upload: uploadAdminFile,
  abort: abortUpload,
} = useAdminFileUpload();

const title = ref("");
const content = ref("");
const isFree = ref(true);
const price = ref(0);
const contentUrl = ref("");
const fileName = ref("");
const savedContentUrl = ref("");
const pendingName = ref("");
const uploadBusy = ref(false);
const sessionUrls = new Set<string>();
let uploadGeneration = 0;

let placementKey = 0;
const placements = ref<PlacementRow[]>([]);

const grades = ref<{ id: string; name: string }[]>([]);
const chapters = ref<
  { id: string; title: string; subject_id: string; grade_id: string }[]
>([]);
const subjects = ref<{ id: string; name: string; grade_id: string }[]>([]);
const categories = ref<{ id: string; name: string }[]>([]);
const loading = ref(false);
const attempted = ref(false);
const dragActive = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);

function fileLabelFromUrl(url: string): string {
  try {
    const segment = decodeURIComponent(
      new URL(url).pathname.split("/").filter(Boolean).pop() || "",
    );
    const name = segment.replace(/^\d{10,}-/, "") || segment;
    const stem = name.replace(/\.[^.]+$/, "");
    // Older uploads replaced Greek (and any non-ASCII) with underscores.
    if (!/[\p{L}\p{N}]/u.test(stem)) return "";
    return name;
  } catch {
    return "";
  }
}

function subjectsForGrade(gradeId: string) {
  return subjects.value.filter((s) => s.grade_id === gradeId);
}

function chaptersForSubject(subjectId: string) {
  return chapters.value.filter((c) => c.subject_id === subjectId);
}

function addPlacement() {
  placements.value.push({
    key: placementKey++,
    type: "chapter",
    gradeId: "",
    subjectId: "",
    chapterId: "",
    categoryId: "",
  });
}

function removePlacement(key: number) {
  if (placements.value.length <= 1) return;
  placements.value = placements.value.filter((p) => p.key !== key);
}

function onPlacementTypeChange(
  row: PlacementRow,
  newType: "subject" | "chapter" | "category",
) {
  row.type = newType;
  row.gradeId = "";
  row.subjectId = "";
  row.chapterId = "";
  row.categoryId = "";
}

function onPlacementGradeChange(row: PlacementRow, newGradeId: string) {
  row.gradeId = newGradeId;
  row.subjectId = "";
  row.chapterId = "";
}

function onPlacementSubjectChange(row: PlacementRow, newSubjectId: string) {
  row.subjectId = newSubjectId;
  row.chapterId = "";
}

function rowGap(
  row: PlacementRow,
): "grade" | "subject" | "chapter" | "category" | null {
  if (row.type === "category") return row.categoryId ? null : "category";
  if (!row.gradeId) return "grade";
  if (!row.subjectId) return "subject";
  if (row.type === "chapter" && !row.chapterId) return "chapter";
  return null;
}

function placementGap(
  row: PlacementRow,
): "grade" | "subject" | "chapter" | "category" | null {
  if (!attempted.value) return null;
  if (placements.value.some((candidate) => !rowGap(candidate))) return null;
  return rowGap(row);
}

function placementLocation(row: PlacementRow): string | null {
  if (row.type === "category") {
    return row.categoryId ? `category:${row.categoryId}` : null;
  }
  if (row.type === "subject") {
    return row.subjectId ? `subject:${row.subjectId}` : null;
  }
  return row.chapterId ? `chapter:${row.chapterId}` : null;
}

const duplicatePlacementKeys = computed(() => {
  const firstKey = new Map<string, number>();
  const duplicates = new Set<number>();
  for (const row of placements.value) {
    const location = placementLocation(row);
    if (!location) continue;
    const existing = firstKey.get(location);
    if (existing === undefined) {
      firstKey.set(location, row.key);
      continue;
    }
    duplicates.add(existing);
    duplicates.add(row.key);
  }
  return duplicates;
});

const titleMissing = computed(() => attempted.value && !title.value.trim());

function fileExtension(value: string): string {
  const clean = value.split("?")[0]?.split("#")[0] ?? "";
  const base = clean.split("/").pop() ?? "";
  const dot = base.lastIndexOf(".");
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : "";
}

const shownName = computed(() => pendingName.value || fileName.value);

const attachedKind = computed(() => {
  const ext = fileExtension(shownName.value) || fileExtension(contentUrl.value);
  if (ext === "pdf") return "PDF";
  if (ext === "png") return "PNG";
  if (ext === "jpg" || ext === "jpeg") return "JPG";
  return "";
});

const hasAttachment = computed(
  () => Boolean(contentUrl.value) || Boolean(shownName.value),
);

watch(
  () => props.open,
  async (val) => {
    if (!val) {
      if (!loading.value) {
        abortUpload();
        void discardSessionUrls();
      }
      return;
    }
    attempted.value = false;

    title.value = props.lesson?.title ?? "";
    content.value = props.lesson?.content ?? "";
    isFree.value = props.lesson?.is_free ?? true;
    price.value = props.lesson?.price ?? 0;
    uploadGeneration += 1;
    pendingName.value = "";
    uploadBusy.value = false;
    sessionUrls.clear();
    savedContentUrl.value = props.lesson?.content_url ?? "";
    contentUrl.value = savedContentUrl.value;
    fileName.value = contentUrl.value ? fileLabelFromUrl(contentUrl.value) : "";
    placements.value = [];

    try {
      const [gr, ch, sub, cat] = await Promise.all([
        adminFetch<{ id: string; name: string }[]>("/api/admin/grades"),
        adminFetch<
          { id: string; title: string; subject_id: string; grade_id: string }[]
        >("/api/admin/chapters"),
        adminFetch<{ id: string; name: string; grade_id: string }[]>(
          "/api/admin/subjects",
        ),
        adminFetch<{ id: string; name: string }[]>("/api/admin/categories"),
      ]);
      grades.value = gr;
      chapters.value = ch;
      subjects.value = sub;
      categories.value = cat;

      if (props.lesson?.placements && props.lesson.placements.length > 0) {
        placements.value = props.lesson.placements.map((p) => {
          const row: PlacementRow = {
            key: placementKey++,
            type: p.chapter_id
              ? "chapter"
              : p.subject_id
                ? "subject"
                : "category",
            gradeId: "",
            subjectId: "",
            chapterId: "",
            categoryId: "",
          };
          if (p.subject_id) {
            const subFound = subjects.value.find((s) => s.id === p.subject_id);
            if (subFound) {
              row.gradeId = subFound.grade_id;
              row.subjectId = subFound.id;
            }
          } else if (p.chapter_id) {
            const chFound = chapters.value.find((c) => c.id === p.chapter_id);
            if (chFound) {
              row.gradeId = chFound.grade_id;
              row.subjectId = chFound.subject_id;
              row.chapterId = chFound.id;
            }
          } else if (p.category_id) {
            row.categoryId = p.category_id;
          }
          return row;
        });
      } else {
        placements.value = [
          {
            key: placementKey++,
            type: "chapter",
            gradeId: "",
            subjectId: "",
            chapterId: "",
            categoryId: "",
          },
        ];
      }
    } catch {
      toast.error("Κάτι πήγε στραβά");
    }
  },
);

async function discardUrl(url: string) {
  if (!url || url === savedContentUrl.value) return;
  try {
    await adminFetch("/api/admin/lesson-content/discard", {
      method: "POST",
      body: { url },
    });
  } catch {
    // The next admin lessons load reaps this file once it is older than 15 minutes.
  }
}

async function discardSessionUrls() {
  const urls = [...sessionUrls];
  sessionUrls.clear();
  await Promise.all(urls.map((url) => discardUrl(url)));
}

async function beginUpload(file: File) {
  if (
    !canStartUpload({
      loading: loading.value,
      uploading: uploading.value || uploadBusy.value,
    })
  )
    return;
  const generation = ++uploadGeneration;
  const previousUrl = contentUrl.value;
  uploadBusy.value = true;
  pendingName.value = file.name;
  try {
    const res = await uploadAdminFile(file, { kind: "lesson" });
    if (generation !== uploadGeneration) {
      if (res?.url) await discardUrl(res.url);
      return;
    }
    if (!res?.url) return;
    if (!props.open || loading.value) {
      await discardUrl(res.url);
      return;
    }
    contentUrl.value = res.url;
    fileName.value = file.name;
    if (
      previousUrl &&
      previousUrl !== savedContentUrl.value &&
      previousUrl !== res.url
    ) {
      sessionUrls.delete(previousUrl);
      void discardUrl(previousUrl);
    }
    if (res.url !== savedContentUrl.value) sessionUrls.add(res.url);
  } finally {
    if (generation === uploadGeneration) {
      uploadBusy.value = false;
      pendingName.value = "";
    }
  }
}

function onFileSelect(e: Event) {
  const input = e.target as HTMLInputElement;
  if (input.files?.[0]) void beginUpload(input.files[0]);
  input.value = "";
}

function onDrop(e: DragEvent) {
  e.preventDefault();
  dragActive.value = false;
  if (
    !canStartUpload({
      loading: loading.value,
      uploading: uploading.value || uploadBusy.value,
    })
  )
    return;
  if (e.dataTransfer?.files?.[0]) void beginUpload(e.dataTransfer.files[0]);
}

function onDragOver(e: DragEvent) {
  e.preventDefault();
  dragActive.value = true;
}

const fileZone = ref<HTMLElement | null>(null);

function onDragLeave(event: DragEvent) {
  if (!pointerLeftDropzone(fileZone.value, event.relatedTarget)) return;
  dragActive.value = false;
}

let pasteHost: HTMLElement | null = null;

function unbindLessonPaste() {
  pasteHost?.removeEventListener("paste", onLessonPaste);
  pasteHost = null;
}

function onLessonPaste(event: ClipboardEvent) {
  const file = pasteLessonFile(event.clipboardData, {
    busy: loading.value || uploading.value || uploadBusy.value,
    target: event.target,
    zone: fileZone.value,
  });
  if (!file) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  void beginUpload(file);
}

function bindLessonPaste(zone: HTMLElement | null) {
  unbindLessonPaste();
  if (!import.meta.client || !zone) return;
  const dialog = dialogPasteHost(zone);
  if (!(dialog instanceof HTMLElement)) return;
  pasteHost = dialog;
  dialog.addEventListener("paste", onLessonPaste);
}

watch(fileZone, (zone) => {
  bindLessonPaste(zone instanceof HTMLElement ? zone : null);
});

onUnmounted(unbindLessonPaste);

function clearContent() {
  if (loading.value) return;
  const cancelling = uploading.value || uploadBusy.value;
  if (cancelling) {
    uploadGeneration += 1;
    pendingName.value = "";
    uploadBusy.value = false;
    abortUpload();
  }
  const next = attachmentAfterRemove({
    uploading: cancelling,
    url: contentUrl.value,
    name: fileName.value,
  });
  const current = contentUrl.value;
  contentUrl.value = next.url;
  fileName.value = next.name;
  if (cancelling) return;
  if (current && current !== savedContentUrl.value) {
    sessionUrls.delete(current);
    void discardUrl(current);
  }
}

async function onSubmit() {
  if (uploading.value || uploadBusy.value) return;
  attempted.value = true;
  const placementPayload = placements.value
    .map((p) => ({
      subject_id: p.type === "subject" ? p.subjectId || null : null,
      chapter_id: p.type === "chapter" ? p.chapterId || null : null,
      category_id: p.type === "category" ? p.categoryId || null : null,
    }))
    .filter((p) => p.subject_id || p.chapter_id || p.category_id);

  if (
    !title.value.trim() ||
    placementPayload.length === 0 ||
    duplicatePlacementKeys.value.size > 0
  ) {
    return;
  }

  loading.value = true;
  try {
    const body = {
      title: title.value,
      content: content.value || null,
      is_free: isFree.value,
      price: isFree.value ? 0 : price.value,
      content_url: contentUrl.value || null,
      placements: placementPayload,
    };
    if (props.lesson) {
      await adminFetch(`/api/admin/lessons/${props.lesson.id}`, {
        method: "PATCH",
        body,
      });
    } else {
      await adminFetch("/api/admin/lessons", { method: "POST", body });
    }
    sessionUrls.clear();
    emit("saved");
    emit("close");
  } catch (e: unknown) {
    if (!props.open) await discardSessionUrls();
    const err = e as { data?: { message?: string } };
    toast.error(err?.data?.message ?? "Κάτι πήγε στραβά");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UiDialog
    :open="props.open"
    @update:open="(v: boolean) => !v && emit('close')"
  >
    <UiDialogPortal>
      <UiDialogOverlay />
      <UiDialogContent class="max-w-5xl max-h-[90vh] overflow-y-auto">
        <UiDialogHeader>
          <UiDialogTitle
            >{{ props.lesson ? "Επεξεργασία" : "Δημιουργία" }} —
            Υλικό</UiDialogTitle
          >
          <UiDialogDescription class="sr-only"
            >Δημιουργία ή επεξεργασία υλικού και ανάθεσή του σε κεφάλαιο, μάθημα
            ή κατηγορία.</UiDialogDescription
          >
        </UiDialogHeader>
        <form class="space-y-6" @submit.prevent="onSubmit">
          <!-- Basic Info -->
          <fieldset class="space-y-4">
            <p
              class="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Περιεχόμενο
            </p>
            <div class="space-y-1.5">
              <UiLabel>Τίτλος</UiLabel>
              <UiInput
                v-model="title"
                :aria-invalid="titleMissing || undefined"
                :class="titleMissing ? 'border-destructive' : ''"
              />
              <p v-if="titleMissing" class="text-xs text-destructive">
                Το πεδίο «Τίτλος» είναι υποχρεωτικό
              </p>
            </div>
            <div class="space-y-1.5">
              <UiLabel>Περιγραφή (προαιρετικό)</UiLabel>
              <UiTextarea v-model="content" :rows="3" />
            </div>
            <div class="space-y-1.5">
              <UiLabel>Αρχείο</UiLabel>
              <div
                ref="fileZone"
                class="rounded-lg border-2 border-dashed p-4 text-center transition-colors"
                :class="
                  dragActive
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/50'
                "
                @drop="onDrop"
                @dragover="onDragOver"
                @dragleave="onDragLeave"
              >
                <div
                  v-if="hasAttachment"
                  class="relative mb-4 rounded-xl border border-primary/30 bg-background p-4 text-left"
                >
                  <div class="flex items-center gap-3 pe-14">
                    <span
                      v-if="attachedKind"
                      class="inline-flex h-10 min-w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-muted/40 px-2 text-xs font-semibold tracking-wide text-foreground"
                    >
                      {{ attachedKind }}
                    </span>
                    <p
                      class="min-w-0 truncate text-sm font-medium text-foreground"
                      :title="shownName || undefined"
                    >
                      {{ shownName || "Επισυνάφθηκε αρχείο" }}
                    </p>
                  </div>
                  <UiButton
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="absolute inset-e-2 top-1/2 size-10 -translate-y-1/2 rounded-full text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-8"
                    :aria-label="
                      uploading || uploadBusy
                        ? 'Ακύρωση μεταφόρτωσης'
                        : 'Αφαίρεση αρχείου'
                    "
                    :disabled="loading"
                    @click.stop="clearContent"
                  >
                    <VIcon name="bi-x" class="size-8" aria-hidden="true" />
                  </UiButton>
                </div>
                <div class="flex flex-col items-center gap-2">
                  <VIcon
                    name="bi-cloud-arrow-up"
                    class="size-8 text-muted-foreground"
                  />
                  <p class="text-sm font-medium">
                    {{
                      hasAttachment
                        ? "Σύρε νέο PDF ή εικόνα για αντικατάσταση, ή κάνε κλικ για επιλογή ή κάνε paste"
                        : "Σύρε και άφησε PDF ή εικόνα εδώ, ή κάνε κλικ για επιλογή ή κάνε paste"
                    }}
                  </p>
                  <p class="text-xs text-muted-foreground">
                    PDF μέγ. 50MB, εικόνες μέγ. 20MB
                  </p>
                  <UiButton
                    type="button"
                    variant="outline"
                    size="sm"
                    :disabled="loading || uploading || uploadBusy"
                    @click="fileInput?.click()"
                  >
                    Επιλογή αρχείου
                  </UiButton>
                  <input
                    ref="fileInput"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png"
                    class="hidden"
                    @change="onFileSelect"
                  />
                </div>
                <UiProgress
                  v-if="uploading"
                  :model-value="uploadProgress"
                  class="mt-3 h-2"
                />
                <p
                  v-if="uploading"
                  class="mt-2 text-xs text-muted-foreground"
                  aria-live="polite"
                >
                  {{ uploadStatusLabel }}
                </p>
                <p
                  v-else-if="!hasAttachment"
                  class="mt-2 text-xs text-muted-foreground"
                >
                  Δεν έχει επιλεγεί αρχείο
                </p>
              </div>
            </div>
          </fieldset>

          <!-- Pricing -->
          <fieldset class="space-y-4">
            <p
              class="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Τιμή
            </p>
            <div class="flex flex-wrap items-center gap-4">
              <div class="flex items-center gap-2">
                <Checkbox id="lesson-free" v-model="isFree" />
                <UiLabel for="lesson-free">Δωρεάν</UiLabel>
              </div>
              <div class="relative min-w-30 max-w-35 flex-1">
                <UiInput
                  v-model.number="price"
                  type="number"
                  min="0"
                  step="0.1"
                  :disabled="isFree"
                  class="pr-8"
                />
                <span
                  class="pointer-events-none absolute inset-e-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground"
                  aria-hidden="true"
                  >€</span
                >
              </div>
            </div>
          </fieldset>

          <!-- Placements -->
          <fieldset class="space-y-4">
            <p
              class="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
            >
              Τοποθετήσεις
            </p>

            <div class="space-y-3">
              <div
                v-for="row in placements"
                :key="row.key"
                class="flex items-end gap-3 rounded-lg border p-3"
                :class="
                  duplicatePlacementKeys.has(row.key)
                    ? 'border-destructive'
                    : 'border-border'
                "
              >
                <div class="min-w-0 flex-1 space-y-1.5">
                  <UiLabel>Τύπος</UiLabel>
                  <Select
                    :model-value="row.type"
                    @update:model-value="
                      (v) =>
                        onPlacementTypeChange(
                          row,
                          String(v) as 'subject' | 'chapter' | 'category',
                        )
                    "
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

                <template v-if="row.type === 'subject'">
                  <div class="min-w-0 flex-1 space-y-1.5">
                    <UiLabel>Τάξη</UiLabel>
                    <Select
                      :model-value="row.gradeId"
                      @update:model-value="
                        (v) => onPlacementGradeChange(row, String(v))
                      "
                    >
                      <SelectTrigger
                        :aria-invalid="
                          placementGap(row) === 'grade' || undefined
                        "
                      >
                        <SelectValue placeholder="Επιλογή τάξης…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="g in grades"
                          :key="g.id"
                          :value="g.id"
                          >{{ g.name }}</SelectItem
                        >
                      </SelectContent>
                    </Select>
                    <p
                      v-if="placementGap(row) === 'grade'"
                      class="text-xs text-destructive"
                    >
                      Το πεδίο «Τάξη» είναι υποχρεωτικό
                    </p>
                  </div>
                  <div v-if="row.gradeId" class="min-w-0 flex-1 space-y-1.5">
                    <UiLabel>Μάθημα</UiLabel>
                    <Select
                      :model-value="row.subjectId"
                      @update:model-value="(v) => (row.subjectId = String(v))"
                    >
                      <SelectTrigger
                        :aria-invalid="
                          placementGap(row) === 'subject' || undefined
                        "
                      >
                        <SelectValue placeholder="Επιλογή μαθήματος…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="s in subjectsForGrade(row.gradeId)"
                          :key="s.id"
                          :value="s.id"
                          >{{ s.name }}</SelectItem
                        >
                      </SelectContent>
                    </Select>
                    <p
                      v-if="placementGap(row) === 'subject'"
                      class="text-xs text-destructive"
                    >
                      Το πεδίο «Μάθημα» είναι υποχρεωτικό
                    </p>
                  </div>
                </template>

                <!-- Chapter cascade -->
                <template v-else-if="row.type === 'chapter'">
                  <div class="min-w-0 flex-1 space-y-1.5">
                    <UiLabel>Τάξη</UiLabel>
                    <Select
                      :model-value="row.gradeId"
                      @update:model-value="
                        (v) => onPlacementGradeChange(row, String(v))
                      "
                    >
                      <SelectTrigger
                        :aria-invalid="
                          placementGap(row) === 'grade' || undefined
                        "
                      >
                        <SelectValue placeholder="Επιλογή τάξης…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="g in grades"
                          :key="g.id"
                          :value="g.id"
                          >{{ g.name }}</SelectItem
                        >
                      </SelectContent>
                    </Select>
                    <p
                      v-if="placementGap(row) === 'grade'"
                      class="text-xs text-destructive"
                    >
                      Το πεδίο «Τάξη» είναι υποχρεωτικό
                    </p>
                  </div>
                  <div v-if="row.gradeId" class="min-w-0 flex-1 space-y-1.5">
                    <UiLabel>Μάθημα</UiLabel>
                    <Select
                      :model-value="row.subjectId"
                      @update:model-value="
                        (v) => onPlacementSubjectChange(row, String(v))
                      "
                    >
                      <SelectTrigger
                        :aria-invalid="
                          placementGap(row) === 'subject' || undefined
                        "
                      >
                        <SelectValue placeholder="Επιλογή μαθήματος…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="s in subjectsForGrade(row.gradeId)"
                          :key="s.id"
                          :value="s.id"
                          >{{ s.name }}</SelectItem
                        >
                      </SelectContent>
                    </Select>
                    <p
                      v-if="placementGap(row) === 'subject'"
                      class="text-xs text-destructive"
                    >
                      Το πεδίο «Μάθημα» είναι υποχρεωτικό
                    </p>
                  </div>
                  <div v-if="row.subjectId" class="min-w-0 flex-1 space-y-1.5">
                    <UiLabel>Κεφάλαιο</UiLabel>
                    <Select v-model="row.chapterId">
                      <SelectTrigger
                        :aria-invalid="
                          placementGap(row) === 'chapter' || undefined
                        "
                      >
                        <SelectValue placeholder="Επιλογή κεφαλαίου…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="c in chaptersForSubject(row.subjectId)"
                          :key="c.id"
                          :value="c.id"
                          >{{ c.title }}</SelectItem
                        >
                      </SelectContent>
                    </Select>
                    <p
                      v-if="placementGap(row) === 'chapter'"
                      class="text-xs text-destructive"
                    >
                      Το πεδίο «Κεφάλαιο» είναι υποχρεωτικό
                    </p>
                  </div>
                </template>

                <!-- Category -->
                <div v-else class="min-w-0 flex-1 space-y-1.5">
                  <UiLabel>Κατηγορία</UiLabel>
                  <Select v-model="row.categoryId">
                    <SelectTrigger
                      :aria-invalid="
                        placementGap(row) === 'category' || undefined
                      "
                    >
                      <SelectValue placeholder="Επιλογή κατηγορίας…" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="cat in categories"
                        :key="cat.id"
                        :value="cat.id"
                        >{{ cat.name }}</SelectItem
                      >
                    </SelectContent>
                  </Select>
                  <p
                    v-if="placementGap(row) === 'category'"
                    class="text-xs text-destructive"
                  >
                    Το πεδίο «Κατηγορία» είναι υποχρεωτικό
                  </p>
                </div>
                <UiButton
                  v-if="placements.length > 1"
                  type="button"
                  variant="ghost"
                  size="sm"
                  class="mb-0.5 shrink-0 text-muted-foreground hover:text-destructive"
                  aria-label="Αφαίρεση τοποθέτησης"
                  @click="removePlacement(row.key)"
                >
                  <VIcon name="bi-trash" class="size-4" />
                </UiButton>
              </div>
            </div>

            <p
              v-if="duplicatePlacementKeys.size > 0"
              class="flex items-center gap-2 text-sm text-destructive"
              role="alert"
            >
              <VIcon name="bi-exclamation-circle" class="size-4 shrink-0" />
              Το υλικό δεν μπορεί να υπάρχει δύο φορές στην ίδια θέση.
            </p>

            <UiButton
              type="button"
              variant="outline"
              size="sm"
              class="gap-1.5"
              @click="addPlacement"
            >
              <VIcon name="bi-plus-circle" class="size-4" />
              Προσθήκη τοποθέτησης
            </UiButton>
          </fieldset>

          <UiDialogFooter>
            <UiButton type="button" variant="cancel" @click="emit('close')"
              >Ακύρωση</UiButton
            >
            <UiButton
              type="submit"
              :disabled="
                loading ||
                uploading ||
                uploadBusy ||
                duplicatePlacementKeys.size > 0
              "
              >{{ loading ? "Φόρτωση..." : "Αποθήκευση" }}</UiButton
            >
          </UiDialogFooter>
        </form>
      </UiDialogContent>
    </UiDialogPortal>
  </UiDialog>
</template>
