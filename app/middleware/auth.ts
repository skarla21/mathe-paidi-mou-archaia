export default defineNuxtRouteMiddleware(async (to) => {
  const requestFetch = useRequestFetch()
  const authResponse = await requestFetch<{ user?: { id?: string } }>(
    '/api/auth/session',
  ).catch(() => null)

  const user = authResponse?.user

  if (!user?.id) {
    const { openLogin } = useAuthModal()
    if (await openLogin(to.fullPath)) return abortNavigation()
  }
})
