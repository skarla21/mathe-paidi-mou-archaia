<script setup lang="ts">
import { toast } from 'vue-sonner'
import LessonContentViewer from '~/components/lesson/LessonContentViewer.vue'
import LessonStarRating from '~/components/lesson/LessonStarRating.vue'
import LessonComments from '~/components/lesson/LessonComments.vue'
import type { LessonCommentRow } from '~/components/lesson/LessonCommentItem.vue'
import ShareDialog from '~/components/ShareDialog.vue'
import UiButton from '~/components/ui/Button.vue'
import UiSkeleton from '~/components/ui/Skeleton.vue'
import TooltipProvider from '~/components/ui/tooltip/TooltipProvider.vue'
import Tooltip from '~/components/ui/tooltip/Tooltip.vue'
import TooltipTrigger from '~/components/ui/tooltip/TooltipTrigger.vue'
import TooltipContent from '~/components/ui/tooltip/TooltipContent.vue'
import type { LessonChip, LessonParent } from '~/lib/lessonContext'

const descriptionClass = [
  'mt-5 max-w-3xl font-reading text-lg leading-relaxed text-muted-foreground',
  '[&_a]:font-semibold [&_a]:text-primary [&_a]:underline-offset-4 hover:[&_a]:underline',
  '[&_blockquote]:my-3 [&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:italic',
  '[&_code]:rounded-md [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-sm',
  '[&_h1]:mb-3 [&_h1]:font-heading [&_h1]:text-2xl [&_h1]:font-extrabold [&_h1]:text-foreground',
  '[&_h2]:mb-2 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-foreground',
  '[&_h3]:mb-2 [&_h3]:font-heading [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-foreground',
  '[&_li]:mb-1 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:mb-3 [&_p:last-child]:mb-0',
  '[&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-2xl [&_pre]:bg-muted [&_pre]:p-4',
  '[&_strong]:font-semibold [&_strong]:text-foreground [&_ul]:my-3 [&_ul]:list-disc [&_ul]:pl-5',
].join(' ')

interface Lesson {
  id: string
  title: string
  content?: string | null
  tags?: string[]
  is_free: boolean
  price: number
  content_url?: string | null
  preview_url?: string | null
  page_count?: number | null
  file_bytes?: number | null
  avgRating?: number
  ratingCount?: number
  commentCount?: number
  myRating?: number | null
}

type LessonFileBlock = 'sign-in' | 'verify-email' | 'purchase' | null

interface LessonResponse extends Lesson {
  can_access: boolean
  can_access_content: boolean
  has_content?: boolean
  file_block: LessonFileBlock
  avg_rating?: number
  rating_count?: number
}

type CommentsPage = {
  items: LessonCommentRow[]
  totalRoots: number
  page: number
  pageSize: number
  hasMore: boolean
}

const props = defineProps<{
  lessonId: string
  parent: LessonParent
  chips: LessonChip[]
}>()
const route = useRoute()
const { session } = useCurrentUser()
const { open: openEditProfile } = useEditProfileModal()
const { openLogin } = useAuthModal()

const lesson = ref<Lesson | null>(null)
const canAccess = ref(false)
const canAccessContent = ref(false)
const fileBlock = ref<LessonFileBlock>(null)
const purchasing = ref(false)
const ratingBusy = ref(false)
const shareOpen = ref(false)

const myRating = ref<number | null>(null)
const avgRating = ref(0)
const ratingCount = ref(0)
const commentCount = ref(0)

const comments = ref<LessonCommentRow[]>([])
const commentsPage = ref(1)
const commentsHasMore = ref(false)
const commentsLoadingMore = ref(false)

const { data, refresh } = await useFetch<LessonResponse>(() => `/api/lessons/${props.lessonId}`)

function applyLesson(payload: LessonResponse | null) {
  if (!payload) {
    lesson.value = null
    canAccess.value = false
    canAccessContent.value = false
    fileBlock.value = null
    myRating.value = null
    avgRating.value = 0
    ratingCount.value = 0
    commentCount.value = 0
    return
  }
  const {
    can_access,
    can_access_content,
    has_content: _hasContent,
    file_block,
    avg_rating: _avgSnake,
    rating_count: _countSnake,
    ...rest
  } = payload
  lesson.value = rest
  canAccess.value = can_access
  canAccessContent.value = can_access_content
  fileBlock.value = file_block
  myRating.value = payload.myRating ?? null
  avgRating.value = Number(payload.avgRating ?? payload.avg_rating ?? 0)
  ratingCount.value = Number(payload.ratingCount ?? payload.rating_count ?? 0)
  commentCount.value = Number(payload.commentCount ?? 0)
}

watch(data, (payload) => applyLesson(payload ?? null), { immediate: true })

watch(() => session.value.user?.id ?? null, () => {
  void refresh()
})

watch(
  () => props.lessonId,
  async () => {
    await refresh()
    await loadComments()
  },
)

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

function ensureLoggedIn(): boolean {
  if (!session.value?.user?.id) {
    toast.error('Συνδεθείτε για να σχολιάσετε ή να αξιολογήσετε.')
    openLogin(route.fullPath)
    return false
  }
  return true
}

function ensureCanRate(): boolean {
  if (!ensureLoggedIn()) return false
  if (!session.value.user?.email_verified) {
    toast.error('Επαληθεύστε το email σας για να σχολιάσετε ή να αξιολογήσετε.')
    openEditProfile()
    return false
  }
  if (!canAccess.value) {
    toast.error('Χρειάζεστε πρόσβαση στο υλικό για να αξιολογήσετε.')
    return false
  }
  return true
}

function handleRateError(e: unknown) {
  const status = (e as { statusCode?: number })?.statusCode
  if (status === 403) {
    if (!session.value.user?.email_verified) {
      toast.error('Επαληθεύστε το email σας για να σχολιάσετε ή να αξιολογήσετε.')
      openEditProfile()
    } else {
      toast.error('Χρειάζεστε πρόσβαση στο υλικό για να αξιολογήσετε.')
    }
  } else if (status === 401) {
    toast.error('Συνδεθείτε για να σχολιάσετε ή να αξιολογήσετε.')
    openLogin(route.fullPath)
  } else {
    toast.error('Κάτι πήγε στραβά')
  }
}

async function onRate(value: number) {
  if (!ensureCanRate() || ratingBusy.value) return
  ratingBusy.value = true
  try {
    const result = await $fetch<{ rating: number; avgRating: number; ratingCount: number }>(
      `/api/lessons/${props.lessonId}/rating`,
      {
        method: 'PUT',
        credentials: 'include',
        body: { rating: value },
      },
    )
    myRating.value = result.rating
    avgRating.value = result.avgRating
    ratingCount.value = result.ratingCount
    toast.success('Η βαθμολογία αποθηκεύτηκε')
  } catch (e: unknown) {
    handleRateError(e)
  } finally {
    ratingBusy.value = false
  }
}

async function onClearRating() {
  // Clearing own rating must work even if lesson access was later revoked.
  if (!ensureLoggedIn() || ratingBusy.value) return
  if (!session.value.user?.email_verified) {
    toast.error('Επαληθεύστε το email σας για να σχολιάσετε ή να αξιολογήσετε.')
    openEditProfile()
    return
  }
  ratingBusy.value = true
  try {
    const result = await $fetch<{ rating: null; avgRating: number; ratingCount: number }>(
      `/api/lessons/${props.lessonId}/rating`,
      {
        method: 'DELETE',
        credentials: 'include',
      },
    )
    myRating.value = null
    avgRating.value = result.avgRating
    ratingCount.value = result.ratingCount
    toast.success('Η βαθμολογία αφαιρέθηκε')
  } catch (e: unknown) {
    handleRateError(e)
  } finally {
    ratingBusy.value = false
  }
}

async function loadComments(opts: { append?: boolean } = {}) {
  const nextPage = opts.append ? commentsPage.value + 1 : 1
  if (opts.append) commentsLoadingMore.value = true
  try {
    const page = await $fetch<CommentsPage>(
      `/api/lessons/${props.lessonId}/comments`,
      {
        credentials: 'include',
        query: { page: nextPage },
      },
    )
    const items = page.items ?? []
    comments.value = opts.append ? [...items, ...comments.value] : items
    commentsPage.value = page.page
    commentsHasMore.value = Boolean(page.hasMore)
  } catch {
    if (!opts.append) {
      comments.value = []
      commentsHasMore.value = false
    }
    toast.error('Αποτυχία φόρτωσης σχολίων')
  } finally {
    commentsLoadingMore.value = false
  }
}

async function syncCommentCount() {
  try {
    const payload = await $fetch<LessonResponse>(`/api/lessons/${props.lessonId}`, {
      credentials: 'include',
    })
    commentCount.value = Number(payload.commentCount ?? 0)
  } catch {
    /* count stays until next full load */
  }
}

async function onCommentsRefresh() {
  await loadComments()
  await syncCommentCount()
}

async function onLoadMoreComments() {
  if (!commentsHasMore.value || commentsLoadingMore.value) return
  await loadComments({ append: true })
}

function scrollToComments() {
  document
    .getElementById('lesson-comments')
    ?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

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

onMounted(async () => {
  await loadComments()
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
    <header id="lesson-title" class="max-w-3xl">
      <CatalogBackLink :to="parent.to" :name="parent.name" />
      <UiSkeleton v-if="!lesson" class="mt-5 h-12 w-2/3 rounded-xl" />
      <h1
        v-else
        class="mt-5 font-heading text-4xl font-extrabold leading-tight tracking-tight text-balance text-foreground sm:text-5xl"
      >
        {{ lesson.title }}
      </h1>
      <CatalogChips
        class="mt-4"
        :chips="chips"
        :tags="lesson?.tags ?? []"
      />
    </header>
    <template v-if="lesson">
      <ClientOnly v-if="lesson.content">
        <div
          v-if="safeContent"
          :class="descriptionClass"
          v-html="safeContent"
        />
        <template #fallback>
          <div class="mt-5 h-24 max-w-3xl animate-pulse rounded-2xl bg-muted" />
        </template>
      </ClientOnly>
      <div v-if="canAccess && canAccessContent && lesson.content_url" class="mt-8">
        <LessonContentViewer
          :src="lesson.content_url"
          :preview-url="lesson.preview_url"
          :page-count="lesson.page_count"
          :file-bytes="lesson.file_bytes"
          :lesson-id="props.lessonId"
          :title="lesson.title"
        />
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

      <div class="mt-10 mb-10 flex max-w-3xl flex-wrap items-center gap-3">
        <LessonStarRating
          :my-rating="myRating"
          :avg-rating="avgRating"
          :rating-count="ratingCount"
          :disabled="ratingBusy"
          @rate="onRate"
          @clear="onClearRating"
        />
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <UiButton
                variant="outline"
                size="sm"
                aria-label="Σχόλια"
                @click="scrollToComments"
              >
                <VIcon name="bi-chat-text" class="size-4" aria-hidden="true" />
                <span>{{ commentCount }}</span>
              </UiButton>
            </TooltipTrigger>
            <TooltipContent> Σχόλια </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger as-child>
              <UiButton
                variant="outline"
                size="sm"
                aria-label="Κοινοποίηση"
                @click="shareOpen = true"
              >
                <VIcon name="bi-share" class="size-4" aria-hidden="true" />
              </UiButton>
            </TooltipTrigger>
            <TooltipContent> Κοινοποίηση </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <ShareDialog v-model:open="shareOpen" :title="lesson.title" />

      <div class="max-w-3xl">
        <LessonComments
          :lesson-id="props.lessonId"
          :comments="comments"
          :can-access="canAccess"
          :has-more="commentsHasMore"
          :loading-more="commentsLoadingMore"
          @refresh="onCommentsRefresh"
          @load-more="onLoadMoreComments"
        />
      </div>
    </template>
    <UiSkeleton v-else class="mt-8 h-72 w-56 rounded-3xl" />
  </div>
</template>
