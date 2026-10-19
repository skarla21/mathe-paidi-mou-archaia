<script setup lang="ts">
import { toast } from "vue-sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";

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
        email: email.value,
        message: message.value,
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
        <form v-else class="space-y-4" @submit.prevent="submitContact">
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
              <input
                v-model="email"
                type="email"
                required
                class="h-12 w-full rounded-xl border-none bg-secondary px-4 font-normal focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="name@example.com"
              />
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
            <textarea
              v-model="message"
              required
              maxlength="4000"
              rows="4"
              class="w-full rounded-xl border-none bg-secondary p-4 font-normal focus:bg-card focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="Πες μας πώς μπορούμε να βοηθήσουμε."
            />
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
            class="inline-flex w-full items-center justify-center gap-2 rounded-full bg-linear-to-r from-orange-600 to-amber-500 py-3.5 text-sm font-bold text-white shadow-[0_4px_16px_rgba(234,88,12,0.35)] transition-all hover:-translate-y-0.5 disabled:opacity-60"
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
