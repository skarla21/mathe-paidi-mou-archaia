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

useHead(() => ({
  title: "Εγγραφή",
}));

const name = ref("");
const email = ref("");
const password = ref("");
const loading = ref(false);
const pendingToast = useState<string | null>("pendingToast", () => null);

async function onSubmit() {
  loading.value = true;
  try {
    const result = await $fetch<{ error?: string }>("/api/auth/register", {
      method: "POST",
      body: {
        name: name.value.trim(),
        email: email.value,
        password: password.value,
      },
    });

    if (result?.error) {
      toast.error("Η εγγραφή δεν ήταν δυνατή");
      return;
    }

    const { csrfToken } = await $fetch<{ csrfToken: string }>(
      "/api/auth/csrf",
      { credentials: "include" },
    );

    const signInResult = await $fetch<{ url?: string }>(
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

    const redirectUrl = signInResult?.url ?? "";
    if (redirectUrl.includes("/error") || redirectUrl.includes("error=")) {
      toast.error("Η εγγραφή δεν ήταν δυνατή");
      return;
    }

    pendingToast.value = "registered";
    await navigateTo("/");
  } catch (e: unknown) {
    const error = e as { data?: { message?: string } };
    toast.error(error.data?.message || "Η εγγραφή δεν ήταν δυνατή");
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
        :style="{ backgroundImage: 'url(\'/imgs/sign_up.jpg\')', opacity: 0.2 }"
        aria-hidden="true"
      />
      <div class="relative z-10 rounded-3xl max-w-sm mx-auto">
        <UiCardHeader class="space-y-1 pb-4">
          <h1 class="text-2xl font-bold font-heading">Εγγραφή</h1>
          <p class="text-muted-foreground text-sm">
            Δημιούργησε λογαριασμό μαθητή για να ξεκινήσεις.
          </p>
        </UiCardHeader>
        <UiCardContent class="space-y-4 pt-0">
          <form class="space-y-4" @submit.prevent="onSubmit">
            <div class="space-y-2">
              <UiLabel for="name">Ονοματεπώνυμο</UiLabel>
              <UiInput
                id="name"
                v-model="name"
                type="text"
                required
                minlength="2"
              />
            </div>

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
                minlength="8"
              />
            </div>

            <UiButton type="submit" class="w-full" :disabled="loading">
              <span v-if="!loading">Εγγραφή</span>
              <span v-else>Γίνεται εγγραφή...</span>
            </UiButton>
          </form>

          <p class="text-center text-sm text-muted-foreground">
            Έχεις ήδη λογαριασμό;
            <NuxtLink
              to="/login"
              class="text-primary font-medium hover:underline"
            >
              Σύνδεση
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
