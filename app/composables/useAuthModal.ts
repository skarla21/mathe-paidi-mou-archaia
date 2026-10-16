export function useAuthModal() {
  const { session, fetchSession } = useCurrentUser()
  const isOpen = useState<boolean>('authModal.open', () => false)
  const activeTab = useState<'login' | 'register'>('authModal.tab', () => 'login')
  const loginSubView = useState<'form' | 'forgot'>('authModal.loginSubView', () => 'form')
  const pendingRedirect = useState<string | null>('authModal.redirect', () => null)

  function signedIn() {
    return !!session.value.user?.id
  }

  // The client session can outlive the cookie (logout in another tab). Confirm
  // with the server before refusing to open, so a stale session cannot trap
  // the auth middleware's login prompt.
  async function sessionStillValid() {
    if (!signedIn()) return false
    await fetchSession()
    return signedIn()
  }

  async function openLogin(redirectTo?: string) {
    if (await sessionStillValid()) return false
    pendingRedirect.value = redirectTo ?? null
    activeTab.value = 'login'
    loginSubView.value = 'form'
    isOpen.value = true
    return true
  }

  async function openRegister(redirectTo?: string) {
    if (await sessionStillValid()) return
    pendingRedirect.value = redirectTo ?? null
    activeTab.value = 'register'
    isOpen.value = true
  }

  async function openForgot() {
    if (await sessionStillValid()) return
    activeTab.value = 'login'
    loginSubView.value = 'forgot'
    isOpen.value = true
  }

  function backToLogin() {
    loginSubView.value = 'form'
  }

  function close() {
    isOpen.value = false
    pendingRedirect.value = null
    activeTab.value = 'login'
    loginSubView.value = 'form'
  }

  return { isOpen, activeTab, loginSubView, pendingRedirect, openLogin, openRegister, openForgot, backToLogin, close }
}
