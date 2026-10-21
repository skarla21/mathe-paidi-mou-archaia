<script setup lang="ts">
import { authDialogQuery } from '#shared/utils/authDialogQuery.mjs'
import { acceptEmailVerification, emailVerificationFollowUp } from '#shared/utils/emailVerificationLanding.mjs'
import { googleAuthErrorMessage, takeGoogleAuthError } from '#shared/utils/googleAuthError.mjs'
import 'vue-sonner/style.css'
import { toast, Toaster } from 'vue-sonner'
import LayoutAppHeader from '~/components/layout/AppHeader.vue'
import LayoutAppFooter from '~/components/layout/AppFooter.vue'
import { jsonLdGraph, jsonLdScript, organizationNode, websiteNode } from '~/utils/jsonLd'

useHead({
  script: [jsonLdScript(jsonLdGraph([organizationNode(), websiteNode()]), 'ld-json-site')],
})

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
const handledGoogleAuth = useState<string | null>('googleAuth.handled', () => null)

async function consumeGoogleAuth() {
  const value = route.query.googleAuth
  const code = Array.isArray(value) ? value[0] : value
  const next = takeGoogleAuthError(handledGoogleAuth.value, code)
  handledGoogleAuth.value = next.handled
  if (!next.toast || !code) return

  const query = { ...route.query }
  delete query.googleAuth
  await navigateTo({ path: route.path, query }, { replace: true })
  toast.error(googleAuthErrorMessage(code))
}

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
    await consumeGoogleAuth()
    await openAuthFromQuery()
  })()
})

if (import.meta.client) {
  watch(() => route.query.googleAuth, () => {
    void consumeGoogleAuth()
  })
}
</script>

<template>
  <div class="app-shell min-h-screen flex flex-col bg-background text-foreground">
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
