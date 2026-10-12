<script setup lang="ts">
import { toast } from "vue-sonner";
import { closedAvatarBlob } from "#shared/utils/avatarPreview.mjs";
import { AVATAR_MAX_SIZE, PASSWORD_MIN_LENGTH } from "~/lib/validation";
import {
  avatarPreviewAfterSession,
  profileNameAfterSession,
} from "~/utils/profileForm";
import UiButton from "~/components/ui/Button.vue";
import UiDialog from "~/components/ui/dialog/Dialog.vue";
import UiDialogPortal from "~/components/ui/dialog/DialogPortal.vue";
import UiDialogOverlay from "~/components/ui/dialog/DialogOverlay.vue";
import UiDialogContent from "~/components/ui/dialog/DialogContent.vue";
import UiDialogDescription from "~/components/ui/dialog/DialogDescription.vue";
import UiDialogHeader from "~/components/ui/dialog/DialogHeader.vue";
import UiDialogTitle from "~/components/ui/dialog/DialogTitle.vue";
import UiDialogClose from "~/components/ui/dialog/DialogClose.vue";
import UiInput from "~/components/ui/Input.vue";
import UiPasswordInput from "~/components/ui/PasswordInput.vue";
import UiLabel from "~/components/ui/Label.vue";
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

const { isOpen, close } = useEditProfileModal();
const { session, fetchSession, updateUser } = useCurrentUser();

const name = ref("");
const appliedServerName = ref("");
const avatarPreview = ref<string | null>(null);
const avatarUploading = ref(false);
const removeAvatarDialogOpen = ref(false);
const currentPassword = ref("");
const newPassword = ref("");
const confirmPassword = ref("");
const loading = ref(false);

const provider = computed(() => session.value.user?.provider ?? "credentials");
const isCredentials = computed(() => provider.value === "credentials");
const emailVerified = computed(() => !!session.value.user?.email_verified);
const resendVerificationLoading = ref(false);

async function resendVerification() {
  resendVerificationLoading.value = true;
  try {
    await $fetch("/api/user/resend-verification", {
      method: "POST",
      credentials: "include",
    });
    await fetchSession();
    toast.success("Το email επαλήθευσης στάλθηκε");
  } catch (e: unknown) {
    const err = e as {
      data?: { message?: string; statusCode?: number };
      statusCode?: number;
    } | null;
    const status = err?.statusCode ?? err?.data?.statusCode;
    const msg = err?.data?.message ?? "";
    toast.error(
      msg ||
        (status === 429
          ? "Παρακαλώ περίμενε πριν ζητήσεις ξανά email επαλήθευσης"
          : "Αποτυχία αποστολής email επαλήθευσης"),
    );
  } finally {
    resendVerificationLoading.value = false;
  }
}

const fieldClass =
  "h-12 rounded-full border-0 bg-secondary px-5 shadow-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0";

const joinedAt = computed(() => {
  const raw = session.value.user?.created_at;
  if (!raw) return "";
  return new Date(raw).toLocaleDateString("el-GR", {
    year: "numeric",
    month: "long",
  });
});

function applySessionToForm(opening: boolean) {
  const user = session.value.user;
  const nextName = profileNameAfterSession(
    name.value,
    appliedServerName.value,
    user?.name ?? "",
    opening,
  );
  name.value = nextName.draft;
  appliedServerName.value = nextName.appliedServerName;
  const nextPreview = avatarPreviewAfterSession(
    avatarPreview.value,
    user?.avatar_url ?? null,
    opening,
  );
  if (
    opening &&
    avatarPreview.value?.startsWith("blob:") &&
    avatarPreview.value !== nextPreview
  ) {
    URL.revokeObjectURL(avatarPreview.value);
  }
  avatarPreview.value = nextPreview;
}

watch(
  () =>
    [session.value.user?.name ?? "", session.value.user?.avatar_url ?? null] as const,
  () => {
    if (isOpen.value) applySessionToForm(false);
  },
);

// Revoke blob URL when modal closes (modal is permanently mounted — onUnmounted never fires)
watch(isOpen, (open) => {
  if (open) applySessionToForm(true);
  if (!open) removeAvatarDialogOpen.value = false;
  const blob = closedAvatarBlob({
    open,
    preview: avatarPreview.value,
    uploading: avatarUploading.value,
  });
  if (blob) {
    URL.revokeObjectURL(blob);
    avatarPreview.value = session.value.user?.avatar_url ?? null;
  }
});

const hasSavedAvatar = computed(() => {
  const preview = avatarPreview.value;
  return !!preview && !preview.startsWith("blob:");
});

function onAvatarClick() {
  document.getElementById("ep-avatar-input")?.click();
}

async function onAvatarRemove() {
  if (!hasSavedAvatar.value || avatarUploading.value) return;
  avatarUploading.value = true;
  try {
    await $fetch("/api/user/avatar", {
      method: "DELETE",
      credentials: "include",
    });
    updateUser({ avatar_url: null });
    avatarPreview.value = null;
    await fetchSession();
    toast.success("Η φωτογραφία προφίλ αφαιρέθηκε");
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } };
    toast.error(error.data?.message || "Κάτι πήγε στραβά");
    await fetchSession();
  } finally {
    avatarUploading.value = false;
  }
}

async function onAvatarChange(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  if (!file) return;
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    toast.error("Επιτρέπονται μόνο εικόνες JPEG, PNG και WebP");
    input.value = "";
    return;
  }
  if (file.size > AVATAR_MAX_SIZE) {
    toast.error("Η εικόνα πρέπει να είναι μικρότερη από 2 MB");
    input.value = "";
    return;
  }
  if (avatarPreview.value?.startsWith("blob:"))
    URL.revokeObjectURL(avatarPreview.value);
  const blobUrl = URL.createObjectURL(file);
  avatarPreview.value = blobUrl;
  avatarUploading.value = true;
  try {
    const formData = new FormData();
    formData.append("file", file);
    const result = await $fetch<{ avatar_url: string }>("/api/user/avatar", {
      method: "POST",
      body: formData,
      credentials: "include",
    });
    await fetchSession();
    updateUser({ avatar_url: result.avatar_url });
    if (avatarPreview.value === blobUrl) URL.revokeObjectURL(blobUrl);
    avatarPreview.value = result.avatar_url;
  } catch (err: unknown) {
    const error = err as { data?: { message?: string } };
    toast.error(error.data?.message || "Κάτι πήγε στραβά");
    if (avatarPreview.value === blobUrl) {
      URL.revokeObjectURL(blobUrl);
      avatarPreview.value = session.value.user?.avatar_url ?? null;
    }
    await fetchSession();
  } finally {
    avatarUploading.value = false;
    input.value = "";
  }
}

async function onSubmit() {
  if (isCredentials.value && newPassword.value) {
    if (newPassword.value.length < PASSWORD_MIN_LENGTH) {
      toast.error("Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες");
      return;
    }
    if (newPassword.value !== confirmPassword.value) {
      toast.error("Οι κωδικοί δεν ταιριάζουν");
      return;
    }
  }

  loading.value = true;
  try {
    const nameChanged = name.value.trim() !== (session.value.user?.name ?? "");
    const passwordChanged = isCredentials.value && newPassword.value.length > 0;

    if (nameChanged || passwordChanged) {
      const body: Record<string, string | null> = {};
      if (nameChanged) body.name = name.value.trim() || null;
      if (passwordChanged) {
        body.currentPassword = currentPassword.value;
        body.newPassword = newPassword.value;
      }
      const profileResult = await $fetch<{
        id: string;
        email: string;
        name: string | null;
        avatar_url: string | null;
      }>("/api/user/profile", {
        method: "PATCH",
        body,
        credentials: "include",
      });
      await fetchSession();
      updateUser({
        name: profileResult.name,
        avatar_url: profileResult.avatar_url,
      });
      name.value = profileResult.name ?? "";
      appliedServerName.value = name.value;
    }
    toast.success("Το προφίλ ενημερώθηκε");
    currentPassword.value = "";
    newPassword.value = "";
    confirmPassword.value = "";
    close();
  } catch (e: unknown) {
    console.error("[EditProfileModal] submit error:", e);
    const error = e as { data?: { message?: string } };
    toast.error(error.data?.message || "Κάτι πήγε στραβά");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UiDialog :open="isOpen" @update:open="(v: boolean) => !v && close()">
    <UiDialogPortal>
      <UiDialogOverlay class="bg-foreground/40 backdrop-blur-sm" />
      <UiDialogContent
        class="max-h-[90vh] max-w-3xl gap-0 overflow-y-auto border-0 bg-card p-6 shadow-2xl sm:rounded-3xl sm:p-8"
      >
        <UiDialogDescription class="sr-only"
          >Επεξεργασία προφίλ</UiDialogDescription
        >
        <UiDialogHeader>
          <div class="mb-6 flex items-center justify-between">
            <div class="flex items-center gap-3">
              <span
                class="flex size-10 items-center justify-center rounded-full bg-accent text-primary"
              >
                <VIcon name="bi-pencil" class="size-5" aria-hidden="true" />
              </span>
              <UiDialogTitle class="font-heading text-xl text-foreground">
                Επεξεργασία προφίλ
              </UiDialogTitle>
            </div>
            <UiDialogClose as-child>
              <button
                type="button"
                class="flex size-9 items-center justify-center rounded-full bg-secondary text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
                aria-label="Κλείσιμο"
              >
                <VIcon name="bi-x" class="size-5" aria-hidden="true" />
              </button>
            </UiDialogClose>
          </div>
        </UiDialogHeader>

        <form
          class="flex flex-col gap-8 sm:flex-row sm:gap-10"
          @submit.prevent="onSubmit"
        >
          <div class="flex shrink-0 flex-col items-center gap-5 sm:w-72">
            <div class="relative size-32">
              <div
                class="flex size-full items-center justify-center overflow-hidden rounded-full bg-secondary"
              >
                <img
                  v-if="avatarPreview"
                  :src="avatarPreview"
                  alt=""
                  class="size-full object-cover"
                />
                <VIcon
                  v-else
                  name="bi-person"
                  class="size-16 text-muted-foreground"
                  aria-hidden="true"
                />
                <span
                  v-if="avatarUploading"
                  class="absolute inset-0 z-10 flex items-center justify-center rounded-full bg-black/50 text-white"
                >
                  <VIcon name="bi-arrow-repeat" class="size-6 animate-spin" />
                </span>
              </div>
              <button
                v-if="hasSavedAvatar"
                type="button"
                class="absolute top-0 right-0 z-20 flex size-8 appearance-none items-center justify-center rounded-full bg-foreground text-background shadow-md ring-2 ring-card transition-colors hover:bg-[color-mix(in_oklab,var(--color-foreground),black_18%)] cursor-pointer disabled:pointer-events-none disabled:opacity-70"
                aria-label="Αφαίρεση φωτογραφίας προφίλ"
                :disabled="avatarUploading"
                @click="removeAvatarDialogOpen = true"
              >
                <VIcon name="bi-x" class="size-5" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="absolute bottom-0 right-0 z-20 flex size-8 appearance-none items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm ring-2 ring-card transition-colors hover:bg-primary/90 cursor-pointer disabled:pointer-events-none disabled:opacity-70"
                aria-label="Αλλαγή φωτογραφίας προφίλ"
                :disabled="avatarUploading"
                @click="onAvatarClick"
              >
                <VIcon name="bi-camera" class="size-4" aria-hidden="true" />
              </button>
            </div>
            <input
              id="ep-avatar-input"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              class="sr-only"
              @change="onAvatarChange"
            />
            <p class="text-center text-sm text-muted-foreground">
              JPEG, PNG ή WebP, μέγιστο 2MB
            </p>

            <div class="w-full space-y-3 rounded-2xl bg-secondary p-4 text-sm">
              <div class="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p
                  class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary"
                >
                  <VIcon
                    name="bi-shield"
                    class="size-4 shrink-0"
                    aria-hidden="true"
                  />
                  Τρόπος σύνδεσης
                </p>
                <div class="flex items-center gap-2 text-foreground">
                  <VIcon
                    name="bi-key"
                    class="size-4 shrink-0 text-amethyst"
                    aria-hidden="true"
                  />
                  <span>{{
                    isCredentials ? "Email & κωδικός" : "Λογαριασμός Google"
                  }}</span>
                </div>
              </div>
              <div class="flex items-start gap-2 text-foreground">
                <VIcon
                  name="bi-envelope"
                  class="mt-0.5 size-4 shrink-0 text-primary"
                  aria-hidden="true"
                />
                <span class="break-all">{{ session.user?.email }}</span>
              </div>
              <div
                v-if="joinedAt"
                class="flex items-center gap-2 text-foreground"
              >
                <VIcon
                  name="bi-calendar3"
                  class="size-4 shrink-0 text-laurel"
                  aria-hidden="true"
                />
                <span>Μέλος από: {{ joinedAt }}</span>
              </div>
              <div
                v-if="isCredentials"
                class="flex flex-col items-start gap-2 pt-1"
              >
                <div
                  v-if="emailVerified"
                  class="flex items-center gap-2 text-foreground"
                >
                  <VIcon
                    name="bi-check-circle-fill"
                    class="size-4 shrink-0 text-laurel"
                    aria-hidden="true"
                  />
                  <span>Email επαληθεύτηκε</span>
                </div>
                <template v-else>
                  <div
                    class="flex items-center gap-2 rounded-full bg-amber/15 px-3 py-2 text-foreground"
                  >
                    <VIcon
                      name="bi-exclamation-triangle"
                      class="size-4 shrink-0 text-amber"
                      aria-hidden="true"
                    />
                    <span>Email μη επαληθευμένο</span>
                  </div>
                  <button
                    type="button"
                    class="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80 disabled:opacity-50 cursor-pointer"
                    :disabled="resendVerificationLoading"
                    @click="resendVerification"
                  >
                    {{
                      resendVerificationLoading
                        ? "Φόρτωση..."
                        : "Επαναποστολή email επαλήθευσης"
                    }}
                  </button>
                </template>
              </div>
            </div>
          </div>

          <div class="min-w-0 flex-1 space-y-5">
            <div class="space-y-2">
              <UiLabel for="ep-name">Όνομα</UiLabel>
              <div class="relative">
                <UiInput
                  id="ep-name"
                  v-model="name"
                  type="text"
                  :class="`${fieldClass} pr-12`"
                />
                <VIcon
                  name="bi-person-badge"
                  class="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
              </div>
            </div>

            <template v-if="isCredentials">
              <div class="space-y-4 border-t border-border pt-5">
                <p
                  class="flex items-center gap-2 text-sm font-semibold text-foreground"
                >
                  <VIcon
                    name="bi-key"
                    class="size-4 shrink-0 text-primary"
                    aria-hidden="true"
                  />
                  Αλλαγή κωδικού
                </p>
                <div class="space-y-2">
                  <UiLabel for="ep-current-password">Τρέχων κωδικός</UiLabel>
                  <UiPasswordInput
                    id="ep-current-password"
                    v-model="currentPassword"
                    autocomplete="current-password"
                    :class="`${fieldClass} pr-12`"
                  />
                </div>
                <div class="space-y-2">
                  <UiLabel for="ep-new-password">Νέος κωδικός</UiLabel>
                  <UiPasswordInput
                    id="ep-new-password"
                    v-model="newPassword"
                    autocomplete="new-password"
                    :class="`${fieldClass} pr-12`"
                  />
                </div>
                <div class="space-y-2">
                  <UiLabel for="ep-confirm-password"
                    >Επιβεβαίωση νέου κωδικού</UiLabel
                  >
                  <UiPasswordInput
                    id="ep-confirm-password"
                    v-model="confirmPassword"
                    autocomplete="new-password"
                    :class="`${fieldClass} pr-12`"
                  />
                </div>
              </div>
            </template>

            <UiButton
              type="submit"
              class="w-full transition-none hover:bg-[color-mix(in_oklab,var(--color-primary),black_12%)]"
              :disabled="loading"
            >
              {{ loading ? "Φόρτωση..." : "Αποθήκευση" }}
            </UiButton>
          </div>
        </form>
      </UiDialogContent>
    </UiDialogPortal>
  </UiDialog>

  <UiAlertDialogRoot v-model:open="removeAvatarDialogOpen">
    <UiAlertDialogPortal>
      <UiAlertDialogOverlay class="z-60" />
      <UiAlertDialogContent class="z-60">
        <UiAlertDialogHeader>
          <UiAlertDialogTitle>Αφαίρεση φωτογραφίας</UiAlertDialogTitle>
          <UiAlertDialogDescription>
            Είστε σίγουροι ότι θέλετε να αφαιρέσετε τη φωτογραφία προφίλ;
          </UiAlertDialogDescription>
        </UiAlertDialogHeader>
        <UiAlertDialogFooter>
          <UiAlertDialogCancel>
            <UiButton variant="cancel">Ακύρωση</UiButton>
          </UiAlertDialogCancel>
          <UiAlertDialogAction as-child>
            <UiButton variant="destructive" @click="onAvatarRemove">
              Αφαίρεση
            </UiButton>
          </UiAlertDialogAction>
        </UiAlertDialogFooter>
      </UiAlertDialogContent>
    </UiAlertDialogPortal>
  </UiAlertDialogRoot>
</template>
