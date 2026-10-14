<script setup lang="ts">
import { includesFolded } from "#shared/utils/foldGreekSearch.mjs";
import { toast } from "vue-sonner";
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
import AdminChapterModal from "~/components/admin/ChapterModal.vue";
import AdminListCount from "~/components/admin/AdminListCount.vue";
import AdminSortModal from "~/components/admin/AdminSortModal.vue";
import type { Chapter } from "~/types/database";

definePageMeta({ layout: "admin", middleware: "admin" });
useHead(() => ({ title: "Διαχείριση - Κεφάλαια" }));

const adminFetch = useAdminFetch();
const storedImageSrc = useStoredImageSrc();
const chapters = ref<Chapter[]>([]);
const grades = ref<{ id: string; name: string }[]>([]);
const subjects = ref<{ id: string; name: string; grade_id: string }[]>([]);
const loading = ref(true);
const search = ref("");
const gradeId = ref("__all__");
const subjectId = ref("__all__");
const modalOpen = ref(false);
const sortModalOpen = ref(false);
const editingChapter = ref<Chapter | null>(null);
const deleteDialogOpen = ref(false);
const deletingId = ref<string | null>(null);
const deleteLoading = ref(false);

const filteredChapters = computed(() => {
  let list = chapters.value;
  if (search.value) {
    list = list.filter((c) => includesFolded(c.title, search.value));
  }
  if (gradeId.value && gradeId.value !== "__all__")
    list = list.filter((c) => c.grade_id === gradeId.value);
  if (subjectId.value && subjectId.value !== "__all__")
    list = list.filter((c) => c.subject_id === subjectId.value);
  return list;
});

const filteredSubjects = computed(() =>
  gradeId.value && gradeId.value !== "__all__"
    ? subjects.value.filter((s) => s.grade_id === gradeId.value)
    : [],
);

function breadcrumb(c: Chapter) {
  const grade = grades.value.find((g) => g.id === c.grade_id);
  const subj = c.subjects;
  const parts = [grade?.name ?? "", subj?.name ?? "", c.title].filter(Boolean);
  return parts.join(" > ");
}

async function fetchAll() {
  loading.value = true;
  try {
    const [ch, gr, sub] = await Promise.all([
      adminFetch<Chapter[]>("/api/admin/chapters"),
      adminFetch<{ id: string; name: string }[]>("/api/admin/grades"),
      adminFetch<{ id: string; name: string; grade_id: string }[]>(
        "/api/admin/subjects",
      ),
    ]);
    chapters.value = ch;
    grades.value = gr;
    subjects.value = sub;
  } catch {
    chapters.value = [];
    toast.error("Κάτι πήγε στραβά");
  } finally {
    loading.value = false;
  }
}

watch(gradeId, () => {
  subjectId.value = "__all__";
});

onMounted(fetchAll);

function openCreate() {
  editingChapter.value = null;
  modalOpen.value = true;
}
function openEdit(c: Chapter) {
  editingChapter.value = c;
  modalOpen.value = true;
}
function openDelete(id: string) {
  deletingId.value = id;
  deleteDialogOpen.value = true;
}

async function confirmDelete() {
  if (!deletingId.value) return;
  deleteLoading.value = true;
  try {
    await adminFetch(`/api/admin/chapters/${deletingId.value}`, {
      method: "DELETE",
    });
    await fetchAll();
    deleteDialogOpen.value = false;
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } };
    toast.error(err?.data?.message ?? "Κάτι πήγε στραβά");
  } finally {
    deleteLoading.value = false;
  }
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold font-heading">
          Κεφάλαια<AdminListCount
            v-if="!loading"
            :shown="filteredChapters.length"
            :total="chapters.length"
          />
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <UiButton variant="outline" @click="sortModalOpen = true">
          <VIcon name="bi-arrow-down-up" class="mr-2 size-4" />
          Ταξινόμηση κεφαλαίων
        </UiButton>
        <UiButton @click="openCreate">
          <VIcon name="bi-plus-circle" class="mr-2 size-4" />
          Δημιουργία
        </UiButton>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-4 mb-6">
      <div class="min-w-40">
        <Select v-model="gradeId">
          <SelectTrigger>
            <SelectValue placeholder="Επιλογή τάξης…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Επιλογή τάξης…</SelectItem>
            <SelectItem v-for="g in grades" :key="g.id" :value="g.id">{{
              g.name
            }}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div class="min-w-40">
        <Select v-model="subjectId">
          <SelectTrigger>
            <SelectValue placeholder="Επιλογή μαθήματος…" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__all__">Επιλογή μαθήματος…</SelectItem>
            <SelectItem
              v-for="s in filteredSubjects"
              :key="s.id"
              :value="s.id"
              >{{ s.name }}</SelectItem
            >
          </SelectContent>
        </Select>
      </div>
      <div class="relative flex-1 min-w-50">
        <VIcon
          name="bi-search"
          class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"
        />
        <UiInput v-model="search" placeholder="Αναζήτηση..." class="pl-9" />
      </div>
    </div>

    <!-- Skeleton -->
    <template v-if="loading">
      <div class="space-y-3">
        <UiCard v-for="i in 5" :key="i" class="rounded-2xl border-border">
          <UiCardContent class="p-4 flex items-center gap-4">
            <UiSkeleton class="size-10 shrink-0 rounded-full" />
            <UiSkeleton class="h-4 flex-1" />
          </UiCardContent>
        </UiCard>
      </div>
    </template>

    <!-- Cards -->
    <template v-else>
      <div
        v-if="!filteredChapters.length"
        class="rounded-lg border border-dashed p-12 text-center text-muted-foreground"
      >
        <VIcon name="bi-inbox" class="size-12 mx-auto mb-3 opacity-50" />
        <p>Δεν υπάρχουν κεφάλαια ακόμα.</p>
      </div>
      <div v-else class="space-y-3">
        <UiCard
          v-for="c in filteredChapters"
          :key="c.id"
          class="rounded-2xl border-border"
        >
          <UiCardContent class="p-4 flex items-center gap-4">
            <img
              v-if="storedImageSrc(c.image_url)"
              :src="storedImageSrc(c.image_url)"
              :alt="c.title"
              class="size-12 shrink-0 rounded-xl object-cover"
            >
            <UiIconWell v-else>
              <VIcon
                name="bi-journal-bookmark"
                class="size-5"
                aria-hidden="true"
              />
            </UiIconWell>
            <div class="min-w-0 flex-1">
              <p class="text-xs text-muted-foreground truncate">
                {{ breadcrumb(c) }}
              </p>
              <p class="font-semibold truncate">{{ c.title }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <UiButton size="sm" variant="outline" @click.stop="openEdit(c)"
                >Επεξεργασία</UiButton
              >
              <UiButton
                size="sm"
                variant="destructive"
                @click.stop="openDelete(c.id)"
                >Διαγραφή</UiButton
              >
            </div>
          </UiCardContent>
        </UiCard>
      </div>
    </template>

    <AdminChapterModal
      :open="modalOpen"
      :chapter="editingChapter"
      @close="modalOpen = false"
      @saved="fetchAll"
    />

    <AdminSortModal
      :open="sortModalOpen"
      mode="chapters"
      @close="sortModalOpen = false"
      @saved="fetchAll"
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
