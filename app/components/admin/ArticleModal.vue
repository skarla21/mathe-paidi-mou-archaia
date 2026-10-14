<script setup lang="ts">
import { toast } from "vue-sonner";
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
import UiBadge from "~/components/ui/Badge.vue";
import UiLabel from "~/components/ui/Label.vue";
import UiTextarea from "~/components/ui/Textarea.vue";
import { Switch } from "~/components/ui/switch";
import type { Article } from "~/types/database";

const MAX_TAGS = 30;
const MAX_TAG_LEN = 64;

const props = defineProps<{
  open: boolean;
  article: Article | null;
  articles: Article[];
}>();
const emit = defineEmits<{ close: []; saved: [] }>();
const adminFetch = useAdminFetch();

const title = ref("");
const body = ref("");
const tags = ref<string[]>([]);
const tagDraft = ref("");
const published = ref(false);
const tagFieldFocused = ref(false);
const saving = ref(false);
const attempted = ref(false);

const titleMissing = computed(() => attempted.value && !title.value.trim());
const bodyMissing = computed(() => attempted.value && !body.value.trim());

watch(
  () => props.open,
  (open) => {
    if (!open) return;
    attempted.value = false;
    if (props.article) {
      title.value = props.article.title;
      body.value = props.article.body;
      tags.value = [...(props.article.tags ?? [])];
      published.value = props.article.published;
    } else {
      title.value = "";
      body.value = "";
      tags.value = [];
      published.value = false;
    }
    tagDraft.value = "";
  },
);

/** Compare tags ignoring case, accents, and final sigma. Stored text stays unchanged. */
function tagFold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/ς/g, "σ")
    .toLowerCase();
}

function addTag(raw: string) {
  const tag = raw.trim().slice(0, MAX_TAG_LEN);
  if (!tag || tags.value.includes(tag) || tags.value.length >= MAX_TAGS) return;
  tags.value = [...tags.value, tag];
}

function commitDraft(raw: string) {
  for (const part of raw.split(",")) addTag(part);
  tagDraft.value = "";
}

function onTagKeydown(event: KeyboardEvent) {
  if (event.key === "Enter" || event.key === ",") {
    event.preventDefault();
    commitDraft(tagDraft.value);
    return;
  }
  if (event.key === "Backspace" && tagDraft.value === "") {
    tags.value = tags.value.slice(0, -1);
  }
}

function onTagPaste(event: ClipboardEvent) {
  const text = event.clipboardData?.getData("text") ?? "";
  if (!text.includes(",")) return;
  event.preventDefault();
  commitDraft(tagDraft.value + text);
}

function onTagBlur() {
  tagFieldFocused.value = false;
  if (tagDraft.value.trim()) commitDraft(tagDraft.value);
}

const tagSuggestions = computed(() => {
  const draftKey = tagFold(tagDraft.value.trim());
  const selected = new Set(tags.value.map(tagFold));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const article of props.articles) {
    for (const tag of article.tags ?? []) {
      const key = tagFold(tag);
      if (seen.has(key) || selected.has(key)) continue;
      if (draftKey && !key.includes(draftKey)) continue;
      seen.add(key);
      out.push(tag);
    }
  }
  return out;
});

function setPublished(value: boolean) {
  published.value = value;
}

async function save() {
  attempted.value = true;
  const tVal = title.value.trim();
  const bVal = body.value.trim();
  if (!tVal || !bVal) return;
  saving.value = true;
  if (tagDraft.value.trim()) commitDraft(tagDraft.value);
  try {
    if (props.article?.id) {
      await adminFetch(`/api/admin/articles/${props.article.id}`, {
        method: "PATCH",
        body: {
          title: tVal,
          body: bVal,
          tags: tags.value,
          published: published.value,
        },
      });
    } else {
      await adminFetch("/api/admin/articles", {
        method: "POST",
        body: {
          title: tVal,
          body: bVal,
          tags: tags.value,
          published: published.value,
        },
      });
    }
    toast.success("Το άρθρο αποθηκεύτηκε");
    emit("saved");
    emit("close");
  } catch {
    toast.error("Κάτι πήγε στραβά");
  } finally {
    saving.value = false;
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
      <UiDialogContent class="max-w-lg max-h-[90vh] overflow-y-auto">
        <UiDialogHeader>
          <UiDialogTitle>{{
            props.article ? "Επεξεργασία" : "Δημιουργία"
          }}</UiDialogTitle>
          <UiDialogDescription
            >Δημιουργία ή επεξεργασία άρθρου.</UiDialogDescription
          >
        </UiDialogHeader>
        <div class="space-y-4 py-2">
          <div>
            <UiLabel class="mb-1.5 block">Τίτλος</UiLabel>
            <UiInput
              v-model="title"
              :aria-invalid="titleMissing || undefined"
              :class="titleMissing ? 'border-destructive' : ''"
            />
            <p v-if="titleMissing" class="mt-1.5 text-xs text-destructive">
              Το πεδίο «Τίτλος» είναι υποχρεωτικό
            </p>
          </div>
          <div>
            <UiLabel class="mb-1.5 block">Ετικέτες</UiLabel>
            <div
              class="rounded-md border border-input bg-background px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 ring-offset-background"
            >
              <div class="flex flex-wrap items-center gap-1.5">
                <UiBadge
                  v-for="(tag, index) in tags"
                  :key="`${tag}-${index}`"
                  variant="secondary"
                  class="gap-1 font-normal"
                >
                  {{ tag }}
                  <button
                    type="button"
                    class="rounded-sm hover:text-foreground"
                    aria-label="Αφαίρεση ετικέτας"
                    @mousedown.prevent
                    @click="tags = tags.filter((_, i) => i !== index)"
                  >
                    <VIcon name="bi-x" class="size-3.5" />
                  </button>
                </UiBadge>
                <input
                  v-model="tagDraft"
                  type="text"
                  class="min-w-32 flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-muted-foreground"
                  :placeholder="
                    tags.length
                      ? ''
                      : 'Βάλε τις ετικέτες του άρθρου χωρισμένες με κόμμα'
                  "
                  @focus="tagFieldFocused = true"
                  @keydown="onTagKeydown"
                  @paste="onTagPaste"
                  @blur="onTagBlur"
                />
              </div>
            </div>
            <ul
              v-if="tagFieldFocused && tagSuggestions.length"
              class="mt-1 max-h-40 overflow-y-auto rounded-md border border-input bg-background py-1"
            >
              <li v-for="suggestion in tagSuggestions" :key="suggestion">
                <button
                  type="button"
                  class="w-full px-3 py-1.5 text-left text-sm hover:bg-muted"
                  @mousedown.prevent="
                    addTag(suggestion);
                    tagDraft = '';
                  "
                >
                  {{ suggestion }}
                </button>
              </li>
            </ul>
          </div>
          <div>
            <UiLabel class="mb-1.5 block">Περιεχόμενο</UiLabel>
            <UiTextarea
              v-model="body"
              class="min-h-50 font-mono text-sm"
              :class="bodyMissing ? 'border-destructive' : ''"
              :aria-invalid="bodyMissing || undefined"
            />
            <p v-if="bodyMissing" class="mt-1.5 text-xs text-destructive">
              Το πεδίο «Περιεχόμενο» είναι υποχρεωτικό
            </p>
          </div>
          <div class="flex items-center justify-between gap-3">
            <UiLabel>Δημοσιευμένο</UiLabel>
            <Switch
              :model-value="published"
              @update:model-value="setPublished"
            />
          </div>
        </div>
        <UiDialogFooter class="gap-2">
          <UiButton variant="cancel" @click="emit('close')">Ακύρωση</UiButton>
          <UiButton :disabled="saving" @click="save">Αποθήκευση</UiButton>
        </UiDialogFooter>
      </UiDialogContent>
    </UiDialogPortal>
  </UiDialog>
</template>
