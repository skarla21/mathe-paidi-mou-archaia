export const LESSON_ENGAGE_GUEST_ID = 'guest'
export const PDF_SINGLE_PAGE_DWELL_MS = 8000
export const IMAGE_DWELL_MS = 5000

const ENGAGED_PREFIX = 'lesson-content-engaged:'
const DISMISSED_PREFIX = 'lesson-engage-prompt-dismissed:'

export type LessonCommentRefresh = 'post' | 'reply' | 'edit' | 'delete'
export type EngageContentKind = 'pdf' | 'image' | 'other'

type FlagStore = {
  getItem: (key: string) => string | null
  setItem: (key: string, value: string) => void
}

export function lessonContentEngagedKey(userId: string, lessonId: string) {
  return `${ENGAGED_PREFIX}${userId}:${lessonId}`
}

export function lessonEngagePromptDismissedKey(userId: string, lessonId: string) {
  return `${DISMISSED_PREFIX}${userId}:${lessonId}`
}

export function readStorageFlag(storage: FlagStore, key: string): boolean {
  try {
    return storage.getItem(key) === '1'
  } catch {
    return false
  }
}

export function writeStorageFlag(storage: FlagStore, key: string): void {
  try {
    storage.setItem(key, '1')
  } catch {
    /* quota / private mode */
  }
}

function sessionStore(): FlagStore | null {
  if (!import.meta.client) return null
  try {
    return sessionStorage
  } catch {
    return null
  }
}

function localStore(): FlagStore | null {
  if (!import.meta.client) return null
  try {
    return localStorage
  } catch {
    return null
  }
}

export function isLessonContentEngaged(lessonId: string, userId: string): boolean {
  const storage = sessionStore()
  if (!storage || !lessonId || !userId) return false
  return readStorageFlag(storage, lessonContentEngagedKey(userId, lessonId))
}

export function setLessonContentEngaged(lessonId: string, userId: string): void {
  const storage = sessionStore()
  if (!storage || !lessonId || !userId) return
  writeStorageFlag(storage, lessonContentEngagedKey(userId, lessonId))
}

export function isLessonEngagePromptDismissed(lessonId: string, userId: string): boolean {
  const storage = localStore()
  if (!storage || !lessonId || !userId) return false
  return readStorageFlag(storage, lessonEngagePromptDismissedKey(userId, lessonId))
}

export function setLessonEngagePromptDismissed(lessonId: string, userId: string): void {
  const storage = localStore()
  if (!storage || !lessonId || !userId) return
  writeStorageFlag(storage, lessonEngagePromptDismissedKey(userId, lessonId))
}

export function showLessonEngagePrompt(input: {
  contentEngaged: boolean
  dismissed: boolean
  canAccess: boolean
  canAccessContent: boolean
  hasRating: boolean
}): boolean {
  return input.contentEngaged
    && !input.dismissed
    && input.canAccess
    && input.canAccessContent
    && !input.hasRating
}

export function shouldDismissForCommentRefresh(
  source: LessonCommentRefresh,
  commentArmed: boolean,
): boolean {
  return source === 'post' && commentArmed
}

export function shouldDismissForShare(input: {
  promptVisible: boolean
  openedFromPrompt: boolean
}): boolean {
  return input.promptVisible || input.openedFromPrompt
}

export function engagementAfterIdentityChange(storedEngaged: boolean): {
  engagedEmitted: boolean
  emit: boolean
} {
  if (storedEngaged) return { engagedEmitted: true, emit: true }
  return { engagedEmitted: false, emit: false }
}

export function engageDwellMs(kind: EngageContentKind, pageTotal: number): number | null {
  if (kind === 'pdf') return pageTotal === 1 ? PDF_SINGLE_PAGE_DWELL_MS : null
  if (kind === 'image') return IMAGE_DWELL_MS
  return null
}

export function pageMarksEngaged(page: number): boolean {
  return page >= 2
}
