<script setup lang="ts">
import { authDialogQuery } from '#shared/utils/authDialogQuery.mjs'
import { acceptEmailVerification, emailVerificationFollowUp } from '#shared/utils/emailVerificationLanding.mjs'
import 'vue-sonner/style.css'
import { toast, Toaster } from 'vue-sonner'
import LayoutAppHeader from '~/components/layout/AppHeader.vue'
import LayoutAppFooter from '~/components/layout/AppFooter.vue'

const theme = useTheme()
const route = useRoute()
const hideLayoutFooter = computed(() => !!route.meta['hideLayoutFooter'])
const { ensure, ensureCategories } = useCatalogNav()
const { session, fetchSession } = useCurrentUser()
const { open: openEditProfile } = useEditProfileModal()
const { openLogin, openRegister } = useAuthModal()

// Header and footer read this shared state. Load it before they render so
// the server markup matches the payload the client hydrates.
await Promise.all([ensure(), ensureCategories()])

const handledEmailVerification = useState<string | null>('emailVerification.handled', () => null)

async function consumeEmailVerification() {
  const status = acceptEmailVerification(route.query.emailVerification, handledEmailVerification.value)
  if (!status) return

  handledEmailVerification.value = status
  await fetchSession()

  const query = { ...route.query }
  delete query.emailVerification
  await navigateTo({ path: route.path, query }, { replace: true })

  const followUp = emailVerificationFollowUp(status, !!session.value.user)
  if (!followUp) return
  if (followUp.toast === 'success') toast.success(followUp.message)
  else toast.error(followUp.message)
  if (followUp.open === 'profile') openEditProfile()
  else if (followUp.open === 'login') openLogin(route.fullPath)
}

async function openAuthFromQuery() {
  const dialog = authDialogQuery(route.query.auth)
  if (!dialog) return

  const query = { ...route.query }
  delete query.auth
  const redirectTo = route.path
  await navigateTo({ path: route.path, query }, { replace: true })

  if (dialog === 'register') await openRegister(redirectTo)
  else await openLogin(redirectTo)
}

onMounted(() => {
  theme.init()
  void (async () => {
    await consumeEmailVerification()
    await openAuthFromQuery()
  })()
})
</script>

<template>
  <div class="min-h-screen flex flex-col bg-background text-foreground">
    <Toaster />
    <AuthModal />
    <EditProfileModal />
    <LayoutAppHeader />
    <main class="flex-1 flex flex-col w-full">
      <div class="flex-1 flex flex-col">
        <slot />
      </div>
      <LayoutAppFooter v-if="!hideLayoutFooter" />
    </main>
  </div>
</template>
