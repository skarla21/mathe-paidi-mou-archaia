import type { AuthConfig, Session, User } from "@auth/core/types";
import type { SupabaseClient } from "@supabase/supabase-js";
import CredentialsProvider from "@auth/core/providers/credentials";
import GoogleProvider from "@auth/core/providers/google";
import { googleAccountLinkUpdate } from "./googleAccountLink";
import { serverSupabaseService } from "./supabaseServer";
import { verifyPassword } from "./password";

type MatheUser = User & {
  id: string;
  isAdmin: boolean;
  name?: string | null;
  avatar_url?: string | null;
};

type GoogleDbUser = {
  id: string;
  isAdmin?: boolean | null;
  name?: string | null;
  avatar_url?: string | null;
  email_verified?: boolean | null;
};

type GoogleProfile = {
  email?: unknown;
  email_verified?: unknown;
};

const GOOGLE_USER_ERROR = "Unable to create Google user";

export function verifiedGoogleEmail(profile: unknown): string | null {
  if (!profile || typeof profile !== "object") return null;
  const record = profile as GoogleProfile;
  if (record.email_verified !== true || typeof record.email !== "string") return null;
  const email = record.email.trim().toLowerCase();
  return email || null;
}

export function googleSignInResult(input: {
  email: string | null;
  existing: { id: string } | null;
  lookupFailed: boolean;
  termsAcceptedAt: string | null;
}): true | string {
  if (!input.email) return "/auth/oauth-error?error=UnverifiedEmail";
  if (input.lookupFailed) return "/auth/oauth-error?error=Configuration";
  if (!input.existing && !input.termsAcceptedAt) return "/auth/oauth-error?error=TermsRequired";
  return true;
}

export async function authorizeCredentials(
  supabase: SupabaseClient,
  email: unknown,
  password: unknown,
): Promise<MatheUser | null> {
  if (!email || !password) return null;

  const { data: userRow } = await supabase
    .from("users")
    .select('id, email, name, avatar_url, "isAdmin", password_hash')
    .eq("email", String(email).toLowerCase())
    .maybeSingle();

  if (
    !userRow ||
    !(await verifyPassword(String(password), userRow.password_hash))
  ) {
    return null;
  }

  return {
    id: userRow.id,
    email: userRow.email ?? undefined,
    isAdmin: !!userRow.isAdmin,
    name: userRow.name ?? undefined,
    avatar_url: userRow.avatar_url ?? undefined,
  };
}

export async function upsertGoogleUser(
  supabase: SupabaseClient,
  input: {
    email: string;
    name: string | null;
    avatarUrl: string | null;
    termsAcceptedAt: string | null;
  },
): Promise<GoogleDbUser> {
  const email = String(input.email).toLowerCase();
  const termsAcceptedAt = input.termsAcceptedAt;
  const { data: existing, error: lookupError } = await supabase
    .from("users")
    .select('id, "isAdmin", name, avatar_url, email_verified')
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    console.error("[auth] Google user lookup failed", lookupError.message);
    throw new Error(GOOGLE_USER_ERROR);
  }

  if (!existing) {
    if (!termsAcceptedAt) {
      console.error("[auth] Google sign-in refused until terms are accepted");
      throw new Error(GOOGLE_USER_ERROR);
    }

    const { data: inserted, error: insertError } = await supabase
      .from("users")
      .insert({
        email,
        name: input.name,
        avatar_url: input.avatarUrl,
        email_verified: true,
        provider: "google",
        terms_accepted_at: termsAcceptedAt,
      })
      .select('id, "isAdmin", name, avatar_url, email_verified')
      .single();

    if (insertError?.code === "23505") {
      const { data: raced, error: raceError } = await supabase
        .from("users")
        .select('id, "isAdmin", name, avatar_url, email_verified')
        .eq("email", email)
        .maybeSingle();
      if (raceError || !raced) {
        console.error("[auth] Google user insert raced but row was not found", raceError?.message);
        throw new Error(GOOGLE_USER_ERROR);
      }
      const { error: verifyError } = await supabase
        .from("users")
        .update(googleAccountLinkUpdate(!!raced.email_verified))
        .eq("id", raced.id);
      if (verifyError) {
        console.error("[auth] Google user verify failed", verifyError.message);
        throw new Error(GOOGLE_USER_ERROR);
      }
      return raced;
    }

    if (insertError || !inserted) {
      console.error("[auth] Google user insert failed", insertError?.message);
      throw new Error(GOOGLE_USER_ERROR);
    }
    return inserted;
  }

  // Leave provider unchanged so password reset still finds this row.
  // An unverified row loses its password: it was set before Google proved the address.
  const { error: verifyError } = await supabase
    .from("users")
    .update(googleAccountLinkUpdate(!!existing.email_verified))
    .eq("id", existing.id);
  if (verifyError) {
    console.error("[auth] Google user verify failed", verifyError.message);
    throw new Error(GOOGLE_USER_ERROR);
  }
  return existing;
}

export function getAuthOptions(termsAcceptedAt: string | null = null): AuthConfig {
  const config = useRuntimeConfig();
  const googleClientId = String(config.googleClientId || "");
  const googleClientSecret = String(config.googleClientSecret || "");

  return {
    basePath: "/api/auth",
    secret: config.authSecret as string,
    trustHost: true,
    session: {
      strategy: "jwt",
    },
    pages: {
      error: "/auth/oauth-error",
      signIn: "/auth/oauth-error",
    },
    providers: [
      CredentialsProvider({
        name: "Credentials",
        credentials: {
          email: { label: "Email", type: "text" },
          password: { label: "Password", type: "password" },
        },
        async authorize(credentials) {
          if (!credentials?.email || !credentials?.password) {
            return null;
          }
          return authorizeCredentials(
            serverSupabaseService(),
            credentials.email,
            credentials.password,
          );
        },
      }),
      ...(googleClientId && googleClientSecret
        ? [
            GoogleProvider({
              clientId: googleClientId,
              clientSecret: googleClientSecret,
            }),
          ]
        : []),
    ],
    callbacks: {
      async signIn({ account, profile }) {
        if (account?.provider !== "google") return true;

        const email = verifiedGoogleEmail(profile);
        if (!email) return googleSignInResult({
          email: null,
          existing: null,
          lookupFailed: false,
          termsAcceptedAt,
        });

        const supabase = serverSupabaseService();
        const { data: existing, error } = await supabase
          .from("users")
          .select("id")
          .eq("email", email)
          .maybeSingle();

        if (error) {
          console.error("[auth] Google user lookup failed", error.message);
        }

        return googleSignInResult({
          email,
          existing,
          lookupFailed: !!error,
          termsAcceptedAt,
        });
      },
      async jwt({ token, user, account }) {
        if (account?.provider === "credentials" && user) {
          const matheUser = user as MatheUser;
          token.id = matheUser.id;
          token.isAdmin = matheUser.isAdmin;
          token.name = matheUser.name ?? null;
          token.avatar_url = matheUser.avatar_url ?? null;
          return token;
        }

        if (account?.provider === "google" && user?.email) {
          const dbUser = await upsertGoogleUser(serverSupabaseService(), {
            email: String(user.email),
            name: (user as { name?: string | null }).name ?? null,
            avatarUrl: (user as { image?: string | null }).image ?? null,
            termsAcceptedAt,
          });

          token.id = dbUser.id;
          token.isAdmin = !!dbUser.isAdmin;
          token.name = dbUser.name ?? null;
          token.avatar_url = dbUser.avatar_url ?? null;
        }

        return token;
      },
      async session({ session, token }) {
        const s: Session = {
          ...session,
          user: session.user ?? {},
        };

        if (s.user) {
          (s.user as MatheUser).id = (token.id as string) ?? "";
          (s.user as MatheUser).isAdmin = Boolean(token.isAdmin);
          (s.user as MatheUser).name = (token.name as string) ?? null;
          (s.user as MatheUser).avatar_url = (token.avatar_url as string) ?? null;
        }

        return s;
      },
    },
  };
}
