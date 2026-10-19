<script setup lang="ts">
import { toast } from "vue-sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import { EMAIL_REGEX } from "~/lib/validation";

const { grades, ensure } = useCatalogNav();
const { colorMode } = useTheme();
const {
  siteKey,
  box: recaptchaBox,
  unavailable: recaptchaUnavailable,
  getToken,
  reset: resetRecaptcha,
} = useRecaptcha(colorMode);

const name = ref("");
const email = ref("");
const phone = ref("");
const gradeId = ref("");
const gradeChoice = computed({
  get: () => gradeId.value || "__none__",
  set: (value: string) => {
    gradeId.value = value === "__none__" ? "" : value;
  },
});
const message = ref("");
const honey = ref("");
const submitting = ref(false);
const submitted = ref(false);
const showErrors = ref(false);

const emailInvalid = computed(() => {
  const value = email.value.trim();
  return !value || !EMAIL_REGEX.test(value);
});
const messageInvalid = computed(() => !message.value.trim());

await ensure();

function recaptchaRejected(error: unknown): boolean {
  if (!error || typeof error !== "object" || !("data" in error)) return false;
  const data = (error as { data?: unknown }).data;
  if (!data || typeof data !== "object") return false;
  const body = data as { recaptcha?: boolean; data?: { recaptcha?: boolean } };
  return body.recaptcha === true || body.data?.recaptcha === true;
}

async function submitContact() {
  if (honey.value) {
    submitted.value = true;
    return;
  }
  const trimmedEmail = email.value.trim();
  const trimmedMessage = message.value.trim();
  if (!trimmedEmail || !trimmedMessage) {
    showErrors.value = true;
    toast.error("Συμπλήρωσε τα υποχρεωτικά πεδία.");
    return;
  }
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    showErrors.value = true;
    toast.error("Συμπλήρωσε ένα έγκυρο email.");
    return;
  }
  if (!siteKey.value || recaptchaUnavailable.value) {
    toast.error("Η επαλήθευση δεν είναι διαθέσιμη. Δοκίμασε ξανά αργότερα.");
    return;
  }
  const recaptchaToken = getToken();
  if (!recaptchaToken) {
    toast.error("Επιβεβαίωσε ότι δεν είσαι ρομπότ.");
    return;
  }
  submitting.value = true;
  try {
    await $fetch("/api/contact", {
      method: "POST",
      body: {
        email: trimmedEmail,
        message: trimmedMessage,
        name: name.value,
        phone: phone.value,
        gradeId: gradeId.value,
        honey: honey.value,
        recaptchaToken,
      },
    });
    toast.success("Το μήνυμα στάλθηκε!");
    submitted.value = true;
  } catch (error: unknown) {
    const status =
      error && typeof error === "object" && "statusCode" in error
        ? (error as { statusCode?: number }).statusCode
        : error && typeof error === "object" && "status" in error
          ? (error as { status?: number }).status
          : undefined;
    if (recaptchaRejected(error) || status === 502) resetRecaptcha();
    const message =
      error &&
      typeof error === "object" &&
      "data" in error &&
      error.data &&
      typeof error.data === "object" &&
      "message" in error.data &&
      typeof error.data.message === "string"
        ? error.data.message
        : "";
    toast.error(message || "Αποτυχία αποστολής. Παρακαλώ προσπαθήστε ξανά.");
  } finally {
    submitting.value = false;
  }
}
</script>

<template>
  <section id="communication" class="scroll-mt-24 py-16">
    <div class="grid items-start gap-8 lg:grid-cols-12">
      <div class="space-y-6 lg:col-span-5">
        <div
          class="inline-flex items-center gap-2 rounded-full bg-flame-fixed px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-flame-fixed-foreground"
        >
          <VIcon name="bi-chat-dots" class="size-4" aria-hidden="true" />
          Επικοινωνία
        </div>
        <h2
          class="font-heading text-3xl font-extrabold text-foreground sm:text-4xl"
        >
          Έχεις απορίες ή θέλεις ιδιαίτερα;
        </h2>
        <p class="text-muted-foreground">
          Συμπλήρωσε τη φόρμα με τα στοιχεία σου για να συζητήσουμε τις ανάγκες
          σου.
        </p>
        <div class="space-y-4">
          <div
            class="flex items-center gap-3.5 rounded-2xl bg-card p-4 shadow-sm"
          >
            <span
              class="flex size-10 items-center justify-center rounded-full bg-laurel-fixed text-laurel-fixed-foreground"
            >
              <VIcon name="bi-envelope" class="size-5" aria-hidden="true" />
            </span>
            <div>
              <span
                class="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                >Επικοινωνία</span
              >
              <span class="font-semibold">Μέσω της φόρμας</span>
            </div>
          </div>
          <div
            class="flex items-center gap-3.5 rounded-2xl bg-card p-4 shadow-sm"
          >
            <span
              class="flex size-10 items-center justify-center rounded-full bg-flame-fixed text-flame-fixed-foreground"
            >
              <VIcon
                name="bi-clock-history"
                class="size-5"
                aria-hidden="true"
              />
            </span>
            <div>
              <span
                class="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                >Διαδικτυακές συνεδρίες</span
              >
              <span class="font-semibold">Καθημερινές και Σαββατοκύριακα</span>
            </div>
          </div>
          <div
            class="flex items-center gap-3.5 rounded-2xl bg-card p-4 shadow-sm"
          >
            <span
              class="flex size-10 items-center justify-center rounded-full bg-amethyst-fixed text-amethyst-fixed-foreground"
            >
              <VIcon name="bi-mortarboard" class="size-5" aria-hidden="true" />
            </span>
            <div>
              <span
                class="block text-[11px] font-bold uppercase tracking-wider text-muted-foreground"
                >Εξειδίκευση</span
              >
              <span class="font-semibold">Αρχαία, έκθεση, ειδική αγωγή</span>
            </div>
          </div>
        </div>
      </div>

      <div
        class="rounded-3xl border border-border bg-card p-8 shadow-[0_16px_36px_rgba(0,0,0,0.06)] lg:col-span-7"
      >
        <h3 class="font-heading text-xl font-bold">Στείλε το μήνυμά σου</h3>
        <p class="mb-6 text-sm text-muted-foreground">
          Απαντάμε σε γονείς και μαθητές.
        </p>
        <p
          v-if="submitted"
          class="rounded-2xl bg-laurel-fixed/60 p-4 text-sm font-medium text-laurel-fixed-foreground"
        >
          Το μήνυμά σου στάλθηκε. Θα σου απαντήσουμε το συντομότερο.
        </p>
        <form
          v-else
          class="space-y-4"
          novalidate
          @submit.prevent="submitContact"
        >
          <input
            v-model="honey"
            type="text"
            name="_honey"
            class="hidden"
            tabindex="-1"
            autocomplete="off"
          />
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-1.5 text-sm font-semibold">
              Ονοματεπώνυμο
              <input
                v-model="name"
                type="text"
                maxlength="120"
                class="h-12 w-full rounded-xl border-none bg-secondary px-4 font-normal focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="π.χ. Μαρία Παπαδοπούλου"
              />
            </label>
            <label class="space-y-1.5 text-sm font-semibold">
              Email επικοινωνίας
              <span class="text-destructive" aria-hidden="true">*</span>
              <input
                id="contact-email"
                v-model="email"
                type="email"
                aria-required="true"
                :aria-invalid="(showErrors && emailInvalid) || undefined"
                :aria-describedby="showErrors && emailInvalid ? 'contact-email-error' : undefined"
                class="h-12 w-full rounded-xl border bg-secondary px-4 font-normal focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                :class="
                  showErrors && emailInvalid
                    ? 'border-destructive'
                    : 'border-transparent'
                "
                placeholder="name@example.com"
              />
              <p
                v-if="showErrors && emailInvalid"
                id="contact-email-error"
                class="text-xs font-normal text-destructive"
              >
                {{
                  email.trim()
                    ? "Συμπλήρωσε ένα έγκυρο email."
                    : "Το email είναι υποχρεωτικό."
                }}
              </p>
            </label>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <label class="space-y-1.5 text-sm font-semibold">
              Τάξη μαθητή
              <Select v-model="gradeChoice">
                <SelectTrigger
                  class="h-12 w-full cursor-pointer rounded-xl border-none bg-secondary px-4 font-normal shadow-none data-[size=default]:h-12 focus-visible:bg-card focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <SelectValue placeholder="Προαιρετικά" />
                </SelectTrigger>
                <SelectContent
                  position="popper"
                  class="w-(--reka-select-trigger-width) max-w-(--reka-select-trigger-width)"
                >
                  <SelectItem value="__none__"> Προαιρετικά </SelectItem>
                  <SelectItem
                    v-for="grade in grades"
                    :key="grade.id"
                    :value="grade.id"
                  >
                    {{ grade.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label class="space-y-1.5 text-sm font-semibold">
              Τηλέφωνο (προαιρετικό)
              <input
                v-model="phone"
                type="tel"
                maxlength="40"
                class="h-12 w-full rounded-xl border-none bg-secondary px-4 font-normal focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="69XXXXXXXX"
              />
            </label>
          </div>
          <label class="block space-y-1.5 text-sm font-semibold">
            Το μήνυμά σου
            <span class="text-destructive" aria-hidden="true">*</span>
            <textarea
              id="contact-message"
              v-model="message"
              aria-required="true"
              :aria-invalid="(showErrors && messageInvalid) || undefined"
              :aria-describedby="showErrors && messageInvalid ? 'contact-message-error' : undefined"
              maxlength="4000"
              rows="4"
              class="w-full rounded-xl border bg-secondary p-4 font-normal focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary"
              :class="
                showErrors && messageInvalid
                  ? 'border-destructive'
                  : 'border-transparent'
              "
              placeholder="Πες μας πώς μπορούμε να βοηθήσουμε."
            />
            <p
              v-if="showErrors && messageInvalid"
              id="contact-message-error"
              class="text-xs font-normal text-destructive"
            >
              Το μήνυμα είναι υποχρεωτικό.
            </p>
          </label>
          <div class="space-y-2">
            <div :key="colorMode" ref="recaptchaBox" />
            <p
              v-if="!siteKey || recaptchaUnavailable"
              class="text-xs text-destructive"
            >
              Η επαλήθευση δεν είναι διαθέσιμη. Δοκίμασε ξανά αργότερα.
            </p>
            <p v-else class="text-xs text-muted-foreground">
              Η επαλήθευση γίνεται από την Google.
            </p>
          </div>
          <button
            type="submit"
            class="inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-full bg-linear-to-r from-orange-600 to-amber-500 py-3.5 text-sm font-bold text-white shadow-[0_4px_16px_rgba(234,88,12,0.35)] transition-colors hover:from-orange-700 hover:to-amber-600 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="submitting"
          >
            <VIcon name="bi-send" class="size-4" aria-hidden="true" />
            {{ submitting ? "Αποστολή..." : "Αποστολή μηνύματος" }}
          </button>
        </form>
      </div>
    </div>
  </section>
</template>
