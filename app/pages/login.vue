<script setup lang="ts">
import { toast } from "vue-sonner";
import UiButton from "~/components/ui/Button.vue";
import UiCard from "~/components/ui/Card.vue";
import UiCardContent from "~/components/ui/CardContent.vue";
import UiCardHeader from "~/components/ui/CardHeader.vue";
import UiInput from "~/components/ui/Input.vue";
import UiLabel from "~/components/ui/Label.vue";

definePageMeta({
  middleware: "guest-only",
});

const { fetchSession } = useCurrentUser();
const { openForgot } = useAuthModal();

useHead(() => ({
  title: "Σύνδεση",
}));

const email = ref("");
const password = ref("");
const loading = ref(false);
const pendingToast = useState<string | null>("pendingToast", () => null);

async function onSubmit() {
  loading.value = true;
  try {
    const { csrfToken } = await $fetch<{ csrfToken: string }>(
      "/api/auth/csrf",
      {
        credentials: "include",
      },
    );

    const result = await $fetch<{ url?: string }>(
      "/api/auth/callback/credentials",
      {
        method: "POST",
        headers: { "X-Auth-Return-Redirect": "1" },
        body: {
          email: email.value,
          password: password.value,
          csrfToken,
          callbackUrl: "/",
        },
        credentials: "include",
      },
    );

    const redirectUrl = result?.url ?? "";
    if (redirectUrl.includes("/error") || redirectUrl.includes("error=")) {
      const urlParams = new URLSearchParams(redirectUrl.split("?")[1] ?? "");
      const errorCode = urlParams.get("error") ?? "";
      const errorMap: Record<string, string> = {
        CredentialsSignin: "Λάθος email ή κωδικός",
        OAuthAccountNotLinked:
          "Αυτό το email χρησιμοποιείται με διαφορετικό τρόπο σύνδεσης",
      };
      toast.error(errorMap[errorCode] ?? "Η σύνδεση δεν ήταν δυνατή");
      return;
    }

    await fetchSession();
    pendingToast.value = "login";
    await navigateTo("/");
  } catch (e: unknown) {
    const error = e as { data?: { message?: string } };
    toast.error(error.data?.message || "Η σύνδεση δεν ήταν δυνατή");
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <div class="min-h-full flex items-center justify-center p-4">
    <UiCard
      class="relative flex flex-col justify-center w-full max-w-sm md:max-w-md lg:max-w-lg xl:max-w-xl min-h-128 overflow-hidden border-0 rounded-3xl shadow-[0_0_30px_-8px_rgba(0,0,0,0.12)] bg-transparent dark:bg-card/80 dark:backdrop-blur-md dark:border dark:border-border"
    >
      <div
        class="absolute inset-0 rounded-3xl bg-cover bg-center bg-no-repeat"
        :style="{
          backgroundImage: 'url(\'/imgs/login_bg.jpg\')',
          opacity: 0.2,
        }"
        aria-hidden="true"
      />
      <div class="relative z-10 rounded-3xl max-w-sm mx-auto">
        <UiCardHeader class="space-y-1 pb-4">
          <h1 class="text-2xl font-bold font-heading">Σύνδεση</h1>
          <p class="text-muted-foreground text-sm">
            Συνδέσου για να συνεχίσεις στα μαθήματά σου.
          </p>
        </UiCardHeader>
        <UiCardContent class="space-y-4 pt-0">
          <form class="space-y-4" @submit.prevent="onSubmit">
            <div class="space-y-2">
              <UiLabel for="email">Email</UiLabel>
              <UiInput id="email" v-model="email" type="email" required />
            </div>

            <div class="space-y-2">
              <UiLabel for="password">Κωδικός πρόσβασης</UiLabel>
              <UiInput
                id="password"
                v-model="password"
                type="password"
                required
              />
              <button
                type="button"
                class="text-xs text-primary font-medium hover:underline cursor-pointer"
                @click="openForgot"
              >
                Ξέχασες τον κωδικό;
              </button>
            </div>

            <UiButton type="submit" class="w-full" :disabled="loading">
              <span v-if="!loading">Σύνδεση</span>
              <span v-else>Γίνεται σύνδεση...</span>
            </UiButton>
          </form>

          <p class="text-center text-sm text-muted-foreground">
            Δεν έχεις λογαριασμό;
            <NuxtLink
              to="/register"
              class="text-primary font-medium hover:underline"
            >
              Εγγραφή
            </NuxtLink>
          </p>

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
