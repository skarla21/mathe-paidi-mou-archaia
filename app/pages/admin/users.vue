<script setup lang="ts">
import { toast } from 'vue-sonner'
import AdminTablePager from '~/components/admin/AdminTablePager.vue'
import UiButton from '~/components/ui/Button.vue'
import UiInput from '~/components/ui/Input.vue'
import UiSkeleton from '~/components/ui/Skeleton.vue'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import AdminUserDetailModal from '~/components/admin/UserDetailModal.vue'
import type { AdminListPage } from '~~/types/domain'
import type { User } from '~/types/database'

definePageMeta({ layout: 'admin', middleware: 'admin' })
const adminFetch = useAdminFetch()
useHead(() => ({ title: 'Διαχείριση - Χρήστες' }))

type SortColumn = 'name' | 'joinedAt' | 'downloads' | 'purchases'

const search = ref('')
const detailUserId = ref<string | null>(null)
const sortBy = ref<SortColumn>('joinedAt')
const sortOrder = ref<'asc' | 'desc'>('desc')

const {
  page,
  total,
  pageSize,
  items: users,
  loading,
  ready,
  load,
  onSearchInput,
  onSortChange,
} = useAdminTablePage<User>(
  (pageNumber) => adminFetch<AdminListPage<User>>('/api/admin/users', {
    query: {
      page: pageNumber,
      q: search.value.trim(),
      sort: sortBy.value,
      order: sortOrder.value,
    },
  }),
  () => toast.error('Κάτι πήγε στραβά'),
)

function setSort(col: SortColumn) {
  if (sortBy.value === col) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = col
    sortOrder.value = col === 'name' ? 'asc' : 'desc'
  }
  onSortChange()
}

watch(search, () => {
  onSearchInput()
})

onMounted(load)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold font-heading">Χρήστες</h1>
    </div>

    <!-- Search -->
    <div class="relative mb-4">
      <VIcon name="bi-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
      <UiInput v-model="search" placeholder="Αναζήτηση..." class="pl-9" />
    </div>

    <!-- Skeleton loading -->
    <template v-if="loading && !ready">
      <div class="overflow-hidden rounded-2xl border border-border">
        <div class="overflow-x-auto">
        <Table class="text-base">
          <TableHeader>
            <TableRow>
              <TableHead v-for="i in 8" :key="i"><UiSkeleton class="h-4 w-20" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="i in 5" :key="i">
              <TableCell v-for="j in 8" :key="j"><UiSkeleton class="h-4 w-full" /></TableCell>
            </TableRow>
          </TableBody>
        </Table>
        </div>
      </div>
    </template>

    <!-- Data table -->
    <template v-else>
      <div class="overflow-hidden rounded-2xl border border-border">
        <div class="overflow-x-auto">
        <Table class="text-base">
          <TableHeader>
            <TableRow class="bg-muted/80 hover:bg-muted/80 border-b border-border">
              <TableHead class="border-r border-border pr-3">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer w-full text-left"
                  :aria-label="`Όνομα ${sortBy === 'name' ? (sortOrder === 'asc' ? 'Αύξουσα' : 'Φθίνουσα') : ''}`"
                  @click="setSort('name')"
                >
                  Όνομα
                  <VIcon
                    :name="sortBy === 'name' ? (sortOrder === 'asc' ? 'bi-arrow-up-short' : 'bi-arrow-down-short') : 'bi-arrow-down-up'"
                    :class="sortBy === 'name' ? 'size-4 text-foreground shrink-0' : 'size-4 text-muted-foreground/40 shrink-0'"
                  />
                </button>
              </TableHead>
              <TableHead class="border-r border-border">Email</TableHead>
              <TableHead class="border-r border-border">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer w-full text-left"
                  :aria-label="`Εγγραφή ${sortBy === 'joinedAt' ? (sortOrder === 'asc' ? 'Αύξουσα' : 'Φθίνουσα') : ''}`"
                  @click="setSort('joinedAt')"
                >
                  Εγγραφή
                  <VIcon
                    :name="sortBy === 'joinedAt' ? (sortOrder === 'asc' ? 'bi-arrow-up-short' : 'bi-arrow-down-short') : 'bi-arrow-down-up'"
                    :class="sortBy === 'joinedAt' ? 'size-4 text-foreground shrink-0' : 'size-4 text-muted-foreground/40 shrink-0'"
                  />
                </button>
              </TableHead>
              <TableHead class="text-center border-r border-border">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer mx-auto"
                  :aria-label="`Λήψεις ${sortBy === 'downloads' ? (sortOrder === 'asc' ? 'Αύξουσα' : 'Φθίνουσα') : ''}`"
                  @click="setSort('downloads')"
                >
                  Λήψεις
                  <VIcon
                    :name="sortBy === 'downloads' ? (sortOrder === 'asc' ? 'bi-arrow-up-short' : 'bi-arrow-down-short') : 'bi-arrow-down-up'"
                    :class="sortBy === 'downloads' ? 'size-4 text-foreground shrink-0' : 'size-4 text-muted-foreground/40 shrink-0'"
                  />
                </button>
              </TableHead>
              <TableHead class="text-center border-r border-border">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer mx-auto"
                  :aria-label="`Αγορές ${sortBy === 'purchases' ? (sortOrder === 'asc' ? 'Αύξουσα' : 'Φθίνουσα') : ''}`"
                  @click="setSort('purchases')"
                >
                  Αγορές
                  <VIcon
                    :name="sortBy === 'purchases' ? (sortOrder === 'asc' ? 'bi-arrow-up-short' : 'bi-arrow-down-short') : 'bi-arrow-down-up'"
                    :class="sortBy === 'purchases' ? 'size-4 text-foreground shrink-0' : 'size-4 text-muted-foreground/40 shrink-0'"
                  />
                </button>
              </TableHead>
              <TableHead class="text-center border-r border-border text-xs">Επισημάνσεις άρθρων</TableHead>
              <TableHead class="text-center border-r border-border text-xs">Σχόλια άρθρων</TableHead>
              <TableHead class="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <!-- Empty state -->
            <TableRow v-if="!users.length">
              <TableCell :colspan="8" class="h-32 text-center border-r border-border">
                <div class="flex flex-col items-center gap-2 text-muted-foreground">
                  <VIcon name="bi-inbox" class="size-8" />
                  <p>{{ search.trim() ? 'Δεν βρέθηκαν χρήστες.' : 'Δεν υπάρχουν χρήστες ακόμα.' }}</p>
                </div>
              </TableCell>
            </TableRow>
            <!-- Rows -->
            <TableRow v-for="u in users" v-else :key="u.id">
              <TableCell class="border-r border-border">
                <div class="flex items-center gap-2">
                  <img
                    v-if="u.avatar_url"
                    :src="u.avatar_url"
                    :alt="u.name ?? 'Όνομα'"
                    class="size-7 rounded-full object-cover"
                  >
                  <VIcon v-else name="bi-person-circle" class="size-7 text-muted-foreground" />
                  <span>{{ u.name ?? '—' }}</span>
                </div>
              </TableCell>
              <TableCell class="text-muted-foreground border-r border-border">{{ u.email }}</TableCell>
              <TableCell class="text-muted-foreground border-r border-border">
                {{ new Date(u.created_at).toLocaleDateString() }}
              </TableCell>
              <TableCell class="text-center border-r border-border">{{ u.downloadCount ?? 0 }}</TableCell>
              <TableCell class="text-center border-r border-border">{{ u.purchaseCount ?? 0 }}</TableCell>
              <TableCell class="text-center border-r border-border">{{ u.articleLikeCount ?? 0 }}</TableCell>
              <TableCell class="text-center border-r border-border">{{ u.articleCommentCount ?? 0 }}</TableCell>
              <TableCell class="text-right">
                <UiButton size="sm" variant="outline" @click="detailUserId = u.id">
                  Λεπτομέρειες χρήστη
                </UiButton>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
        </div>
      </div>
      <AdminTablePager
        v-model:page="page"
        :total="total"
        :page-size="pageSize"
        :disabled="loading"
      />
    </template>

    <AdminUserDetailModal :open="!!detailUserId" :user-id="detailUserId" @close="detailUserId = null" />
  </div>
</template>
