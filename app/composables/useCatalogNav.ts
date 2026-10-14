interface CategoryLink {
  id: string
  slug: string
  name: string
  description: string | null
  image_url: string | null
  order: number
}

export function useCatalogNav() {
  const { grades, subjects, ensure, failed, loaded } = useGradesData()
  const categories = useState<CategoryLink[]>('nav-categories', () => [])
  const categoriesLoaded = useState('nav-categories-loaded', () => false)
  const categoriesFailed = useState('nav-categories-failed', () => false)

  function subjectsForGrade(gradeId: string) {
    return subjects.value.filter((subject) => subject.grade_id === gradeId)
  }

  async function ensureCategories() {
    if (categoriesLoaded.value) return
    try {
      const data = await $fetch<CategoryLink[]>('/api/categories')
      categories.value = [...(data ?? [])].sort((a, b) => a.order - b.order)
      categoriesFailed.value = false
      categoriesLoaded.value = true
    } catch {
      if (!categoriesLoaded.value) categoriesFailed.value = true
    }
  }

  return {
    grades,
    subjects,
    ensure,
    failed,
    loaded,
    subjectsForGrade,
    categories,
    categoriesLoaded,
    categoriesFailed,
    ensureCategories,
  }
}
