<script setup lang="ts">
import { toast } from "vue-sonner";
import AdminTablePager from "~/components/admin/AdminTablePager.vue";
import UiButton from "~/components/ui/Button.vue";
import UiInput from "~/components/ui/Input.vue";
import UiSkeleton from "~/components/ui/Skeleton.vue";
import UiCard from "~/components/ui/Card.vue";
import UiCardContent from "~/components/ui/CardContent.vue";
import UiAlertDialogRoot from "~/components/ui/alert-dialog/AlertDialogRoot.vue";
import UiAlertDialogPortal from "~/components/ui/alert-dialog/AlertDialogPortal.vue";
import UiAlertDialogOverlay from "~/components/ui/alert-dialog/AlertDialogOverlay.vue";
import UiAlertDialogContent from "~/components/ui/alert-dialog/AlertDialogContent.vue";
import UiAlertDialogHeader from "~/components/ui/alert-dialog/AlertDialogHeader.vue";
import UiAlertDialogFooter from "~/components/ui/alert-dialog/AlertDialogFooter.vue";
import UiAlertDialogTitle from "~/components/ui/alert-dialog/AlertDialogTitle.vue";
import UiAlertDialogDescription from "~/components/ui/alert-dialog/AlertDialogDescription.vue";
import UiAlertDialogCancel from "~/components/ui/alert-dialog/AlertDialogCancel.vue";
import UiAlertDialogAction from "~/components/ui/alert-dialog/AlertDialogAction.vue";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import AdminLessonModal from "~/components/admin/LessonModal.vue";
import AdminListCount from "~/components/admin/AdminListCount.vue";
import AdminSortModal from "~/components/admin/AdminSortModal.vue";
import AdminLessonDetailModal from "~/components/admin/LessonDetailModal.vue";
import type { AdminListPage } from "~~/types/domain";
import type { Lesson } from "~/types/database";

type Chapter = {
  id: string;
  title: string;
  grade_id: string;
  subject_id: string;
};
type Subject = { id: string; name: string; grade_id: string };
type Category = { id: string; name: string };

definePageMeta({ layout: "admin", middleware: "admin" });
useHead(() => ({ title: "Διαχείριση - Υλικό" }));

const adminFetch = useAdminFetch();
const grades = ref<{ id: string; name: string }[]>([]);
const subjects = ref<Subject[]>([]);
const chapters = ref<Chapter[]>([]);
const categories = ref<Category[]>([]);
const metaLoading = ref(true);
const search = ref("");
const gradeId = ref("__all__");
const subjectId = ref("__all__");
const chapterId = ref("__all__");
const categoryId = ref("__all__");
const modalOpen = ref(false);
const sortModalOpen = ref(false);
const editingLesson = ref<Lesson | null>(null);
const deleteDialogOpen = ref(false);
const deletingId = ref<string | null>(null);
const deleteLoading = ref(false);
const detailModalOpen = ref(false);
const detailLessonId = ref<string | null>(null);

const filteredSubjects = computed(() =>
  gradeId.value && gradeId.value !== "__all__"
    ? subjects.value.filter((s) => s.grade_id === gradeId.value)
    : [],
);
const filteredChapters = computed(() =>
  subjectId.value && subjectId.value !== "__all__"
    ? chapters.value.filter((c) => c.subject_id === subjectId.value)
    : [],
);

function filterQuery() {
  return {
    q: search.value.trim(),
    ...(gradeId.value !== "__all__" ? { grade_id: gradeId.value } : {}),
    ...(subjectId.value !== "__all__" ? { subject_id: subjectId.value } : {}),
    ...(chapterId.value !== "__all__" ? { chapter_id: chapterId.value } : {}),
    ...(categoryId.value !== "__all__" ? { category_id: categoryId.value } : {}),
  };
}

const {
  page,
  total,
  pageSize,
  items: lessons,
  loading,
  ready,
  load,
  onSearchInput,
  onSortChange,
} = useAdminTablePage<Lesson>(
  (pageNumber) =>
    adminFetch<AdminListPage<Lesson>>("/api/admin/lessons", {
      query: { page: pageNumber, ...filterQuery() },
    }),
  () => toast.error("Κάτι πήγε στραβά"),
);

watch(gradeId, () => {
  subjectId.value = "__all__";
  chapterId.value = "__all__";
  if (gradeId.value && gradeId.value !== "__all__")
    categoryId.value = "__all__";
  onSortChange();
});
watch(subjectId, () => {
  chapterId.value = "__all__";
  if (subjectId.value && subjectId.value !== "__all__")
    categoryId.value = "__all__";
  onSortChange();
});
watch(chapterId, () => {
  if (chapterId.value && chapterId.value !== "__all__")
    categoryId.value = "__all__";
  onSortChange();
});
watch(categoryId, () => {
  if (categoryId.value && categoryId.value !== "__all__") {
    gradeId.value = "__all__";
    subjectId.value = "__all__";
    chapterId.value = "__all__";
  }
  onSortChange();
});
watch(search, () => {
  onSearchInput();
});

async function fetchMeta() {
  metaLoading.value = true;
  try {
    const [gr, sub, ch, cat] = await Promise.all([
      adminFetch<{ id: string; name: string }[]>("/api/admin/grades"),
      adminFetch<Subject[]>("/api/admin/subjects"),
      adminFetch<Chapter[]>("/api/admin/chapters"),
      adminFetch<Category[]>("/api/admin/categories"),
    ]);
    grades.value = gr;
    subjects.value = sub;
    chapters.value = ch;
    categories.value = cat;
  } catch {
    toast.error("Κάτι πήγε στραβά");
  } finally {
    metaLoading.value = false;
  }
}

onMounted(async () => {
  await fetchMeta();
  await load();
});

function openCreate() {
  editingLesson.value = null;
  modalOpen.value = true;
}
function openEdit(l: Lesson) {
  editingLesson.value = l;
  modalOpen.value = true;
}
function openDelete(id: string) {
  deletingId.value = id;
  deleteDialogOpen.value = true;
}
function openDetail(id: string) {
  detailLessonId.value = id;
  detailModalOpen.value = true;
}

async function confirmDelete() {
  if (!deletingId.value) return;
  deleteLoading.value = true;
  try {
    await adminFetch(`/api/admin/lessons/${deletingId.value}`, {
      method: "DELETE",
    });
    await load();
    deleteDialogOpen.value = false;
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } };
    toast.error(err?.data?.message ?? "Κάτι πήγε στραβά");
  } finally {
    deleteLoading.value = false;
  }
}

function placementPath(parts: Array<string | null | undefined>): string {
  return parts
    .filter((part): part is string => Boolean(part?.trim()))
    .join(" › ");
}

function placementSummary(lesson: Lesson): string {
  if (!lesson.placements?.length) return "";
  return lesson.placements
    .map((p) => {
      if (p.chapter_id) {
        const chapter = chapters.value.find((c) => c.id === p.chapter_id);
        const subject = subjects.value.find(
          (s) => s.id === (chapter?.subject_id ?? p.chapters?.subject_id),
        );
        const grade = grades.value.find(
          (g) =>
            g.id ===
            (chapter?.grade_id ?? p.chapters?.grade_id ?? subject?.grade_id),
        );
        return placementPath([
          grade?.name,
          subject?.name,
          chapter?.title ?? p.chapters?.title,
        ]);
      }
      if (p.subject_id) {
        const subject = subjects.value.find((s) => s.id === p.subject_id);
        const grade = grades.value.find(
          (g) => g.id === (subject?.grade_id ?? p.subjects?.grade_id),
        );
        return placementPath([grade?.name, subject?.name ?? p.subjects?.name]);
      }
      const category = categories.value.find((c) => c.id === p.category_id);
      return category?.name ?? p.categories?.name ?? "";
    })
    .filter(Boolean)
    .join(", ");
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold font-heading">
          Υλικό<AdminListCount
            v-if="ready"
            :shown="lessons.length"
            :total="total"
          />
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <UiButton variant="outline" @click="sortModalOpen = true">
          <VIcon name="bi-arrow-down-up" class="mr-2 size-4" />
          Ταξινόμηση υλικού
        </UiButton>
        <UiButton @click="openCreate">
          <VIcon name="bi-plus-circle" class="mr-2 size-4" />
          Δημιουργία
        </UiButton>
      </div>
    </div>

    <div class="flex flex-wrap items-center gap-4 mb-6">
      <Select v-model="gradeId">
        <SelectTrigger class="w-40">
          <SelectValue placeholder="Επιλογή τάξης…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Επιλογή τάξης…</SelectItem>
          <SelectItem v-for="g in grades" :key="g.id" :value="g.id">{{
            g.name
          }}</SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="subjectId">
        <SelectTrigger class="w-40">
          <SelectValue placeholder="Επιλογή μαθήματος…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Επιλογή μαθήματος…</SelectItem>
          <SelectItem v-for="s in filteredSubjects" :key="s.id" :value="s.id">{{
            s.name
          }}</SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="chapterId">
        <SelectTrigger class="w-45">
          <SelectValue placeholder="Επιλογή κεφαλαίου…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Επιλογή κεφαλαίου…</SelectItem>
          <SelectItem v-for="c in filteredChapters" :key="c.id" :value="c.id">{{
            c.title
          }}</SelectItem>
        </SelectContent>
      </Select>
      <Select v-model="categoryId">
        <SelectTrigger class="w-40">
          <SelectValue placeholder="Επιλογή κατηγορίας…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Επιλογή κατηγορίας…</SelectItem>
          <SelectItem v-for="c in categories" :key="c.id" :value="c.id">{{
            c.name
          }}</SelectItem>
        </SelectContent>
      </Select>
      <div class="relative flex-1 min-w-50">
        <VIcon
          name="bi-search"
          class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
        />
        <UiInput v-model="search" placeholder="Αναζήτηση..." class="pl-9" />
      </div>
    </div>

    <template v-if="(loading && !ready) || metaLoading">
      <div class="space-y-3">
        <UiCard v-for="i in 5" :key="i" class="rounded-2xl border-border">
          <UiCardContent class="p-4 flex items-center gap-4">
            <UiSkeleton class="size-10 shrink-0 rounded-full" />
            <UiSkeleton class="h-4 flex-1" />
          </UiCardContent>
        </UiCard>
      </div>
    </template>

    <template v-else>
      <div
        v-if="!lessons.length"
        class="rounded-lg border border-dashed p-12 text-center text-muted-foreground"
      >
        <VIcon name="bi-inbox" class="size-12 mx-auto mb-3 opacity-50" />
        <p>Δεν υπάρχει υλικό ακόμα.</p>
      </div>
      <div v-else class="space-y-3">
        <UiCard v-for="l in lessons" :key="l.id" class="rounded-2xl border-border">
          <UiCardContent class="p-4 flex items-center gap-4">
            <UiIconWell>
              <VIcon
                name="bi-journal-text"
                class="size-5"
                aria-hidden="true"
              />
            </UiIconWell>
            <div class="min-w-0 flex-1">
              <p class="font-semibold">{{ l.title }}</p>
              <div class="flex items-center gap-2 mt-1 flex-wrap">
                <span class="text-xs text-muted-foreground">{{
                  l.is_free ? "Δωρεάν" : "Πληρωμένο"
                }}</span>
                <span v-if="l.content_url" class="text-xs text-muted-foreground"
                  >| Αρχείο</span
                >
                <span
                  v-if="placementSummary(l)"
                  class="min-w-0 text-xs text-muted-foreground"
                  >| {{ placementSummary(l) }}</span
                >
                <span
                  v-if="l.ratingCount"
                  class="text-xs text-muted-foreground flex items-center gap-0.5"
                  >|
                  <VIcon name="bi-star-fill" class="size-3 text-yellow-400" />
                  {{ l.avgRating?.toFixed(1) }} ({{ l.ratingCount }})</span
                >
                <span
                  v-if="l.commentCount"
                  class="text-xs text-muted-foreground flex items-center gap-0.5"
                  >| <VIcon name="bi-chat-text" class="size-3" />
                  {{ l.commentCount }}</span
                >
                <span
                  v-if="l.tags?.length"
                  class="flex items-center gap-1 flex-wrap text-xs text-muted-foreground"
                >
                  |
                  <span
                    v-for="tag in l.tags"
                    :key="tag"
                    class="rounded bg-muted px-1.5 py-0.5"
                    >{{ tag }}</span
                  >
                </span>
              </div>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <UiButton
                size="sm"
                variant="outline"
                @click.stop="openDetail(l.id)"
              >
                <VIcon name="bi-eye" class="mr-1 size-3.5" />Λεπτομέρειες
              </UiButton>
              <UiButton size="sm" variant="outline" @click.stop="openEdit(l)"
                >Επεξεργασία</UiButton
              >
              <UiButton
                size="sm"
                variant="destructive"
                @click.stop="openDelete(l.id)"
                >Διαγραφή</UiButton
              >
            </div>
          </UiCardContent>
        </UiCard>
      </div>
      <AdminTablePager
        v-model:page="page"
        :total="total"
        :page-size="pageSize"
        :disabled="loading"
      />
    </template>

    <AdminLessonModal
      :open="modalOpen"
      :lesson="editingLesson"
      :lessons="lessons"
      @close="modalOpen = false"
      @saved="load"
    />
    <AdminLessonDetailModal
      :open="detailModalOpen"
      :lesson-id="detailLessonId"
      @close="detailModalOpen = false"
    />

    <AdminSortModal
      :open="sortModalOpen"
      mode="lessons"
      @close="sortModalOpen = false"
      @saved="load"
    />

    <UiAlertDialogRoot v-model:open="deleteDialogOpen">
      <UiAlertDialogPortal>
        <UiAlertDialogOverlay />
        <UiAlertDialogContent>
          <UiAlertDialogHeader>
            <UiAlertDialogTitle>Επιβεβαίωση διαγραφής</UiAlertDialogTitle>
            <UiAlertDialogDescription
              >Είστε σίγουροι; Δεν μπορεί να
              αναιρεθεί.</UiAlertDialogDescription
            >
          </UiAlertDialogHeader>
          <UiAlertDialogFooter>
            <UiAlertDialogCancel
              ><UiButton variant="cancel"
                >Ακύρωση</UiButton
              ></UiAlertDialogCancel
            >
            <UiAlertDialogAction as-child>
              <UiButton
                variant="destructive"
                :disabled="deleteLoading"
                @click="confirmDelete"
                >Διαγραφή</UiButton
              >
            </UiAlertDialogAction>
          </UiAlertDialogFooter>
        </UiAlertDialogContent>
      </UiAlertDialogPortal>
    </UiAlertDialogRoot>
  </div>
</template>
