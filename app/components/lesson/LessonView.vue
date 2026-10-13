<script setup lang="ts">
import { toast } from 'vue-sonner'
import LessonContentViewer from '~/components/lesson/LessonContentViewer.vue'
import UiButton from '~/components/ui/Button.vue'
import UiSkeleton from '~/components/ui/Skeleton.vue'

interface Lesson {
  id: string
  title: string
  content?: string | null
  is_free: boolean
  price: number
  content_url?: string | null
}

type LessonFileBlock = 'sign-in' | 'verify-email' | 'purchase' | null

interface LessonResponse extends Lesson {
  can_access: boolean
  can_access_content: boolean
  has_content?: boolean
  file_block: LessonFileBlock
}

const props = defineProps<{ lessonId: string }>()
const route = useRoute()
const { session } = useCurrentUser()
const { open: openEditProfile } = useEditProfileModal()
const { openLogin } = useAuthModal()

const lesson = ref<Lesson | null>(null)
const canAccess = ref(false)
const canAccessContent = ref(false)
const fileBlock = ref<LessonFileBlock>(null)
const purchasing = ref(false)

const { data, refresh } = await useFetch<LessonResponse>(() => `/api/lessons/${props.lessonId}`)

function applyLesson(payload: LessonResponse | null) {
  if (!payload) {
    lesson.value = null
    canAccess.value = false
    canAccessContent.value = false
    fileBlock.value = null
    return
  }
  const { can_access, can_access_content, has_content: _hasContent, file_block, ...rest } = payload
  lesson.value = rest
  canAccess.value = can_access
  canAccessContent.value = can_access_content
  fileBlock.value = file_block
}

watch(data, (payload) => applyLesson(payload ?? null), { immediate: true })

watch(() => session.value.user?.id ?? null, () => {
  void refresh()
})

const safeContent = ref('')

watch(
  () => lesson.value?.content,
  async (html) => {
    if (!import.meta.client || !html) {
      safeContent.value = ''
      return
    }
    const DOMPurify = (await import('dompurify')).default
    safeContent.value = DOMPurify.sanitize(html, {
      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'blockquote', 'code', 'pre'],
    })
  },
  { immediate: true },
)

async function buyLesson() {
  purchasing.value = true
  try {
    const { url } = await $fetch<{ url: string }>('/api/stripe/checkout', {
      method: 'POST',
      body: { lessonId: props.lessonId },
    })
    if (url) window.location.href = url
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.error(err?.data?.message ?? 'Η αγορά απέτυχε')
  } finally {
    purchasing.value = false
  }
}

useHead(() => ({
  title: lesson.value ? lesson.value.title : 'Υλικό',
}))

onMounted(() => {
  if (import.meta.client) {
    const { revealSection } = useGsapReveal()
    nextTick(() => {
      revealSection('#lesson-title')
    })
  }
})
</script>

<template>
  <div class="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-12">
    <div v-if="!lesson" class="space-y-4">
      <UiSkeleton class="h-9 w-2/3 rounded-xl" />
      <UiSkeleton class="h-5 w-full rounded-lg" />
      <UiSkeleton class="h-5 w-4/5 rounded-lg" />
      <UiSkeleton class="h-64 w-full rounded-xl mt-8" />
    </div>
    <template v-else>
      <div id="lesson-title">
        <LayoutPageIntro title="Υλικό" />
      </div>
      <ClientOnly v-if="lesson.content">
        <div
          v-if="safeContent"
          class="font-reading prose mt-4 max-w-none dark:prose-invert"
          v-html="safeContent"
        />
        <template #fallback>
          <div class="mt-4 h-64 animate-pulse rounded-xl bg-muted" />
        </template>
      </ClientOnly>
      <div v-if="canAccess && canAccessContent && lesson.content_url" class="mt-8">
        <LessonContentViewer :src="lesson.content_url" :lesson-id="props.lessonId" />
      </div>
      <div
        v-else-if="fileBlock === 'sign-in' || fileBlock === 'verify-email'"
        class="mx-auto mt-8 flex max-w-md flex-col items-center gap-4 rounded-3xl border border-amber/30 bg-amber/10 p-8 text-center"
      >
        <span
          class="flex size-14 items-center justify-center rounded-2xl bg-amber-500/20 text-amber-600 dark:text-amber-500"
        >
          <VIcon
            :name="fileBlock === 'sign-in' ? 'bi-person-circle' : 'bi-envelope-exclamation'"
            class="size-7"
            aria-hidden="true"
          />
        </span>
        <div>
          <h3 class="font-heading text-xl font-bold text-foreground">
            {{ fileBlock === 'sign-in' ? 'Συνδέσου για πρόσβαση στο υλικό' : 'Επαλήθευσε το email σου για πρόσβαση στο υλικό' }}
          </h3>
          <p class="mt-2 text-sm text-muted-foreground leading-relaxed">
            {{ fileBlock === 'sign-in' ? 'Χρειάζεται να συνδεθείς για να δεις ή να κατεβάσεις αυτό το υλικό.' : 'Χρειάζεται να επαληθεύσεις το email σου πριν μπορέσεις να δεις ή να κατεβάσεις υλικό.' }}
          </p>
        </div>
        <UiButton v-if="fileBlock === 'sign-in'" variant="outline" @click="openLogin(route.fullPath)">
          Σύνδεση
        </UiButton>
        <UiButton v-else variant="outline" @click="openEditProfile">
          Επεξεργασία προφίλ
        </UiButton>
      </div>
      <div
        v-else-if="fileBlock === 'purchase'"
        class="mt-8 flex max-w-md flex-col items-center gap-4 rounded-3xl border border-primary/30 bg-flame-fixed/40 p-8 text-center"
      >
        <span
          class="flex size-14 items-center justify-center rounded-2xl bg-accent/20 text-accent"
        >
          <VIcon name="bi-gem" class="size-7" aria-hidden="true" />
        </span>
        <div>
          <h3 class="font-heading text-xl font-bold text-foreground">
            Ξεκλείδωσε αυτό το υλικό
          </h3>
          <p class="mt-2 text-sm text-muted-foreground leading-relaxed">
            Αγόρασε αυτό το υλικό για πρόσβαση στο PDF.
          </p>
        </div>
        <UiButton :disabled="purchasing" @click="buyLesson">
          {{ purchasing ? 'Ανακατεύθυνση...' : 'Αγόρασε αυτό το υλικό' }}
        </UiButton>
      </div>
    </template>
  </div>
</template>
