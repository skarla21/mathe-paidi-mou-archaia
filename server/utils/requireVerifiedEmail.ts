import type { H3Event } from "h3";
import { requireAuth } from "./requireAuth";
import { serverSupabaseService } from "./supabaseServer";

export function verifiedEmailDecision(
  userId: string,
  data: { email_verified?: boolean | null } | null,
  error: { message?: string } | null,
): string {
  if (error) {
    console.error("[requireVerifiedEmail]", error.message);
    throw createError({ statusCode: 500, message: "Database operation failed" });
  }

  if (!data?.email_verified) {
    throw createError({
      statusCode: 403,
      message: "Email μη επαληθευμένο",
    });
  }

  return userId;
}

/** Requires a signed-in user with email_verified. Returns userId. */
export async function requireVerifiedEmail(event: H3Event): Promise<string> {
  const userId = requireAuth(event);
  const supabase = serverSupabaseService();
  const { data, error } = await supabase
    .from("users")
    .select("email_verified")
    .eq("id", userId)
    .maybeSingle();

  return verifiedEmailDecision(userId, data, error);
}
