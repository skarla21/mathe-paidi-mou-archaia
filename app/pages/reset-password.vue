<script setup lang="ts">
import { toast } from "vue-sonner";
import { PASSWORD_MIN_LENGTH } from "~/lib/validation";
import UiButton from "~/components/ui/Button.vue";
import UiCard from "~/components/ui/Card.vue";
import UiCardContent from "~/components/ui/CardContent.vue";
import UiCardHeader from "~/components/ui/CardHeader.vue";
import UiLabel from "~/components/ui/Label.vue";
import UiPasswordInput from "~/components/ui/PasswordInput.vue";

const route = useRoute();
const { fetchSession, session } = useCurrentUser();
const { openLogin } = useAuthModal();

useHead(() => describedHead(
  'Ορισμός νέου κωδικού',
  'Όρισε έναν νέο κωδικό πρόσβασης.',
));

const token = computed(() => (route.query.token as string) || "");
const newPassword = ref("");
const confirmPassword = ref("");
const loading = ref(false);

async function signInWithNewPassword(email: string, password: string) {
  const { csrfToken } = await $fetch<{ csrfToken: string }>("/api/auth/csrf", {
    credentials: "include",
  });

  const signInResult = await $fetch<{ url?: string }>(
    "/api/auth/callback/credentials",
    {
      method: "POST",
      headers: { "X-Auth-Return-Redirect": "1" },
      body: {
        email,
        password,
        csrfToken,
        callbackUrl: "/",
      },
      credentials: "include",
    },
  );

  const redirectUrl = signInResult?.url ?? "";
  return Boolean(
    redirectUrl &&
      !redirectUrl.includes("/error") &&
      !redirectUrl.includes("error="),
  );
}

async function finishWithoutSession() {
  toast.error("Ο κωδικός ενημερώθηκε, αλλά η σύνδεση δεν ολοκληρώθηκε.");
  await openLogin("/");
  await navigateTo("/", { replace: true });
}

async function onSubmit() {
  if (newPassword.value.length < PASSWORD_MIN_LENGTH) {
    toast.error('Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες');
    return;
  }
  if (newPassword.value !== confirmPassword.value) {
    toast.error('Οι κωδικοί δεν ταιριάζουν');
    return;
  }
  if (!token.value) {
    toast.error('Αυτός ο σύνδεσμος δεν είναι έγκυρος ή έχει λήξει.');
    return;
  }

  const password = newPassword.value;
  loading.value = true;
  try {
    let result: { ok: true; email: string | null };
    try {
      result = await $fetch<{ ok: true; email: string | null }>(
        "/api/auth/reset-password",
        {
          method: "POST",
          body: { token: token.value, newPassword: password },
        },
      );
    } catch (e: unknown) {
      const err = e as { data?: { message?: string } };
      toast.error(err.data?.message || 'Κάτι πήγε στραβά');
      return;
    }

    try {
      if (!result.email || !(await signInWithNewPassword(result.email, password))) {
        await finishWithoutSession();
        return;
      }

      await fetchSession();
      if (!session.value.user?.id) {
        await finishWithoutSession();
        return;
      }
    } catch {
      await finishWithoutSession();
      return;
    }

    toast.success('Ο κωδικός ενημερώθηκε.');
    await navigateTo("/", { replace: true });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-full flex items-center justify-center p-4">
    <UiCard
      class="relative flex flex-col justify-center w-full max-w-sm overflow-hidden border-0 rounded-3xl shadow-[0_0_30px_-8px_rgba(0,0,0,0.12)] bg-transparent dark:bg-card/80 dark:backdrop-blur-md dark:border dark:border-border"
    >
      <div
        class="absolute inset-0 rounded-3xl bg-cover bg-center bg-no-repeat"
        :style="{ backgroundImage: 'url(\'/imgs/login_bg.jpg\')', opacity: 0.2 }"
        aria-hidden="true"
      />
      <div class="relative z-10 rounded-3xl max-w-sm mx-auto">
        <UiCardHeader class="space-y-1 pb-4">
          <h1 class="text-2xl font-bold font-heading">
            Ορισμός νέου κωδικού
          </h1>
          <p class="text-muted-foreground text-sm">
            Εισήγαγε τον νέο κωδικό σου παρακάτω.
          </p>
        </UiCardHeader>
        <UiCardContent class="space-y-4 pt-0">
          <form v-if="token" class="space-y-4" @submit.prevent="onSubmit">
            <div class="space-y-2">
              <UiLabel for="new-password">Νέος κωδικός</UiLabel>
              <UiPasswordInput
                id="new-password"
                v-model="newPassword"
                placeholder="Νέος κωδικός"
                autocomplete="new-password"
                :disabled="loading"
              />
            </div>
            <div class="space-y-2">
              <UiLabel for="confirm-password">Επιβεβαίωση κωδικού</UiLabel>
              <UiPasswordInput
                id="confirm-password"
                v-model="confirmPassword"
                placeholder="Επιβεβαίωση κωδικού"
                autocomplete="new-password"
                :disabled="loading"
              />
            </div>
            <UiButton type="submit" class="w-full" :disabled="loading">
              {{
                loading ? 'Φόρτωση...' : 'Επαναφορά κωδικού'
              }}
            </UiButton>
          </form>
          <div
            v-else
            class="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-center"
          >
            <p class="text-sm text-destructive">
              Αυτός ο σύνδεσμος δεν είναι έγκυρος ή έχει λήξει.
            </p>
            <NuxtLink
              to="/"
              class="block mt-2 text-sm text-primary hover:underline"
            >
              Πίσω
            </NuxtLink>
          </div>
          <NuxtLink
            to="/"
            class="flex items-center justify-center gap-1 text-sm text-primary hover:underline"
          >
            <VIcon
              name="bi-arrow-right"
              class="size-4 rotate-180"
              aria-hidden="true"
            />
            Πίσω
          </NuxtLink>
        </UiCardContent>
      </div>
    </UiCard>
  </div>
</template>
