import { onScopeDispose, ref, watch, type Ref } from 'vue'
import type { AdminListPage } from '~~/types/domain'

const SEARCH_DELAY_MS = 300

export function useAdminTablePage<T>(
  loadPage: (page: number) => Promise<AdminListPage<T>>,
  onError?: () => void,
) {
  const page = ref(1)
  const total = ref(0)
  const pageSize = ref(20)
  const items = ref([]) as Ref<T[]>
  const loading = ref(false)
  const ready = ref(false)
  let timer: ReturnType<typeof setTimeout> | undefined
  let skipPageLoad = false
  let requestId = 0

  function clearTimer() {
    if (timer === undefined) return
    clearTimeout(timer)
    timer = undefined
  }

  async function load() {
    const id = ++requestId
    loading.value = true
    try {
      const result = await loadPage(page.value)
      if (id !== requestId) return
      const size = result.pageSize > 0 ? result.pageSize : 20
      const last = Math.max(1, Math.ceil(result.total / size))
      if (page.value > last) {
        page.value = last
        return
      }
      items.value = result.items
      total.value = result.total
      pageSize.value = size
    } catch {
      if (id !== requestId) return
      items.value = []
      total.value = 0
      onError?.()
    } finally {
      if (id === requestId) {
        loading.value = false
        ready.value = true
      }
    }
  }

  function moveToFirstPage() {
    if (page.value === 1) return
    skipPageLoad = true
    page.value = 1
  }

  function onSearchInput() {
    clearTimer()
    moveToFirstPage()
    timer = setTimeout(() => {
      timer = undefined
      void load()
    }, SEARCH_DELAY_MS)
  }

  function onSortChange() {
    clearTimer()
    moveToFirstPage()
    void load()
  }

  watch(page, () => {
    if (skipPageLoad) {
      skipPageLoad = false
      return
    }
    clearTimer()
    void load()
  }, { flush: 'sync' })

  onScopeDispose(clearTimer)

  return { page, total, pageSize, items, loading, ready, load, onSearchInput, onSortChange }
}
