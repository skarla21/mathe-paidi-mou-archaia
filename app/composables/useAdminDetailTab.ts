import type { AdminListPage } from '~~/types/domain'

/** One paged tab inside an admin detail modal. */
export function useAdminDetailTab<T>() {
  const items = ref<T[]>([])
  const page = ref(1)
  const total = ref(0)
  const pageSize = ref(20)
  const loading = ref(false)

  async function load(
    fetcher: (pageNumber: number) => Promise<AdminListPage<T>>,
  ) {
    loading.value = true
    try {
      let result = await fetcher(page.value)
      const size = result.pageSize > 0 ? result.pageSize : 20
      const last = Math.max(1, Math.ceil(result.total / size))
      if (page.value > last) {
        page.value = last
        result = await fetcher(page.value)
      }
      items.value = result.items
      total.value = result.total
      pageSize.value = result.pageSize > 0 ? result.pageSize : size
    } catch {
      items.value = []
      total.value = 0
      throw new Error('load failed')
    } finally {
      loading.value = false
    }
  }

  function reset() {
    items.value = []
    page.value = 1
    total.value = 0
  }

  return { items, page, total, pageSize, loading, load, reset }
}
