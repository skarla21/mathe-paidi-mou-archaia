<script setup lang="ts">
import {
  downloadsEmptyMessage,
  LESSON_TYPE_HEADING,
  lessonTypeLabel,
} from '#shared/utils/adminDownloads.mjs'
import { toast } from 'vue-sonner'
import AdminTablePager from '~/components/admin/AdminTablePager.vue'
import UiInput from '~/components/ui/Input.vue'
import UiSkeleton from '~/components/ui/Skeleton.vue'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import type { AdminListPage, DownloadWithJoins } from '~~/types/domain'

definePageMeta({ layout: 'admin', middleware: 'admin' })
const adminFetch = useAdminFetch()
useHead(() => ({ title: 'Διαχείριση - Λήψεις' }))

type SortColumn = 'user' | 'lesson' | 'time'

const userQuery = ref('')
const lessonQuery = ref('')
const sortBy = ref<SortColumn>('time')
const sortOrder = ref<'asc' | 'desc'>('desc')
const hasFilter = computed(() => Boolean(userQuery.value.trim() || lessonQuery.value.trim()))

const {
  page,
  total,
  pageSize,
  items: downloads,
  loading,
  ready,
  load,
  onSearchInput,
  onSortChange,
} = useAdminTablePage<DownloadWithJoins>(
  (pageNumber) => adminFetch<AdminListPage<DownloadWithJoins>>('/api/admin/downloads', {
    query: {
      page: pageNumber,
      user: userQuery.value.trim(),
      lesson: lessonQuery.value.trim(),
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
    sortOrder.value = col === 'time' ? 'desc' : 'asc'
  }
  onSortChange()
}

function formatDownloadedAt(value: string) {
  return new Date(value).toLocaleString('el-GR', { dateStyle: 'short', timeStyle: 'short' })
}

watch([userQuery, lessonQuery], () => {
  onSearchInput()
})

onMounted(load)
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold font-heading">Λήψεις</h1>
    </div>

    <div class="mb-4 grid gap-3 sm:grid-cols-2">
      <div class="relative">
        <VIcon name="bi-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <UiInput
          v-model="userQuery"
          placeholder="Όνομα..."
          aria-label="Φίλτρο ονόματος"
          class="pl-9"
        />
      </div>
      <div class="relative">
        <VIcon name="bi-search" class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <UiInput
          v-model="lessonQuery"
          placeholder="Υλικό..."
          aria-label="Φίλτρο υλικού"
          class="pl-9"
        />
      </div>
    </div>

    <template v-if="loading && !ready">
      <div class="overflow-hidden rounded-2xl border border-border">
        <div class="overflow-x-auto">
        <Table class="text-base">
          <TableHeader>
            <TableRow>
              <TableHead v-for="i in 4" :key="i"><UiSkeleton class="h-4 w-20" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="i in 5" :key="i">
              <TableCell v-for="j in 4" :key="j"><UiSkeleton class="h-4 w-full" /></TableCell>
            </TableRow>
          </TableBody>
        </Table>
        </div>
      </div>
    </template>

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
                  :aria-label="`Όνομα ${sortBy === 'user' ? (sortOrder === 'asc' ? 'Αύξουσα' : 'Φθίνουσα') : ''}`"
                  @click="setSort('user')"
                >
                  Όνομα
                  <VIcon
                    :name="sortBy === 'user' ? (sortOrder === 'asc' ? 'bi-arrow-up-short' : 'bi-arrow-down-short') : 'bi-arrow-down-up'"
                    :class="sortBy === 'user' ? 'size-4 text-foreground shrink-0' : 'size-4 text-muted-foreground/40 shrink-0'"
                  />
                </button>
              </TableHead>
              <TableHead class="border-r border-border pr-3">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer w-full text-left"
                  :aria-label="`Υλικό ${sortBy === 'lesson' ? (sortOrder === 'asc' ? 'Αύξουσα' : 'Φθίνουσα') : ''}`"
                  @click="setSort('lesson')"
                >
                  Υλικό
                  <VIcon
                    :name="sortBy === 'lesson' ? (sortOrder === 'asc' ? 'bi-arrow-up-short' : 'bi-arrow-down-short') : 'bi-arrow-down-up'"
                    :class="sortBy === 'lesson' ? 'size-4 text-foreground shrink-0' : 'size-4 text-muted-foreground/40 shrink-0'"
                  />
                </button>
              </TableHead>
              <TableHead class="border-r border-border">{{ LESSON_TYPE_HEADING }}</TableHead>
              <TableHead class="pr-3">
                <button
                  type="button"
                  class="inline-flex items-center gap-1.5 hover:text-foreground transition-colors cursor-pointer w-full text-left"
                  :aria-label="`Λήψη ${sortBy === 'time' ? (sortOrder === 'asc' ? 'Αύξουσα' : 'Φθίνουσα') : ''}`"
                  @click="setSort('time')"
                >
                  Λήψη
                  <VIcon
                    :name="sortBy === 'time' ? (sortOrder === 'asc' ? 'bi-arrow-up-short' : 'bi-arrow-down-short') : 'bi-arrow-down-up'"
                    :class="sortBy === 'time' ? 'size-4 text-foreground shrink-0' : 'size-4 text-muted-foreground/40 shrink-0'"
                  />
                </button>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-if="!downloads.length">
              <TableCell :colspan="4" class="h-32 text-center">
                <div class="flex flex-col items-center gap-2 text-muted-foreground">
                  <VIcon name="bi-inbox" class="size-8" />
                  <p>{{ downloadsEmptyMessage(hasFilter) }}</p>
                </div>
              </TableCell>
            </TableRow>
            <TableRow v-for="row in downloads" v-else :key="row.id">
              <TableCell class="border-r border-border">
                <div class="font-medium">{{ row.users?.name ?? '—' }}</div>
                <div class="text-muted-foreground">{{ row.users?.email }}</div>
              </TableCell>
              <TableCell class="border-r border-border">{{ row.lessons?.title ?? row.lesson_id }}</TableCell>
              <TableCell class="border-r border-border">{{ lessonTypeLabel(row) }}</TableCell>
              <TableCell class="text-muted-foreground">{{ formatDownloadedAt(row.downloaded_at) }}</TableCell>
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
  </div>
</template>
