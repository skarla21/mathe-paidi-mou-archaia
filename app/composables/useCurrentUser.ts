interface CurrentUser {
  id: string;
  email?: string | null;
  isAdmin: boolean;
  name?: string | null;
  avatar_url?: string | null;
  provider?: string;
  created_at?: string | null;
  email_verified?: boolean;
}

type SessionUser = Omit<CurrentUser, "isAdmin"> & { isAdmin?: boolean };

export function useCurrentUser() {
  const session = useState<{ user: CurrentUser | null }>("current-user-session", () => ({ user: null }));

  const fetchSession = async () => {
    const result = await $fetch<{ user?: SessionUser | null }>("/api/auth/session", {
      method: "GET",
      credentials: "include",
    }).catch((err) => {
      if (import.meta.dev) console.warn('[useCurrentUser] session fetch failed:', err)
      return { user: null }
    });

    const user = result.user
    session.value.user = user ? { ...user, isAdmin: user.isAdmin === true } : null
  };

  if (import.meta.client && session.value.user === null) {
    fetchSession();
  }

  const isAdmin = computed(() => session.value.user?.isAdmin === true);
  const isStudent = computed(
    () => !!session.value.user && !session.value.user.isAdmin,
  );

  const updateUser = (
    payload: Partial<{ name: string | null; avatar_url: string | null }>,
  ) => {
    if (session.value.user) {
      session.value.user = { ...session.value.user, ...payload };
    }
  };

  return {
    session,
    fetchSession,
    isAdmin,
    isStudent,
    updateUser,
  };
}
