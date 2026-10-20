import type { AuthConfig, Session, User } from "@auth/core/types";
import CredentialsProvider from "@auth/core/providers/credentials";
import GoogleProvider from "@auth/core/providers/google";
import { serverSupabaseService } from "./supabaseServer";
import { verifyPassword } from "./password";

type MatheUser = User & {
  id: string;
  isAdmin: boolean;
  name?: string | null;
  avatar_url?: string | null;
};

export function getAuthOptions(): AuthConfig {
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

          const supabase = serverSupabaseService();

          const { data: userRow } = await supabase
            .from("users")
            .select('id, email, name, avatar_url, "isAdmin", password_hash')
            .eq("email", String(credentials.email).toLowerCase())
            .maybeSingle();

          if (
            !userRow ||
            !(await verifyPassword(String(credentials.password), userRow.password_hash))
          ) {
            return null;
          }

          const user: MatheUser = {
            id: userRow.id,
            email: userRow.email ?? undefined,
            isAdmin: !!userRow.isAdmin,
            name: userRow.name ?? undefined,
            avatar_url: userRow.avatar_url ?? undefined,
          };

          return user;
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
      async jwt({ token, user, account }) {
        if (user) {
          if ((user as MatheUser).id) {
            token.id = (user as MatheUser).id;
            token.isAdmin = (user as MatheUser).isAdmin;
            token.name = (user as MatheUser).name ?? null;
            token.avatar_url = (user as MatheUser).avatar_url ?? null;
            return token;
          }

          if (account && account.provider !== "credentials" && user.email) {
            const supabase = serverSupabaseService();
            const email = String(user.email).toLowerCase();

            const { data: existing } = await supabase
              .from("users")
              .select('id, "isAdmin", name, avatar_url')
              .eq("email", email)
              .maybeSingle();

            const dbUser = existing;

            if (!dbUser) {
              console.error("[auth] Google sign-in refused until terms are accepted");
              throw new Error("Unable to create Google user");
            }

            // Leave provider unchanged. A credentials row is the only password-reset account for this email.
            await supabase
              .from("users")
              .update({ email_verified: true })
              .eq("id", dbUser.id);

            if (dbUser) {
              token.id = dbUser.id;
              token.isAdmin = !!dbUser.isAdmin;
              token.name = dbUser.name ?? null;
              token.avatar_url = dbUser.avatar_url ?? null;
            }
          }
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
