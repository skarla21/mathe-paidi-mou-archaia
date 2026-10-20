<script setup lang="ts">
import { toast } from 'vue-sonner'
import { EMAIL_REGEX, PASSWORD_MIN_LENGTH } from '~/lib/validation'

const { isOpen, activeTab, loginSubView, pendingRedirect, close, openForgot, backToLogin } = useAuthModal()
const { session, fetchSession } = useCurrentUser()
const { signInWithGoogle } = useGoogleSignIn()
const googleEnabled = ref(false)

// Login state
const loginEmail = ref('')
const loginPassword = ref('')
const loginLoading = ref(false)
const loginErrors = ref<{ email?: string; password?: string }>({})

// Forgot password state
const forgotEmail = ref('')
const forgotLoading = ref(false)
const forgotError = ref('')

// Register state
const registerName = ref('')
const registerEmail = ref('')
const registerPassword = ref('')
const registerLoading = ref(false)
const registerAcceptTerms = ref(false)
const registerErrors = ref<{ name?: string; email?: string; password?: string; terms?: string }>({})

// Clear errors on tab switch (keep field values)
watch(activeTab, () => {
  loginErrors.value = {}
  registerErrors.value = {}
  forgotError.value = ''
})

watch(loginSubView, () => {
  forgotError.value = ''
})

watch(
  () => session.value.user?.id,
  (userId) => {
    if (userId && isOpen.value) close()
  },
)

watch(isOpen, (open) => {
  if (open) void loadGoogleProvider()
})

async function loadGoogleProvider() {
  try {
    const providers = await $fetch<Record<string, unknown>>('/api/auth/providers', { credentials: 'include' })
    googleEnabled.value = Boolean(providers.google)
  } catch {
    googleEnabled.value = false
  }
}

async function onGoogleLogin() {
  await signInWithGoogle(pendingRedirect.value ?? '/')
}

async function onGoogleSignup() {
  registerErrors.value = { ...registerErrors.value, terms: undefined }
  if (!registerAcceptTerms.value) {
    registerErrors.value.terms = 'Αποδέξου τους όρους χρήσης για να συνεχίσεις'
    return
  }
  try {
    const { csrfToken } = await $fetch<{ csrfToken: string }>('/api/auth/csrf', { credentials: 'include' })
    await $fetch('/api/google-terms', {
      method: 'POST',
      credentials: 'include',
      body: { csrfToken },
    })
    await signInWithGoogle(pendingRedirect.value ?? '/', csrfToken)
  } catch {
    toast.error('Η εγγραφή με Google δεν ήταν δυνατή')
  }
}

async function onLoginSubmit() {
  loginErrors.value = {}
  if (!EMAIL_REGEX.test(loginEmail.value)) loginErrors.value.email = 'Παρακαλώ εισάγετε έγκυρο email'
  if (loginPassword.value.length < PASSWORD_MIN_LENGTH) loginErrors.value.password = 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες'
  if (Object.keys(loginErrors.value).length > 0) return

  loginLoading.value = true
  try {
    const { csrfToken } = await $fetch<{ csrfToken: string }>('/api/auth/csrf', { credentials: 'include' })
    const result = await $fetch<{ url?: string }>('/api/auth/callback/credentials', {
      method: 'POST',
      headers: { 'X-Auth-Return-Redirect': '1' },
      body: { email: loginEmail.value, password: loginPassword.value, csrfToken, callbackUrl: '/' },
      credentials: 'include',
    })
    const redirectUrl = result?.url ?? ''
    if (!redirectUrl || redirectUrl.includes('/error') || redirectUrl.includes('error=')) {
      const urlParams = new URLSearchParams(redirectUrl.split('?')[1] ?? '')
      const errorCode = urlParams.get('error') ?? ''
      const errorMap: Record<string, string> = {
        CredentialsSignin: 'Λάθος email ή κωδικός',
        OAuthAccountNotLinked: 'Αυτό το email χρησιμοποιείται με διαφορετικό τρόπο σύνδεσης',
      }
      toast.error(errorMap[errorCode] ?? 'Η σύνδεση δεν ήταν δυνατή')
      return
    }
    const redirect = pendingRedirect.value
    await fetchSession()
    close()
    toast.success('Καλώς ήρθατε!')
    if (redirect) await navigateTo(redirect)
  } catch (e: unknown) {
    const error = e as { data?: { message?: string } }
    toast.error(error.data?.message || 'Η σύνδεση δεν ήταν δυνατή')
  } finally {
    loginLoading.value = false
  }
}

async function onForgotSubmit() {
  forgotError.value = ''
  if (!EMAIL_REGEX.test(forgotEmail.value)) {
    forgotError.value = 'Παρακαλώ εισάγετε έγκυρο email'
    return
  }
  forgotLoading.value = true
  try {
    await $fetch('/api/auth/forgot-password', {
      method: 'POST',
      body: { email: forgotEmail.value },
    })
    toast.success('Έλεγξε το email σου για τον σύνδεσμο επαναφοράς.')
    backToLogin()
    forgotEmail.value = ''
  } catch (e: unknown) {
    const error = e as { data?: { message?: string } }
    forgotError.value = error.data?.message || 'Κάτι πήγε στραβά'
  } finally {
    forgotLoading.value = false
  }
}

async function onRegisterSubmit() {
  registerErrors.value = {}
  if (registerName.value.trim().length < 2) registerErrors.value.name = 'Το όνομα πρέπει να έχει τουλάχιστον 2 χαρακτήρες'
  if (!EMAIL_REGEX.test(registerEmail.value)) registerErrors.value.email = 'Παρακαλώ εισάγετε έγκυρο email'
  if (registerPassword.value.length < PASSWORD_MIN_LENGTH) registerErrors.value.password = 'Ο κωδικός πρέπει να έχει τουλάχιστον 8 χαρακτήρες'
  if (!registerAcceptTerms.value) registerErrors.value.terms = 'Αποδέξου τους όρους χρήσης για να συνεχίσεις'
  if (Object.keys(registerErrors.value).length > 0) return

  registerLoading.value = true
  try {
    await $fetch<{ ok: true }>('/api/auth/register', {
      method: 'POST',
      body: {
        name: registerName.value.trim(),
        email: registerEmail.value,
        password: registerPassword.value,
        acceptTerms: true,
      },
    })
    const { csrfToken } = await $fetch<{ csrfToken: string }>('/api/auth/csrf', { credentials: 'include' })
    const signInResult = await $fetch<{ url?: string }>('/api/auth/callback/credentials', {
      method: 'POST',
      headers: { 'X-Auth-Return-Redirect': '1' },
      body: { email: registerEmail.value, password: registerPassword.value, csrfToken, callbackUrl: '/' },
      credentials: 'include',
    })
    const redirectUrl = signInResult?.url ?? ''
    if (redirectUrl.includes('/error') || redirectUrl.includes('error=')) {
      toast.error('Η εγγραφή δεν ήταν δυνατή')
      return
    }
    const redirect = pendingRedirect.value
    await fetchSession()
    close()
    toast.success('Καλώς ήρθες! Ο λογαριασμός σου δημιουργήθηκε.')
    if (redirect) await navigateTo(redirect)
  } catch (e: unknown) {
    const error = e as { data?: { message?: string } }
    toast.error(error.data?.message || 'Η εγγραφή δεν ήταν δυνατή')
  } finally {
    registerLoading.value = false
  }
}
</script>

<template>
  <UiDialog :open="isOpen" @update:open="(open: boolean) => !open && close()">
    <UiDialogPortal>
      <UiDialogOverlay class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm" />
      <UiDialogContent
        class="overflow-hidden max-w-sm p-0 border-0 rounded-3xl shadow-[0_0_30px_-8px_rgba(0,0,0,0.12)] bg-background dark:bg-card/80 dark:backdrop-blur-md dark:border dark:border-border"
      >
        <!-- Accessibility: visually hidden title and description -->
        <UiDialogTitle class="sr-only">
          {{ activeTab === 'login' ? 'Σύνδεση' : 'Εγγραφή' }}
        </UiDialogTitle>
        <UiDialogDescription class="sr-only">
          {{ activeTab === 'login' ? 'Συνδέσου για να συνεχίσεις στα μαθήματά σου.' : 'Δημιούργησε λογαριασμό μαθητή για να ξεκινήσεις.' }}
        </UiDialogDescription>

        <!-- Background image overlay -->
        <div
          class="absolute inset-0 bg-cover bg-center pointer-events-none"
          :style="`background-image: url('/imgs/${activeTab === 'login' ? 'login_bg.jpg' : 'sign_up.jpg'}'); opacity: 0.2;`"
          aria-hidden="true"
        />

        <!-- Modal content -->
        <div class="relative z-10">
          <!-- Tab switcher -->
          <div class="flex border-b border-border">
            <button
              type="button"
              class="flex-1 py-3 text-sm font-medium font-heading transition-colors border-b-2 -mb-px cursor-pointer"
              :class="activeTab === 'login' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'"
              @click="activeTab = 'login'"
            >
              Σύνδεση
            </button>
            <button
              type="button"
              class="flex-1 py-3 text-sm font-medium font-heading transition-colors border-b-2 -mb-px cursor-pointer"
              :class="activeTab === 'register' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'"
              @click="activeTab = 'register'"
            >
              Εγγραφή
            </button>
          </div>

          <div class="p-6">
            <!-- Login panel -->
            <div v-if="activeTab === 'login'">
              <!-- Forgot password sub-view -->
              <template v-if="loginSubView === 'forgot'">
                <div class="mb-5">
                  <h2 class="text-lg font-heading font-semibold text-foreground">Επαναφορά κωδικού</h2>
                  <p class="text-sm text-muted-foreground mt-0.5">Εισήγαγε το email σου και θα σου στείλουμε σύνδεσμο για επαναφορά του κωδικού.</p>
                </div>
                <form class="space-y-4" @submit.prevent="onForgotSubmit">
                  <div>
                    <UiLabel for="forgot-email" class="sr-only">Email</UiLabel>
                    <UiInput
                      id="forgot-email"
                      v-model="forgotEmail"
                      type="text"
                      inputmode="email"
                      placeholder="Email"
                      autocomplete="email"
                    />
                    <p v-if="forgotError" class="text-xs text-destructive mt-1">{{ forgotError }}</p>
                  </div>
                  <UiButton type="submit" class="w-full" :disabled="forgotLoading">
                    {{ forgotLoading ? 'Αποστολή...' : 'Αποστολή συνδέσμου' }}
                  </UiButton>
                  <button
                    type="button"
                    class="text-sm text-primary font-medium hover:underline cursor-pointer"
                    @click="backToLogin"
                  >
                    Πίσω στη σύνδεση
                  </button>
                </form>
              </template>

              <!-- Login form -->
              <template v-else>
                <div class="mb-5">
                  <h2 class="text-lg font-heading font-semibold text-foreground">Σύνδεση</h2>
                  <p class="text-sm text-muted-foreground mt-0.5">Συνδέσου για να συνεχίσεις στα μαθήματά σου.</p>
                </div>

                <form class="space-y-4" @submit.prevent="onLoginSubmit">
                  <!-- Email -->
                  <div>
                    <UiLabel for="login-email" class="sr-only">Email</UiLabel>
                    <UiInput
                      id="login-email"
                      v-model="loginEmail"
                      type="text"
                      inputmode="email"
                      placeholder="Email"
                      autocomplete="email"
                    />
                    <p v-if="loginErrors.email" class="text-xs text-destructive mt-1">{{ loginErrors.email }}</p>
                  </div>

                  <!-- Password -->
                  <div>
                    <UiLabel for="login-password" class="sr-only">Κωδικός πρόσβασης</UiLabel>
                    <UiPasswordInput
                      id="login-password"
                      v-model="loginPassword"
                      placeholder="Κωδικός πρόσβασης"
                      autocomplete="current-password"
                    />
                    <p v-if="loginErrors.password" class="text-xs text-destructive mt-1">{{ loginErrors.password }}</p>
                    <button
                      type="button"
                      class="text-xs text-primary font-medium hover:underline mt-1 cursor-pointer"
                      @click="openForgot"
                    >
                      Ξέχασες τον κωδικό;
                    </button>
                  </div>

                  <!-- Submit -->
                  <UiButton type="submit" class="w-full" :disabled="loginLoading">
                    {{ loginLoading ? 'Γίνεται σύνδεση...' : 'Σύνδεση' }}
                  </UiButton>
                </form>

                <div v-if="googleEnabled" class="mt-3 space-y-3">
                  <div class="flex items-center gap-3">
                    <span class="h-px flex-1 bg-border" />
                    <span class="text-xs text-muted-foreground">ή</span>
                    <span class="h-px flex-1 bg-border" />
                  </div>
                  <UiButton type="button" variant="outline" class="w-full gap-2" @click="onGoogleLogin">
                    <AuthGoogleMark />
                    Σύνδεση με Google
                  </UiButton>
                </div>

                <!-- Switch to register -->
                <p class="text-center text-sm text-muted-foreground mt-4">
                  Δεν έχεις λογαριασμό;
                  <button
                    type="button"
                    class="text-primary font-medium hover:underline cursor-pointer"
                    @click="activeTab = 'register'"
                  >
                    Εγγραφή
                  </button>
                </p>
              </template>
            </div>

            <!-- Register panel -->
            <div v-else>
              <div class="mb-5">
                <h2 class="text-lg font-heading font-semibold text-foreground">Εγγραφή</h2>
                <p class="text-sm text-muted-foreground mt-0.5">Δημιούργησε λογαριασμό μαθητή για να ξεκινήσεις.</p>
              </div>

              <form class="space-y-4" @submit.prevent="onRegisterSubmit">
                <!-- Name -->
                <div>
                  <UiLabel for="register-name" class="sr-only">Ονοματεπώνυμο</UiLabel>
                  <UiInput
                    id="register-name"
                    v-model="registerName"
                    type="text"
                    placeholder="Ονοματεπώνυμο"
                    autocomplete="name"
                  />
                  <p v-if="registerErrors.name" class="text-xs text-destructive mt-1">{{ registerErrors.name }}</p>
                </div>

                <!-- Email -->
                <div>
                  <UiLabel for="register-email" class="sr-only">Email</UiLabel>
                  <UiInput
                    id="register-email"
                    v-model="registerEmail"
                    type="text"
                    inputmode="email"
                    placeholder="Email"
                    autocomplete="email"
                  />
                  <p v-if="registerErrors.email" class="text-xs text-destructive mt-1">{{ registerErrors.email }}</p>
                </div>

                <!-- Password -->
                <div>
                  <UiLabel for="register-password" class="sr-only">Κωδικός πρόσβασης</UiLabel>
                  <UiPasswordInput
                    id="register-password"
                    v-model="registerPassword"
                    placeholder="Κωδικός πρόσβασης"
                    autocomplete="new-password"
                  />
                  <p v-if="registerErrors.password" class="text-xs text-destructive mt-1">{{ registerErrors.password }}</p>
                </div>

                <div>
                  <div class="flex items-center gap-2">
                    <UiCheckbox
                      id="register-terms"
                      v-model="registerAcceptTerms"
                      class="size-5 border border-foreground bg-white shadow-sm data-[state=checked]:border-primary data-[state=checked]:bg-primary data-[state=checked]:text-white"
                      :aria-invalid="registerErrors.terms ? true : undefined"
                      :aria-describedby="registerErrors.terms ? 'register-terms-error' : undefined"
                    />
                    <UiLabel for="register-terms" class="text-xs leading-relaxed font-normal text-muted-foreground">
                      Έχω διαβάσει και αποδέχομαι τους
                      <NuxtLink
                        to="/oroi"
                        class="font-semibold text-primary underline-offset-4 hover:underline"
                        @click.stop="close"
                      >
                        όρους χρήσης
                      </NuxtLink>.
                      Τα στοιχεία του λογαριασμού περιγράφονται στην
                      <NuxtLink
                        to="/aporrito"
                        class="font-semibold text-primary underline-offset-4 hover:underline"
                        @click.stop="close"
                      >
                        πολιτική απορρήτου
                      </NuxtLink>.
                    </UiLabel>
                  </div>
                  <p v-if="registerErrors.terms" id="register-terms-error" class="text-xs text-destructive mt-1">{{ registerErrors.terms }}</p>
                </div>

                <!-- Submit -->
                <UiButton type="submit" class="w-full" :disabled="registerLoading">
                  {{ registerLoading ? 'Γίνεται εγγραφή...' : 'Εγγραφή' }}
                </UiButton>
              </form>

              <div v-if="googleEnabled" class="mt-3 space-y-3">
                <div class="flex items-center gap-3">
                  <span class="h-px flex-1 bg-border" />
                  <span class="text-xs text-muted-foreground">ή</span>
                  <span class="h-px flex-1 bg-border" />
                </div>
                <UiButton type="button" variant="outline" class="w-full gap-2" @click="onGoogleSignup">
                  <AuthGoogleMark />
                  Εγγραφή με Google
                </UiButton>
              </div>

              <!-- Switch to login -->
              <p class="text-center text-sm text-muted-foreground mt-4">
                Έχεις ήδη λογαριασμό;
                <button
                  type="button"
                  class="text-primary font-medium hover:underline cursor-pointer"
                  @click="activeTab = 'login'"
                >
                  Σύνδεση
                </button>
              </p>
            </div>
          </div>
        </div>
      </UiDialogContent>
    </UiDialogPortal>
  </UiDialog>
</template>
