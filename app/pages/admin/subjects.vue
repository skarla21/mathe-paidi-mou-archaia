<script setup lang="ts">
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
import AdminSubjectModal from "~/components/admin/SubjectModal.vue";
import AdminListCount from "~/components/admin/AdminListCount.vue";
import AdminSortModal from "~/components/admin/AdminSortModal.vue";
import type { Subject } from "~/types/database";

definePageMeta({ layout: "admin", middleware: "admin" });
useHead(() => ({ title: "Διαχείριση - Μαθήματα" }));

const adminFetch = useAdminFetch();
const storedImageSrc = useStoredImageSrc();
const subjects = ref<Subject[]>([]);
const grades = ref<{ id: string; name: string }[]>([]);
const loading = ref(true);
const search = ref("");
const gradeId = ref("__all__");
const modalOpen = ref(false);
const sortModalOpen = ref(false);
const editingSubject = ref<Subject | null>(null);
const deleteDialogOpen = ref(false);
const deletingId = ref<string | null>(null);
const deleteLoading = ref(false);

const filteredSubjects = computed(() => {
  let list = subjects.value;
  if (search.value) {
    const q = search.value.toLowerCase();
    list = list.filter((s) => s.name.toLowerCase().includes(q));
  }
  if (gradeId.value && gradeId.value !== "__all__")
    list = list.filter((s) => s.grade_id === gradeId.value);
  return list;
});

function breadcrumb(s: Subject) {
  const gradeName = s.grades?.name ?? "";
  return gradeName ? `${gradeName} > ${s.name}` : s.name;
}

async function fetchAll() {
  loading.value = true;
  try {
    const [sub, gr] = await Promise.all([
      adminFetch<Subject[]>("/api/admin/subjects"),
      adminFetch<{ id: string; name: string }[]>("/api/admin/grades"),
    ]);
    subjects.value = sub;
    grades.value = gr;
  } catch {
    subjects.value = [];
    toast.error("Κάτι πήγε στραβά");
  } finally {
    loading.value = false;
  }
}

onMounted(fetchAll);

function openCreate() {
  editingSubject.value = null;
  modalOpen.value = true;
}
function openEdit(s: Subject) {
  editingSubject.value = s;
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
    await adminFetch(`/api/admin/subjects/${deletingId.value}`, {
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
          Μαθήματα<AdminListCount
            v-if="!loading"
            :shown="filteredSubjects.length"
            :total="subjects.length"
          />
        </h1>
      </div>
      <div class="flex items-center gap-2">
        <UiButton variant="outline" @click="sortModalOpen = true">
          <VIcon name="bi-arrow-down-up" class="mr-2 size-4" />
          Ταξινόμηση μαθημάτων
        </UiButton>
        <UiButton @click="openCreate">
          <VIcon name="bi-plus-circle" class="mr-2 size-4" />
          Δημιουργία
        </UiButton>
      </div>
    </div>

    <!-- Filters -->
    <div class="flex flex-wrap items-center gap-4 mb-6">
      <Select v-model="gradeId">
        <SelectTrigger class="w-50">
          <SelectValue placeholder="Επιλογή τάξης…" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all__">Επιλογή τάξης…</SelectItem>
          <SelectItem v-for="g in grades" :key="g.id" :value="g.id">{{
            g.name
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
        v-if="!filteredSubjects.length"
        class="rounded-lg border border-dashed p-12 text-center text-muted-foreground"
      >
        <VIcon name="bi-inbox" class="size-12 mx-auto mb-3 opacity-50" />
        <p>Δεν υπάρχουν μαθήματα. Δημιούργησε το πρώτο.</p>
      </div>
      <div v-else class="space-y-3">
        <UiCard
          v-for="s in filteredSubjects"
          :key="s.id"
          class="rounded-2xl border-border"
        >
          <UiCardContent class="p-4 flex items-center gap-4">
            <img
              v-if="storedImageSrc(s.image_url)"
              :src="storedImageSrc(s.image_url)"
              :alt="s.name"
              class="size-12 shrink-0 rounded-xl object-cover"
            >
            <UiIconWell v-else>
              <VIcon name="bi-journal-text" class="size-5" aria-hidden="true" />
            </UiIconWell>
            <div class="min-w-0 flex-1">
              <p class="text-sm text-muted-foreground">{{ breadcrumb(s) }}</p>
              <p class="font-semibold">{{ s.name }}</p>
            </div>
            <div class="flex items-center gap-2 shrink-0">
              <UiButton size="sm" variant="outline" @click.stop="openEdit(s)"
                >Επεξεργασία</UiButton
              >
              <UiButton
                size="sm"
                variant="destructive"
                @click.stop="openDelete(s.id)"
                >Διαγραφή</UiButton
              >
            </div>
          </UiCardContent>
        </UiCard>
      </div>
    </template>

    <AdminSubjectModal
      :open="modalOpen"
      :subject="editingSubject"
      @close="modalOpen = false"
      @saved="fetchAll"
    />

    <AdminSortModal
      :open="sortModalOpen"
      mode="subjects"
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
