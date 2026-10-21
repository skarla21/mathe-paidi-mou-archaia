<script setup lang="ts">
import { toast } from 'vue-sonner'
import LessonContentViewer from '~/components/lesson/LessonContentViewer.vue'
import LessonEngagePrompt from '~/components/lesson/LessonEngagePrompt.vue'
import LessonStarRating from '~/components/lesson/LessonStarRating.vue'
import LessonComments from '~/components/lesson/LessonComments.vue'
import type { LessonCommentRow } from '~/components/lesson/LessonCommentItem.vue'
import ShareDialog from '~/components/ShareDialog.vue'
import UiButton from '~/components/ui/Button.vue'
import { Checkbox } from '~/components/ui/checkbox'
import UiSkeleton from '~/components/ui/Skeleton.vue'
import TooltipProvider from '~/components/ui/tooltip/TooltipProvider.vue'
import Tooltip from '~/components/ui/tooltip/Tooltip.vue'
import TooltipTrigger from '~/components/ui/tooltip/TooltipTrigger.vue'
import TooltipContent from '~/components/ui/tooltip/TooltipContent.vue'
import type { LessonChip, LessonParent } from '~/lib/lessonContext'
import {
  lessonFileSizeLabel,
  lessonPageCountLabel,
} from '#shared/utils/lessonPreviewUrl.mjs'
import { lessonExcerpt } from '#shared/utils/lessonExcerpt.mjs'
import { breadcrumbList, jsonLdGraph, jsonLdScript, learningResourceNode } from '~/utils/jsonLd'
import {
  LESSON_ENGAGE_GUEST_ID,
  isLessonEngagePromptDismissed,
  setLessonEngagePromptDismissed,
  shouldDismissForCommentRefresh,
  shouldDismissForShare,
  showLessonEngagePrompt,
  type LessonCommentRefresh,
} from '~/lib/lessonEngageStorage'

const descriptionClass = [
  'mt-8 max-w-3xl font-reading text-lg leading-relaxed text-foreground',
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
  canonical_path?: string | null
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
const acceptTerms = ref(false)
const acceptImmediateAccess = ref(false)
const ratingBusy = ref(false)
const shareOpen = ref(false)
const shareFromPrompt = ref(false)
const contentEngaged = ref(false)
const engagePromptDismissed = ref(false)
const engageCommentArmed = ref(false)

const myRating = ref<number | null>(null)
const avgRating = ref(0)
const ratingCount = ref(0)
const commentCount = ref(0)

const engageUserId = computed(() => session.value.user?.id ?? LESSON_ENGAGE_GUEST_ID)

const showEngagePrompt = computed(() => showLessonEngagePrompt({
  contentEngaged: contentEngaged.value,
  dismissed: engagePromptDismissed.value,
  canAccess: canAccess.value,
  canAccessContent: canAccessContent.value,
  hasRating: myRating.value != null,
}))

function syncEngagePromptDismissed() {
  engagePromptDismissed.value = isLessonEngagePromptDismissed(props.lessonId, engageUserId.value)
}

function dismissEngagePrompt() {
  setLessonEngagePromptDismissed(props.lessonId, engageUserId.value)
  engagePromptDismissed.value = true
  engageCommentArmed.value = false
  shareFromPrompt.value = false
}

function resetEngagePrompt() {
  contentEngaged.value = false
  engageCommentArmed.value = false
  shareFromPrompt.value = false
  syncEngagePromptDismissed()
}

function onContentEngaged() {
  contentEngaged.value = true
}

function openShare(fromPrompt = false) {
  shareFromPrompt.value = fromPrompt
  shareOpen.value = true
}

function onShareOpen(open: boolean) {
  shareOpen.value = open
  if (!open) shareFromPrompt.value = false
}

function onShared() {
  if (shouldDismissForShare({
    promptVisible: showEngagePrompt.value,
    openedFromPrompt: shareFromPrompt.value,
  })) {
    dismissEngagePrompt()
  }
  shareFromPrompt.value = false
}

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
  resetEngagePrompt()
  void refresh()
})

watch(
  () => props.lessonId,
  async () => {
    resetEngagePrompt()
    await refresh()
    await loadComments()
  },
)

const safeContent = ref('')
const previewFailed = ref(false)

const lockedPreviewSrc = computed(() => {
  if (previewFailed.value) return ''
  return lesson.value?.preview_url || ''
})

const lockedPageLabel = computed(() => {
  const count = lesson.value?.page_count
  if (count == null || count <= 0) return ''
  return lessonPageCountLabel(count)
})

const lockedSizeLabel = computed(() => lessonFileSizeLabel(lesson.value?.file_bytes ?? 0))

watch(
  () => lesson.value?.preview_url,
  () => {
    previewFailed.value = false
  },
)

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
    dismissEngagePrompt()
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

async function onCommentsRefresh(source: LessonCommentRefresh) {
  await loadComments()
  await syncCommentCount()
  if (shouldDismissForCommentRefresh(source, engageCommentArmed.value)) {
    dismissEngagePrompt()
  }
}

function onEngageComment() {
  engageCommentArmed.value = true
  scrollToComments()
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
  if (!acceptTerms.value || !acceptImmediateAccess.value) {
    toast.error('Αποδέξου τους όρους χρήσης και την άμεση έναρξη της πρόσβασης για να συνεχίσεις.')
    return
  }
  purchasing.value = true
  try {
    const { url } = await $fetch<{ url: string }>('/api/stripe/checkout', {
      method: 'POST',
      body: {
        lessonId: props.lessonId,
        acceptTerms: true,
        acceptImmediateAccess: true,
      },
    })
    if (url) window.location.href = url
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.error(err?.data?.message ?? 'Η αγορά απέτυχε')
  } finally {
    purchasing.value = false
  }
}

const lessonPlainText = computed(() => (
  lesson.value?.content ? lessonExcerpt(lesson.value.content, 12000) : ''
))

useHead(() => {
  const path = data.value?.canonical_path || route.path
  const title = lesson.value?.title ?? 'Υλικό'
  const description = lesson.value?.content ? lessonExcerpt(lesson.value.content) : null
  const crumbs = [
    { name: 'Αρχική', path: '/' },
    ...props.chips
      .filter((chip) => chip.to && !chip.to.includes('#'))
      .map((chip) => ({ name: chip.name, path: chip.to })),
  ]
  if (lesson.value) crumbs.push({ name: lesson.value.title, path })
  const nodes = [
    breadcrumbList(crumbs),
    ...(lesson.value
      ? [learningResourceNode({
          name: lesson.value.title,
          description,
          path,
          educationalLevel: props.chips.find((chip) => chip.tone === 'grade')?.name ?? null,
          isAccessibleForFree: Boolean(lesson.value.content?.trim()) || lesson.value.is_free,
        })]
      : []),
  ]
  return {
    ...describedHead(title, description, [], path),
    script: [jsonLdScript(jsonLdGraph(nodes), 'ld-json')],
  }
})

onMounted(async () => {
  syncEngagePromptDismissed()
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
  <div class="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-10 lg:py-12">
    <header id="lesson-title">
      <NuxtLink
        :to="parent.to"
        class="inline-flex max-w-full items-center gap-2 text-[15px] font-semibold text-foreground"
      >
        <VIcon name="bi-arrow-left" class="size-4 shrink-0" aria-hidden="true" />
        <span class="truncate">{{ parent.name }}</span>
      </NuxtLink>
      <UiSkeleton v-if="!lesson" class="mt-5 h-16 w-2/3 rounded-[10px]" />
      <h1
        v-else
        class="mt-5 font-heading text-[clamp(3.25rem,7vw,6.25rem)] leading-[0.92] tracking-tight text-foreground"
      >
        {{ lesson.title }}
      </h1>
      <p v-if="lesson" class="mt-4 text-sm font-semibold text-muted-foreground">
        {{ lesson.is_free ? 'Δωρεάν σημειώσεις' : 'Σημειώσεις · το PDF είναι επί πληρωμή' }}
      </p>
      <CatalogChips
        class="mt-4"
        :chips="chips"
        :tags="lesson?.tags ?? []"
      />
    </header>
    <template v-if="lesson">
      <div
        v-if="fileBlock"
        class="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-end sm:justify-between"
      >
        <div v-if="fileBlock === 'sign-in' || fileBlock === 'verify-email'" class="max-w-xl">
          <h2 class="font-heading text-lg font-semibold text-foreground">
            {{ fileBlock === 'sign-in' ? 'Συνδέσου για πρόσβαση στο υλικό' : 'Επαλήθευσε το email σου για πρόσβαση στο υλικό' }}
          </h2>
          <p class="mt-1 text-base leading-relaxed text-foreground">
            {{ fileBlock === 'sign-in' ? 'Χρειάζεται να συνδεθείς για να δεις ή να κατεβάσεις αυτό το υλικό.' : 'Χρειάζεται να επαληθεύσεις το email σου πριν μπορέσεις να δεις ή να κατεβάσεις υλικό.' }}
          </p>
        </div>
        <div v-else class="max-w-xl">
          <h2 class="font-heading text-lg font-semibold text-foreground">
            Ξεκλείδωσε αυτό το υλικό
          </h2>
          <p class="mt-1 text-base leading-relaxed text-foreground">
            Αγόρασε αυτό το υλικό για πρόσβαση στο PDF.
          </p>
          <div class="mt-4 flex flex-col gap-3">
            <div class="flex items-start gap-2">
              <Checkbox
                id="buy-terms"
                v-model="acceptTerms"
                class="mt-0.5"
              />
              <label for="buy-terms" class="text-sm leading-relaxed text-muted-foreground">
                Αποδέχομαι τους
                <NuxtLink
                  to="/oroi"
                  class="font-semibold text-primary underline-offset-4 hover:underline"
                  @click.stop
                >
                  όρους χρήσης
                </NuxtLink>.
              </label>
            </div>
            <div class="flex items-start gap-2">
              <Checkbox
                id="buy-immediate"
                v-model="acceptImmediateAccess"
                class="mt-0.5"
              />
              <label for="buy-immediate" class="text-sm leading-relaxed text-muted-foreground">
                Ζητώ να ξεκινήσει αμέσως η πρόσβαση στο ψηφιακό υλικό και γνωρίζω ότι χάνω το δικαίωμα υπαναχώρησης των 14 ημερών.
              </label>
            </div>
          </div>
        </div>
        <UiButton
          v-if="fileBlock === 'sign-in'"
          class="shrink-0"
          @click="openLogin(route.fullPath)"
        >
          Σύνδεση
        </UiButton>
        <UiButton
          v-else-if="fileBlock === 'verify-email'"
          class="shrink-0"
          @click="openEditProfile"
        >
          Επεξεργασία προφίλ
        </UiButton>
        <UiButton
          v-else
          class="shrink-0"
          :disabled="purchasing || !acceptTerms || !acceptImmediateAccess"
          @click="buyLesson"
        >
          {{ purchasing ? 'Ανακατεύθυνση...' : 'Αγόρασε αυτό το υλικό' }}
        </UiButton>
      </div>
      <figure v-if="fileBlock" class="mt-8 w-full max-w-3xl">
        <img
          v-if="lockedPreviewSrc"
          :src="lockedPreviewSrc"
          alt=""
          class="block max-h-[640px] w-full rounded-[10px] border border-border bg-secondary object-contain object-top"
          @error="previewFailed = true"
        >
        <span
          v-else
          class="flex aspect-[1/1.2] max-h-[480px] items-center justify-center rounded-[10px] border border-border bg-secondary text-muted-foreground"
        >
          <VIcon name="bi-journal-text" class="size-8" aria-hidden="true" />
        </span>
        <figcaption
          v-if="lockedPageLabel || lockedSizeLabel"
          class="mt-3 text-[15px] font-semibold text-muted-foreground"
        >
          {{ [lockedPageLabel, lockedSizeLabel].filter(Boolean).join(' · ') }}
        </figcaption>
      </figure>
      <div v-if="canAccess && canAccessContent && lesson.content_url" class="mt-8">
        <LessonContentViewer
          :src="lesson.content_url"
          :preview-url="lesson.preview_url"
          :page-count="lesson.page_count"
          :file-bytes="lesson.file_bytes"
          :lesson-id="props.lessonId"
          :user-id="engageUserId"
          :title="lesson.title"
          @engaged="onContentEngaged"
        />
      </div>
      <ClientOnly v-if="lesson.content">
        <!-- eslint-disable vue/no-v-html -- safeContent is DOMPurify.sanitize() output -->
        <div
          v-if="safeContent"
          :class="descriptionClass"
          v-html="safeContent"
        />
        <!-- eslint-enable vue/no-v-html -->
        <template #fallback>
          <p class="mt-8 max-w-3xl font-reading text-lg leading-relaxed text-foreground">
            {{ lessonPlainText }}
          </p>
        </template>
      </ClientOnly>

      <LessonEngagePrompt
        v-if="showEngagePrompt"
        :my-rating="myRating"
        :avg-rating="avgRating"
        :rating-count="ratingCount"
        :rating-disabled="ratingBusy"
        @rate="onRate"
        @clear="onClearRating"
        @comment="onEngageComment"
        @share="openShare(true)"
        @dismiss="dismissEngagePrompt"
      />

      <div class="mt-10 mb-10 flex max-w-3xl flex-wrap items-center gap-3">
        <LessonStarRating
          v-if="!showEngagePrompt"
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
                @click="openShare(false)"
              >
                <VIcon name="bi-share" class="size-4" aria-hidden="true" />
              </UiButton>
            </TooltipTrigger>
            <TooltipContent> Κοινοποίηση </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
      <ShareDialog
        :open="shareOpen"
        :title="lesson.title"
        @update:open="onShareOpen"
        @shared="onShared"
      />

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
    <UiSkeleton v-else class="mt-8 h-72 w-full max-w-3xl rounded-[10px]" />
  </div>
</template>
