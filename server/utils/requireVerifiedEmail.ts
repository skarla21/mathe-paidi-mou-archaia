import type { H3Event } from "h3";
import { requireAuth } from "./requireAuth";
import { serverSupabaseService } from "./supabaseServer";

/** Requires a signed-in user with email_verified. Returns userId. */
export async function requireVerifiedEmail(event: H3Event): Promise<string> {
  const userId = requireAuth(event);
  const supabase = serverSupabaseService();
  const { data, error } = await supabase
    .from("users")
    .select("email_verified")
    .eq("id", userId)
    .maybeSingle();

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
