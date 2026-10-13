<script setup lang="ts">
import { toast } from 'vue-sonner'
import AdminTablePager from '~/components/admin/AdminTablePager.vue'
import UiButton from '~/components/ui/Button.vue'
import UiInput from '~/components/ui/Input.vue'
import UiSkeleton from '~/components/ui/Skeleton.vue'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '~/components/ui/table'
import TooltipProvider from '~/components/ui/tooltip/TooltipProvider.vue'
import Tooltip from '~/components/ui/tooltip/Tooltip.vue'
import TooltipTrigger from '~/components/ui/tooltip/TooltipTrigger.vue'
import TooltipContent from '~/components/ui/tooltip/TooltipContent.vue'
import UiAlertDialogRoot from '~/components/ui/alert-dialog/AlertDialogRoot.vue'
import UiAlertDialogPortal from '~/components/ui/alert-dialog/AlertDialogPortal.vue'
import UiAlertDialogOverlay from '~/components/ui/alert-dialog/AlertDialogOverlay.vue'
import UiAlertDialogContent from '~/components/ui/alert-dialog/AlertDialogContent.vue'
import UiAlertDialogHeader from '~/components/ui/alert-dialog/AlertDialogHeader.vue'
import UiAlertDialogFooter from '~/components/ui/alert-dialog/AlertDialogFooter.vue'
import UiAlertDialogTitle from '~/components/ui/alert-dialog/AlertDialogTitle.vue'
import UiAlertDialogDescription from '~/components/ui/alert-dialog/AlertDialogDescription.vue'
import UiAlertDialogCancel from '~/components/ui/alert-dialog/AlertDialogCancel.vue'
import UiAlertDialogAction from '~/components/ui/alert-dialog/AlertDialogAction.vue'
import type { Purchase } from '~/types/database'
import type { AdminListPage } from '~~/types/domain'

// Extend the base Purchase type with the users join used by the admin endpoint
interface PurchaseWithUser extends Purchase {
  users?: { name: string | null; email: string | null } | null
}

definePageMeta({ layout: 'admin', middleware: 'admin' })
const adminFetch = useAdminFetch()
useHead(() => ({ title: 'Διαχείριση - Αγορές' }))

const userQuery = ref('')
const lessonQuery = ref('')
const hasFilter = computed(() => Boolean(userQuery.value.trim() || lessonQuery.value.trim()))

// Grant access confirmation
const grantDialogOpen = ref(false)
const pendingGrant = ref<{ userId: string; lessonId: string } | null>(null)
const grantingId = ref<string | null>(null)

const {
  page,
  total,
  pageSize,
  items: purchases,
  loading,
  ready,
  load,
  onSearchInput,
} = useAdminTablePage<PurchaseWithUser>(
  (pageNumber) => adminFetch<AdminListPage<PurchaseWithUser>>('/api/admin/purchases', {
    query: {
      page: pageNumber,
      user: userQuery.value.trim(),
      lesson: lessonQuery.value.trim(),
    },
  }),
  () => toast.error('Κάτι πήγε στραβά'),
)

watch([userQuery, lessonQuery], () => {
  onSearchInput()
})

onMounted(load)

function requestGrantAccess(userId: string, lessonId: string) {
  pendingGrant.value = { userId, lessonId }
  grantDialogOpen.value = true
}

async function confirmGrantAccess() {
  const grant = pendingGrant.value
  if (!grant) return
  grantingId.value = `${grant.userId}-${grant.lessonId}`
  try {
    await adminFetch('/api/admin/purchases/grant', { method: 'POST', body: { userId: grant.userId, lessonId: grant.lessonId } })
    toast.success('Η πρόσβαση χορηγήθηκε')
    grantDialogOpen.value = false
    if (page.value === 1) await load()
    else page.value = 1
  } catch {
    toast.error('Αποτυχία χορήγησης')
  } finally {
    grantingId.value = null
    pendingGrant.value = null
  }
}

function copyStripeId(value: string | null | undefined) {
  if (!value || !import.meta.client) return
  navigator.clipboard.writeText(value)
  toast.success('Αντιγράφηκε στο πρόχειρο')
}
</script>

<template>
  <div>
    <div class="flex items-center justify-between mb-6">
      <h1 class="text-2xl font-bold font-heading">Αγορές</h1>
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

    <!-- Skeleton loading -->
    <template v-if="loading && !ready">
      <div class="overflow-hidden rounded-2xl border border-border">
        <div class="overflow-x-auto">
        <Table class="text-base">
          <TableHeader>
            <TableRow>
              <TableHead v-for="i in 5" :key="i"><UiSkeleton class="h-4 w-20" /></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="i in 5" :key="i">
              <TableCell v-for="j in 5" :key="j"><UiSkeleton class="h-4 w-full" /></TableCell>
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
              <TableHead class="border-r border-border">Όνομα</TableHead>
              <TableHead class="border-r border-border">Υλικό</TableHead>
              <TableHead class="border-r border-border">Εγγραφή</TableHead>
              <TableHead class="border-r border-border">Stripe ID</TableHead>
              <TableHead class="text-right" />
            </TableRow>
          </TableHeader>
          <TableBody>
            <!-- Empty state -->
            <TableRow v-if="!purchases.length">
              <TableCell :colspan="5" class="h-32 text-center border-r border-border">
                <div class="flex flex-col items-center gap-2 text-muted-foreground">
                  <VIcon name="bi-inbox" class="size-8" />
                  <p>{{ hasFilter ? 'Δεν βρέθηκαν αγορές.' : 'Δεν υπάρχουν αγορές ακόμη.' }}</p>
                </div>
              </TableCell>
            </TableRow>
            <!-- Rows -->
            <TableRow v-for="p in purchases" v-else :key="p.id">
              <TableCell class="border-r border-border">
                <div class="font-medium">{{ p.users?.name ?? '—' }}</div>
                <div class="text-muted-foreground">{{ p.users?.email }}</div>
              </TableCell>
              <TableCell class="border-r border-border">{{ p.lessons?.title ?? p.lesson_id }}</TableCell>
              <TableCell class="text-muted-foreground border-r border-border">
                {{ new Date(p.created_at).toLocaleDateString() }}
              </TableCell>
              <TableCell class="border-r border-border">
                <TooltipProvider v-if="p.stripe_session_id">
                  <Tooltip>
                    <TooltipTrigger as-child>
                      <button
                        type="button"
                        class="text-xs text-muted-foreground font-mono cursor-pointer hover:text-primary transition-colors"
                        @click="copyStripeId(p.stripe_session_id)"
                      >
                        {{ p.stripe_session_id.slice(0, 16) }}…
                      </button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p class="font-mono text-xs">{{ p.stripe_session_id }}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <span v-else class="text-muted-foreground">—</span>
              </TableCell>
              <TableCell class="text-right">
                <UiButton
                  size="sm"
                  variant="outline"
                  :disabled="grantingId === `${p.user_id}-${p.lesson_id}`"
                  @click="requestGrantAccess(p.user_id, p.lesson_id)"
                >
                  Χορήγηση πρόσβασης
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

    <!-- Grant access confirmation dialog -->
    <UiAlertDialogRoot v-model:open="grantDialogOpen">
      <UiAlertDialogPortal>
        <UiAlertDialogOverlay />
        <UiAlertDialogContent>
          <UiAlertDialogHeader>
            <UiAlertDialogTitle>Χορήγηση πρόσβασης</UiAlertDialogTitle>
            <UiAlertDialogDescription>Είστε σίγουροι ότι θέλετε να χορηγήσετε πρόσβαση σε αυτό το υλικό;</UiAlertDialogDescription>
          </UiAlertDialogHeader>
          <UiAlertDialogFooter>
            <UiAlertDialogCancel>
              <UiButton variant="cancel">Ακύρωση</UiButton>
            </UiAlertDialogCancel>
            <UiAlertDialogAction as-child>
              <UiButton :disabled="!!grantingId" @click="confirmGrantAccess">
                Χορήγηση πρόσβασης
              </UiButton>
            </UiAlertDialogAction>
          </UiAlertDialogFooter>
        </UiAlertDialogContent>
      </UiAlertDialogPortal>
    </UiAlertDialogRoot>
  </div>
</template>
